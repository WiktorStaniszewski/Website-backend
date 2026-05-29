const express = require('express');
const router = express.Router();
const { LoyaltyPoints, User, Order } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');

// Progi nagród lojalnościowych
const LOYALTY_REWARDS = [
  { threshold: 200, discount: 10 },
];

// GET /api/loyalty/balance — saldo punktów i dostępne nagrody
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'loyaltyPoints']
    });

    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    const availableRewards = LOYALTY_REWARDS.filter(r => user.loyaltyPoints >= r.threshold);

    res.json({
      points: user.loyaltyPoints,
      allRewards: LOYALTY_REWARDS,
      availableRewards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/loyalty/history — historia transakcji punktowych
router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await LoyaltyPoints.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
      include: [{
        model: Order,
        attributes: ['id', 'trackingNumber', 'total']
      }]
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/loyalty/redeem — wymiana punktów na zniżkę
router.post('/redeem', verifyToken, async (req, res) => {
  try {
    const { threshold } = req.body;

    const reward = LOYALTY_REWARDS.find(r => r.threshold === threshold);
    if (!reward) {
      return res.status(400).json({ message: 'Nieprawidłowy próg nagrody.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    if (user.loyaltyPoints < reward.threshold) {
      return res.status(400).json({ 
        message: `Niewystarczająca liczba punktów. Wymagane: ${reward.threshold}, posiadane: ${user.loyaltyPoints}` 
      });
    }

    res.json({
      success: true,
      discount: reward.discount,
      pointsCost: reward.threshold,
      message: `Zniżka ${reward.discount}% została zarezerwowana. Zostanie zastosowana przy składaniu zamówienia.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
