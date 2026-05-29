const express = require('express');
const router = express.Router();
const { PromoCode, PromoCodeUsage, User } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// GET /api/promo-codes — lista wszystkich kodów (admin)
router.get('/', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const codes = await PromoCode.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: PromoCodeUsage,
        attributes: ['id', 'userId', 'orderId', 'createdAt']
      }]
    });

    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/promo-codes — tworzenie nowego kodu (admin)
router.post('/', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { code, discountPercent, usageType, maxUsesPerUser, expiresAt } = req.body;

    if (!code || !discountPercent) {
      return res.status(400).json({ message: 'Kod i procent zniżki są wymagane.' });
    }

    const existing = await PromoCode.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ message: 'Kod o tej nazwie już istnieje.' });
    }

    const newCode = await PromoCode.create({
      code: code.toUpperCase(),
      discountPercent: parseInt(discountPercent),
      usageType: usageType || 'single',
      maxUsesPerUser: maxUsesPerUser || 1,
      expiresAt: expiresAt || null,
      isActive: true,
      createdBy: req.user.id
    });

    res.status(201).json(newCode);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/promo-codes/:id — edycja kodu (admin)
router.put('/:id', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id);
    if (!promoCode) return res.status(404).json({ message: 'Nie znaleziono kodu.' });

    const { code, discountPercent, usageType, maxUsesPerUser, expiresAt, isActive } = req.body;

    if (code !== undefined) promoCode.code = code.toUpperCase();
    if (discountPercent !== undefined) promoCode.discountPercent = parseInt(discountPercent);
    if (usageType !== undefined) promoCode.usageType = usageType;
    if (maxUsesPerUser !== undefined) promoCode.maxUsesPerUser = maxUsesPerUser;
    if (expiresAt !== undefined) promoCode.expiresAt = expiresAt;
    if (isActive !== undefined) promoCode.isActive = isActive;

    await promoCode.save();
    res.json(promoCode);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/promo-codes/:id — usunięcie kodu (admin)
router.delete('/:id', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const promoCode = await PromoCode.findByPk(req.params.id);
    if (!promoCode) return res.status(404).json({ message: 'Nie znaleziono kodu.' });

    await promoCode.destroy();
    res.json({ message: 'Kod promocyjny został usunięty.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/promo-codes/validate — walidacja kodu przez klienta
router.post('/validate', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: 'Podaj kod promocyjny.' });

    const promoCode = await PromoCode.findOne({
      where: { code: code.toUpperCase(), isActive: true }
    });

    if (!promoCode) {
      return res.json({ valid: false, message: 'Kod nie istnieje lub jest nieaktywny.' });
    }

    // Sprawdzenie daty ważności
    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return res.json({ valid: false, message: 'Kod promocyjny wygasł.' });
    }

    // Sprawdzenie limitu użyć per user
    const usageCount = await PromoCodeUsage.count({
      where: { promoCodeId: promoCode.id, userId: req.user.id }
    });

    if (usageCount >= promoCode.maxUsesPerUser) {
      return res.json({ 
        valid: false, 
        message: `Wykorzystałeś już limit użyć tego kodu (${promoCode.maxUsesPerUser}x).` 
      });
    }

    res.json({
      valid: true,
      discountPercent: promoCode.discountPercent,
      promoCodeId: promoCode.id,
      remainingUses: promoCode.maxUsesPerUser - usageCount,
      message: `Kod aktywny! Zniżka ${promoCode.discountPercent}% zostanie zastosowana.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
