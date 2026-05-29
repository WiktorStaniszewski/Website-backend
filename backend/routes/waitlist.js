const express = require('express');
const router = express.Router();
const { Waitlist, Product } = require('../models');

// POST /api/waitlist - Zapis klienta na listę oczekujących
router.post('/', async (req, res) => {
    const { productId, email } = req.body;

    if (!productId || !email) {
        return res.status(400).json({ message: "Brak wymaganych danych (productId, email)" });
    }

    try {
        const product = await Product.findByPk(productId);
        if (!product) return res.status(404).json({ message: "Produkt nie istnieje" });

        const [entry, created] = await Waitlist.findOrCreate({
            where: { productId: product.id, email: email },
            defaults: { isNotified: false }
        });

        res.status(201).json({ message: "Zapisano na listę oczekujących", entry });
    } catch (err) {
        console.error("Błąd zapisu na Waitlist:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;