const express = require('express');
const router = express.Router();
const { Product, CartReservation, Inventory, sequelize } = require('../models');
const { Op } = require('sequelize');

// POST /api/reservations/reserve-checkout - Miękka rezerwacja koszyka
router.post('/reserve-checkout', async (req, res) => {
    const { sessionId, items } = req.body;
    if (!sessionId || !items || items.length === 0) return res.status(400).json({ message: "Brak danych sesji." });

    const t = await sequelize.transaction();
    try {
        // 1. Usuwamy stare, porzucone rezerwacje dla tej sesji (bez zwracania na magazyn, bo nic stamtąd nie zdjęliśmy fizycznie)
        await CartReservation.destroy({ where: { sessionId }, transaction: t });

        const missingItems = [];
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minut

        // 2. Weryfikujemy stany i zapisujemy miękką rezerwację
        for (let item of items) {
            // Pobieramy fizyczny stan
            const inventories = await Inventory.findAll({
                where: { productId: item.id || item.productId, stockQuantity: { [Op.gt]: 0 } },
                transaction: t
            });

            let totalPhysical = inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0);

            // Pobieramy inne aktywne rezerwacje (z innych sesji)
            const otherReservations = await CartReservation.findAll({
                where: {
                    productId: item.id || item.productId,
                    sessionId: { [Op.ne]: sessionId },
                    expiresAt: { [Op.gt]: new Date() }
                },
                transaction: t
            });

            let totalReservedByOthers = otherReservations.reduce((sum, resv) => sum + resv.quantity, 0);
            let availableForMe = totalPhysical - totalReservedByOthers;

            if (availableForMe < item.quantity) {
                const productData = await Product.findByPk(item.id || item.productId, { transaction: t });
                missingItems.push({
                    id: item.id || item.productId,
                    name: productData ? productData.name : 'Produkt',
                    requested: item.quantity,
                    available: Math.max(0, availableForMe)
                });
                continue; 
            }

            // Zapisujemy miękką rezerwację (wybieramy locationId = 1 jako domyślny punkt blokady dla koszyka)
            await CartReservation.create({
                sessionId: sessionId,
                productId: item.id || item.productId,
                locationId: 1, 
                quantity: item.quantity,
                expiresAt: expiresAt
            }, { transaction: t });
        }

        if (missingItems.length > 0) {
            await t.rollback();
            return res.status(400).json({ message: "Brak wystarczającej ilości towaru po uwzględnieniu innych koszyków.", missingItems });
        }

        await t.commit();
        res.status(200).json({ message: "Miękka rezerwacja udana", expiresAt });

    } catch (err) {
        await t.rollback();
        console.error("Błąd rezerwacji kasy:", err);
        res.status(500).json({ message: "Błąd serwera podczas rezerwacji." });
    }
});

// POST /api/reservations/release-checkout
router.post('/release-checkout', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "Brak sesji" });

    try {
        // Po prostu usuwamy wpisy blokujące
        await CartReservation.destroy({ where: { sessionId } });
        res.status(200).json({ message: "Rezerwacje zwolnione." });
    } catch (err) {
        res.status(500).json({ message: "Błąd serwera." });
    }
});

module.exports = router;