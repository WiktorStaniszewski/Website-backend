const express = require('express');
const router = express.Router();
const { MenuCategory, MenuItem, sequelize } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

// GET /api/menus - Pobierz całe menu publicznie
router.get('/', async (req, res) => {
    try {
        const menus = await MenuCategory.findAll({
            include: [{ model: MenuItem, as: 'items', order: [['orderIndex', 'ASC'], ['id', 'ASC']] }],
            order: [['orderIndex', 'ASC'], ['id', 'ASC']]
        });
        
        // Formatowanie pod aktualny interfejs Frontendu
        const formattedMenus = menus.map(cat => ({
            id: cat.id,
            title: cat.title,
            key: cat.key,
            data: cat.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                ingredients: item.ingredients
            }))
        }));

        res.json(formattedMenus);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/menus/sync - Zapis/Aktualizacja CAŁEGO menu na raz (Dla trybu edycji)
router.post('/sync', verifyToken, isSuperAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { menus } = req.body;
        await MenuCategory.destroy({ where: {}, transaction: t });

        for (let i = 0; i < menus.length; i++) {
            const categoryData = menus[i];
            const newCategory = await MenuCategory.create({
                title: categoryData.title,
                key: categoryData.key || `menu-${Date.now()}-${i}`,
                orderIndex: i
            }, { transaction: t });

            if (categoryData.data && categoryData.data.length > 0) {
                const itemsToCreate = categoryData.data.map((item, index) => ({
                    name: item.name,
                    price: String(item.price),
                    ingredients: item.ingredients,
                    categoryId: newCategory.id,
                    orderIndex: index
                }));
                await MenuItem.bulkCreate(itemsToCreate, { transaction: t });
            }
        }

        await t.commit();
        res.json({ message: "Menu zaktualizowane pomyślnie" });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ message: "Błąd aktualizacji menu", error: err.message });
    }
});

module.exports = router;