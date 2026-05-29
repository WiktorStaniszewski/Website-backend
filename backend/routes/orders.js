const express = require('express');
const router = express.Router();
const { Order, User, Location, Inventory, CartReservation, LoyaltyPoints, PromoCode, PromoCodeUsage, sequelize } = require('../models');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');
const Integrations = require('../services/integrations');

const LOYALTY_REWARDS = [
  { threshold: 200, discount: 10 },
];

// Tworzenie zamówienia i dedukcja stanu magazynowego
router.post('/', verifyToken, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { items, locationId, sessionId, baristaNotes, promoCode, loyaltyRedeem } = req.body; 

    const initialStatus = ['p24', 'blik'].includes(req.body.paymentMethod) ? 'pending_payment' : 'new';

    const { id, userId, status, integrations, statusHistory, feedback, createdAt, updatedAt, discount: _disc, ...safeBody } = req.body;
    let appliedDiscount = null;
    let finalTotal = Number(safeBody.total); 

    let itemsTotal = 0;
    if (items && items.length > 0) {
      itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // A) Kod promocyjny
    if (promoCode) {
      const promo = await PromoCode.findOne({ 
        where: { code: promoCode.toUpperCase(), isActive: true },
        transaction: t 
      });

      if (!promo) throw new Error('Kod promocyjny nie istnieje lub jest nieaktywny.');
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) throw new Error('Kod promocyjny wygasł.');

      const usageCount = await PromoCodeUsage.count({
        where: { promoCodeId: promo.id, userId: req.user.id },
        transaction: t
      });

      if (usageCount >= promo.maxUsesPerUser) {
        throw new Error(`Wykorzystałeś już limit użyć tego kodu (${promo.maxUsesPerUser}x).`);
      }

      const savedAmount = itemsTotal * (promo.discountPercent / 100);
      
      appliedDiscount = {
        type: 'promo',
        code: promo.code,
        percent: promo.discountPercent,
        savedAmount: parseFloat(savedAmount.toFixed(2)),
        promoCodeId: promo.id
      };
    }

    // B) Zniżka lojalnościowa (nie kumuluje się z promo)
    if (loyaltyRedeem && !promoCode) {
      const reward = LOYALTY_REWARDS.find(r => r.threshold === loyaltyRedeem.threshold);
      if (!reward) throw new Error('Nieprawidłowy próg nagrody lojalnościowej.');

      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (user.loyaltyPoints < reward.threshold) {
        throw new Error(`Niewystarczająca liczba punktów. Wymagane: ${reward.threshold}, posiadane: ${user.loyaltyPoints}`);
      }

      const savedAmount = itemsTotal * (reward.discount / 100);

      // Odjęcie punktów
      user.loyaltyPoints -= reward.threshold;
      await user.save({ transaction: t });

      await LoyaltyPoints.create({
        userId: req.user.id,
        points: -reward.threshold,
        type: 'redeemed',
        description: `Wymiana ${reward.threshold} pkt na zniżkę ${reward.discount}%`
      }, { transaction: t });

      appliedDiscount = {
        type: 'loyalty',
        percent: reward.discount,
        pointsSpent: reward.threshold,
        savedAmount: parseFloat(savedAmount.toFixed(2))
      };
    }

    const orderData = { 
      ...safeBody, 
      userId: req.user.id, 
      status: initialStatus,
      total: finalTotal,
      baristaNotes: baristaNotes || null,
      discount: appliedDiscount
    };

    // 1. Zapisz zamówienie w bazie
    const newOrder = await Order.create(orderData, { transaction: t });

    // 2. Rejestracja użycia kodu promo
    if (appliedDiscount && appliedDiscount.type === 'promo') {
      await PromoCodeUsage.create({
        promoCodeId: appliedDiscount.promoCodeId,
        userId: req.user.id,
        orderId: newOrder.id
      }, { transaction: t });
    }

    // 3. Odejmij stany magazynowe dla każdego produktu w koszyku
    if (items && items.length > 0) {
        for (let item of items) {
            let qtyToDeduct = item.quantity;
            const productId = item.id || item.productId;

            // Pobierz wszystkie stany tego produktu na wszystkich lokacjach
            const inventories = await Inventory.findAll({
                where: { productId: productId },
                transaction: t
            });

            // Inteligentne sortowanie: najpierw zdejmujemy z wybranego punktu odbioru, potem z magazynu głównego (ID: 1), a potem reszta
            inventories.sort((a, b) => {
                if (locationId && a.locationId === parseInt(locationId)) return -1;
                if (locationId && b.locationId === parseInt(locationId)) return 1;
                if (a.locationId === 1) return -1;
                if (b.locationId === 1) return 1;
                return 0;
            });

            // Pętla zdejmująca towar z lokacji, dopóki nie uzbieramy całej ilości z koszyka
            for (let inv of inventories) {
                if (qtyToDeduct <= 0) break; 
                
                if (inv.stockQuantity > 0) {
                    const deductAmount = Math.min(inv.stockQuantity, qtyToDeduct);
                    inv.stockQuantity -= deductAmount;
                    await inv.save({ transaction: t });
                    qtyToDeduct -= deductAmount;
                }
            }

            // Zabezpieczenie przed sprzedażą na minusie (gdyby ktoś ominął walidację koszyka)
            if (qtyToDeduct > 0) {
                throw new Error(`Brak wystarczającej ilości produktu (ID: ${productId}) na magazynach.`);
            }
        }
    }

    // 4. Zamówienie złożone, więc zdejmujemy sztuczną (miękką) blokadę koszyka z sesji
    if (sessionId) {
        await CartReservation.destroy({ where: { sessionId }, transaction: t });
    }

    // 5. Naliczenie punktów lojalnościowych (1 zł = 1 punkt, zaokrąglone w dół)
    const loyaltyPointsEarned = Math.floor(finalTotal);
    if (loyaltyPointsEarned > 0) {
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      user.loyaltyPoints = (user.loyaltyPoints || 0) + loyaltyPointsEarned;
      await user.save({ transaction: t });

      await LoyaltyPoints.create({
        userId: req.user.id,
        orderId: newOrder.id,
        points: loyaltyPointsEarned,
        type: 'earned',
        description: `Naliczono za zamówienie ${newOrder.trackingNumber}`
      }, { transaction: t });
    }

    await t.commit();

    // 6. [INTEGRACJA: INPOST] Rejestracja wysyłki
    let shippingDetails = null;
    if (newOrder.shipping?.method === 'paczkomat' || newOrder.shipping?.method === 'kurier') {
        const targetPoint = newOrder.shipping?.pointId || null;
        const shipmentResponse = await Integrations.inpost.createShipment(newOrder, targetPoint);
        if (shipmentResponse.success) {
            shippingDetails = {
                trackingNumber: shipmentResponse.trackingNumber,
                labelUrl: shipmentResponse.labelUrl
            };
        }
    }

    // 7. [INTEGRACJA: PRZELEWY24] Generowanie płatności
    let paymentDetails = null;
    if (newOrder.paymentMethod === 'p24' || newOrder.paymentMethod === 'blik') {
        paymentDetails = await Integrations.p24.createPayment(newOrder, newOrder.paymentMethod);
    }

    // 8. [INTEGRACJA: DOTYKACKA] Real-time inventory sync (nie psuje lokalnej logiki)
    if (items && items.length > 0) {
        await Integrations.dotykacka.syncStock(items, locationId);
    }

    const integrationsObj = {
        shipping: shippingDetails,
        payment: paymentDetails
    };

    newOrder.integrations = integrationsObj;
    await newOrder.save();

    // 9. [EMAIL TRIGGER]: Wysłanie potwierdzenia w tle
    const emailUser = await User.findByPk(req.user.id);
    if (emailUser && emailUser.email) {
        emailService.sendOrderConfirmation(emailUser.email, newOrder).catch(console.error);
    }

    res.status(201).json({
        ...newOrder.toJSON(),
        integrations: integrationsObj,
        loyaltyPointsEarned
    });
  } catch (err) {
    if (!t.finished) {
        await t.rollback();
    }
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const whereClause = {};
    const currentUser = await User.findByPk(req.user.id);
    
    if (currentUser.role === 'admin') {
      whereClause.locationId = currentUser.locationId;
    }

    const orders = await Order.findAll({ 
      where: whereClause,
      include: [{ model: Location, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']] 
    });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: Location, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-orders/:id', verifyToken, async (req, res) => {
  try {
    let order;
    if (!isNaN(req.params.id)) {
        order = await Order.findOne({
            where: { id: req.params.id, userId: req.user.id },
            include: [{ model: Location, attributes: ['id', 'name'] }]
        });
    }
    if (!order) {
        order = await Order.findOne({
            where: { trackingNumber: req.params.id, userId: req.user.id },
            include: [{ model: Location, attributes: ['id', 'name'] }]
        });
    }
    
    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const order = await Order.findOne({
        where: { trackingNumber: req.params.trackingNumber.trim() },
        include: [{ model: Location, attributes: ['id', 'name'] }]
    });

    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia o podanym numerze' });

    const orderData = order.toJSON();
    const isPickup = orderData.shipping?.method === 'pickup' || orderData.locationId !== null;
    orderData.isPickup = isPickup;

    if (!orderData.estimatedDelivery) {
        const deliveryDate = new Date(order.createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + (isPickup ? 1 : 3)); 
        orderData.estimatedDelivery = deliveryDate.toLocaleDateString('pl-PL');
    }

    let parsedHistory = [];
    if (typeof orderData.statusHistory === 'string') {
        try { parsedHistory = JSON.parse(orderData.statusHistory); } catch(e) {}
    } else if (Array.isArray(orderData.statusHistory)) {
        parsedHistory = orderData.statusHistory;
    }

    if (parsedHistory.length === 0) {
        const created = new Date(order.createdAt);
        const updated = new Date(order.updatedAt);
        parsedHistory.push({ status: 'new', timestamp: created });
        
        if (order.status !== 'new') {
             const midTime = new Date((created.getTime() + updated.getTime()) / 2);
             if (['processing', 'shipped', 'completed'].includes(order.status)) {
                 parsedHistory.push({ status: 'processing', timestamp: order.status === 'processing' ? updated : midTime });
             }
             if (['shipped', 'completed'].includes(order.status)) {
                 parsedHistory.push({ status: 'shipped', timestamp: order.status === 'shipped' ? updated : new Date(updated.getTime() - 3600000) });
             }
             if (order.status === 'completed') {
                 parsedHistory.push({ status: 'completed', timestamp: updated });
             }
        }
    }
    
    orderData.statusHistory = parsedHistory;

    res.json(orderData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    let order;
    if (!isNaN(req.params.id)) {
        order = await Order.findByPk(req.params.id, {
            include: [{ model: Location, attributes: ['id', 'name'] }]
        });
    }
    if (!order) {
        order = await Order.findOne({
            where: { trackingNumber: req.params.id },
            include: [{ model: Location, attributes: ['id', 'name'] }]
        });
    }
    
    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia' });

    const currentUser = await User.findByPk(req.user.id);

    if (currentUser.role === 'user' && order.userId !== currentUser.id) {
      return res.status(403).json({ message: 'Brak dostępu do cudzego zamówienia.' });
    }

    if (currentUser.role === 'admin' && order.locationId !== currentUser.locationId) {
      return res.status(403).json({ message: 'Brak dostępu do zamówień z innej lokacji.' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia' });

    const newStatus = req.body.status;

    if (order.status !== newStatus) {
        let history = [];
        if (typeof order.statusHistory === 'string') {
            try { history = JSON.parse(order.statusHistory); } catch (e) {}
        } else if (Array.isArray(order.statusHistory)) {
            history = [...order.statusHistory];
        }
        
        if (history.length === 0) {
            history.push({ status: 'new', timestamp: order.createdAt });
        }

        history.push({ status: newStatus, timestamp: new Date() });

        order.set('status', newStatus);
        order.set('statusHistory', history);
        order.changed('statusHistory', true); 

        await order.save();

        // [EMAIL TRIGGER]: Wysłanie aktualizacji statusu
        const user = await User.findByPk(order.userId);
        if (user && user.email) {
            emailService.sendStatusUpdate(user.email, order.id, newStatus).catch(console.error);
        }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia' });
    
    if (order.status !== 'pending_payment') {
        return res.status(400).json({ message: 'Nie można anulować zamówienia, które zostało już opłacone lub przetworzone.' });
    }

    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    history.push({ status: 'cancelled', timestamp: new Date() });

    order.set('status', 'cancelled');
    order.set('statusHistory', history);
    order.changed('statusHistory', true);

    await order.save();

    res.json({ message: 'Zamówienie zostało anulowane.', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!order) return res.status(404).json({ message: 'Nie znaleziono zamówienia' });
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Można dodać feedback tylko do dostarczonych zamówień.' });
    }

    // Sprawdzenie czasu (max 3 dni od statusu 'completed')
    const completedHistory = (order.statusHistory || []).find(h => h.status === 'completed');
    if (completedHistory) {
      const completedDate = new Date(completedHistory.timestamp);
      const diffDays = (new Date() - completedDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 3) {
        return res.status(400).json({ message: 'Czas na wystawienie opinii wygasł (3 dni od dostawy).' });
      }
    }

    const { comment, everythingOk } = req.body;
    order.feedback = {
      comment,
      everythingOk,
      submittedAt: new Date().toISOString()
    };

    await order.save();
    res.json({ message: 'Dziękujemy za opinię!', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
