const express = require('express');
const router = express.Router();
const { User, Order, Address, Location } = require('../models');
const { isSuperAdmin, verifyToken } = require('../middleware/authMiddleware');

router.get('/profile/addresses', verifyToken, async (req, res) => {
  try {
    const addresses = await Address.findAll({ where: { userId: req.user.id } });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/profile/addresses', verifyToken, async (req, res) => {
  try {
    const { firstName, label, street, city, zip, phone } = req.body;
    
    if (firstName) {
        await User.update({ firstName }, { where: { id: req.user.id } });
    }

    const newAddress = await Address.create({ 
        userId: req.user.id, 
        name: firstName,
        label, street, city, zip, phone 
    });
    
    res.status(201).json(newAddress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile/addresses/:id', verifyToken, async (req, res) => {
  try {
    const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!address) return res.status(404).json({ message: "Nie znaleziono adresu" });
    const { firstName, label, street, city, zip, phone } = req.body;
    const updateData = { label, street, city, zip, phone };
    if (firstName !== undefined) updateData.name = firstName;
    
    await address.update(updateData);
    res.json(address);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/profile/addresses/:id', verifyToken, async (req, res) => {
  try {
    const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!address) return res.status(404).json({ message: "Nie znaleziono adresu" });
    
    await address.destroy();
    res.json({ message: "Adres usunięty" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile/password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Podano niepoprawne obecne hasło" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: "Hasło zmienione pomyślnie" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { email, firstName, phone } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) return res.status(400).json({ message: "Ten email jest już zajęty" });
            user.email = email;
        }

        if (firstName !== undefined) user.firstName = firstName;
        if (phone !== undefined) user.phone = phone;

        await user.save();
        res.json({ message: "Profil zaktualizowany pomyślnie", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ 
      attributes: { exclude: ['password'] },
      include: [{ model: Location, attributes: ['id', 'name', 'type'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/role', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();
    res.json({ message: "Role updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/location', verifyToken, isSuperAdmin, async (req, res) => {
    try {
      const { locationId } = req.body;
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      user.locationId = locationId || null;
      await user.save();
      res.json({ message: "Location updated successfully", user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

router.get('/:id', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Location, attributes: ['id', 'name', 'type'] }]
    });
    
    if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

    const orders = await Order.findAll({ 
        where: { userId: req.params.id.toString() },
        order: [['createdAt', 'DESC']]
    });

    res.json({ user, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;