const express = require('express');
const router = express.Router();
const { User, Inventory, Location, CartReservation } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.cart || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', verifyToken, async (req, res) => {
  try {
    const { cart } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.cart = cart;
    await user.save();
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ message: "Error updating cart", error: err.message });
  }
});

router.post('/validate-pickup', async (req, res) => {
    try {
        const { cartItems, sessionId } = req.body; 
        if (!cartItems || cartItems.length === 0) return res.json([]);

        const productIds = cartItems.map(item => item.productId || item.id);
        
        // 1. Pobierz fizyczne stany magazynowe
        const inventories = await Inventory.findAll({
            where: { productId: productIds }
        });

        // 2. Pobierz rezerwacje INNYCH użytkowników
        const activeReservations = await CartReservation.findAll({
            where: {
                productId: productIds,
                expiresAt: { [Op.gt]: new Date() },
                sessionId: { [Op.ne]: sessionId }
            }
        });

        const cafes = await Location.findAll({ where: { type: 'cafe' }, order: [['id', 'ASC']] });
        
        const locationsAvailability = cafes.map(cafe => {
            let missingItemsCount = 0;
            const totalItemsCount = cartItems.length;
            
            cartItems.forEach(item => {
                const id = item.productId || item.id;
                
                // Ile kawiarnia ma na półce fizycznie
                const localStock = inventories.find(inv => inv.productId === id && inv.locationId === cafe.id)?.stockQuantity || 0;
                
                // Ile tego produktu inni ludzie właśnie trzymają w koszykach
                const reservedStock = activeReservations.filter(r => r.productId === id).reduce((sum, r) => sum + r.quantity, 0);
                
                // Realnie dostępne
                const actualAvailableStock = localStock - reservedStock;

                if (actualAvailableStock < item.quantity) {
                    missingItemsCount++;
                }
            });

            const readiness = totalItemsCount > 0 ? ((totalItemsCount - missingItemsCount) / totalItemsCount) * 100 : 100;

            return {
                locationId: cafe.id,
                name: cafe.name,
                readiness: readiness,
                status: readiness === 100 ? 'instant' : 'delayed'
            };
        });

        res.json(locationsAvailability);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;