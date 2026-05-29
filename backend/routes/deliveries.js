const express = require('express');
const router = express.Router();
const { Delivery, DeliveryAction, Inventory, Product, Location, Waitlist, User, sequelize } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');

router.get('/', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        const deliveries = await Delivery.findAll({
            include: [
                { model: DeliveryAction },
                { model: Location, attributes: ['id', 'name', 'type'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(deliveries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', verifyToken, isSuperAdmin, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, notes, locationId, actions } = req.body;

        if (!locationId) throw new Error("Nie wybrano docelowego magazynu!");

        const delivery = await Delivery.create({
            name, notes, locationId: locationId 
        }, { transaction: t });

        const restockedProductIds = []; // Zbieramy zaktualizowane produkty dla Waitlisty

        for (const action of actions) {
            if (action.type === 'CREATE_PRODUCT') {
                const newProd = await Product.create(action.productData, { transaction: t });
                const initialStock = parseInt(action.productData.stockQuantity) || 0;
                
                await Inventory.create({
                    productId: newProd.id, locationId: locationId, stockQuantity: initialStock
                }, { transaction: t });

                await DeliveryAction.create({
                    deliveryId: delivery.id, actionType: 'CREATE_PRODUCT',
                    details: { name: newProd.name, initialStock }
                }, { transaction: t });
            }

            if (action.type === 'EDIT_PRODUCT') {
                const product = await Product.findByPk(action.productId, { transaction: t });
                if (product) {
                    const oldData = { ...product.toJSON() };
                    await product.update(action.updatedData, { transaction: t });

                    const changes = [];
                    const fieldsToTrack = [
                        { key: 'name', label: 'Nazwa' }, { key: 'company', label: 'Producent' },
                        { key: 'category', label: 'Kategoria' }, { key: 'price', label: 'Cena', suffix: ' PLN' },
                        { key: 'flavours', label: 'Smak' }, { key: 'size', label: 'Rozmiar/Waga' },
                        { key: 'purpose', label: 'Przeznaczenie' }, { key: 'processingMethod', label: 'Obróbka' },
                        { key: 'variety', label: 'Odmiana' }, { key: 'farm', label: 'Farma' },
                        { key: 'roastDate', label: 'Data wypalenia' }, { key: 'teaType', label: 'Rodzaj herbaty' }
                    ];

                    fieldsToTrack.forEach(field => {
                        const oldVal = String(oldData[field.key] || '');
                        const newVal = String(product[field.key] || '');
                        if (oldVal !== newVal) {
                            changes.push(`${field.label}: ${oldVal || 'brak'} ➔ ${newVal || 'brak'}${field.suffix || ''}`);
                        }
                    });

                    await DeliveryAction.create({
                        deliveryId: delivery.id, actionType: 'EDIT_PRODUCT',
                        details: { name: product.name, changes }
                    }, { transaction: t });
                }
            }

            if (action.type === 'ADD_STOCK') {
                const product = await Product.findByPk(action.productId, { transaction: t });
                if (!product) continue;

                let inv = await Inventory.findOne({
                    where: { productId: action.productId, locationId: locationId },
                    transaction: t
                });

                let stockBefore = inv ? inv.stockQuantity : 0;
                let stockAfter = stockBefore + parseInt(action.quantity);

                if (inv) {
                    inv.stockQuantity = stockAfter;
                    await inv.save({ transaction: t });
                } else {
                    await Inventory.create({
                        productId: action.productId, locationId: locationId, stockQuantity: stockAfter
                    }, { transaction: t });
                }

                await DeliveryAction.create({
                    deliveryId: delivery.id, actionType: 'ADD_STOCK',
                    details: { name: product.name, stockBefore, stockAfter, added: action.quantity }
                }, { transaction: t });
                
                restockedProductIds.push(action.productId); // Oznaczamy produkt do powiadomień z Waitlisty
            }
        }

        await t.commit();

        // [EMAIL TRIGGER]: Weryfikacja Waitlisty po udanej transakcji dostawy
        for (let productId of restockedProductIds) {
            const product = await Product.findByPk(productId);
            if (!product) continue;

            const waitingUsers = await Waitlist.findAll({
                where: { productId }
            });

            if (waitingUsers.length > 0) {
                waitingUsers.forEach(waiter => {
                    if (waiter.email) {
                        emailService.sendBackInStock(waiter.email, product.name).catch(console.error);
                    }
                });
                // Czyścimy bazę dla tego produktu, skoro powiadomienia wysłane
                await Waitlist.destroy({ where: { productId } }); 
            }
        }

        res.status(201).json(delivery);
    } catch (err) {
        if (!t.finished) {
            await t.rollback();
        }
        console.error("Delivery error:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;