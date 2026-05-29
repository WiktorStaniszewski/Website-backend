const express = require('express');
const router = express.Router();
const { Location, Inventory, Product } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

// GET /api/locations - Używane do wylistowania magazynów
router.get('/', async (req, res) => {
    try {
        const locations = await Location.findAll({
            include: [{
                model: Inventory,
                include: [Product]
            }],
            order: [['id', 'ASC']]
        });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ message: "Błąd pobierania lokacji", error: err.message });
    }
});

// POST /api/locations - Tworzenie nowej placówki (wymaga Super Admina)
router.post('/', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        const { name, type } = req.body;
        
        if (!name || !type) {
            return res.status(400).json({ message: "Nazwa i typ lokacji są wymagane." });
        }

        const newLocation = await Location.create({ name, type });
        
        res.status(201).json(newLocation);
    } catch (err) {
        res.status(500).json({ message: "Błąd tworzenia lokacji", error: err.message });
    }
});

module.exports = router;