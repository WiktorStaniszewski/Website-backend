const express = require('express');
const router = express.Router();
const Integrations = require('../services/integrations');

const { Order } = require('../models');

// Webhook z Przelewy24 (Gdy klient opłaci zamówienie)
router.post('/p24/webhook', async (req, res) => {
    try {
        const { orderId, sessionId, sign } = req.body;
        
        // Wywołanie sztucznej usługi
        const result = await Integrations.p24.verifyPayment(sessionId, sign);
        
        if (result.verified && orderId) {
            const order = await Order.findByPk(orderId);
            if (order && order.status === 'pending_payment') {
                let history = [];
                try { history = typeof order.statusHistory === 'string' ? JSON.parse(order.statusHistory) : [...(order.statusHistory || [])]; } catch(e){}
                history.push({ status: 'new', timestamp: new Date() });
                
                await order.update({ status: 'new', statusHistory: history });
                console.log(`[P24 Webhook] Płatność zatwierdzona! Status zamówienia ${orderId} zmieniony na 'new'.`);
            }
        }

        res.status(200).json({ message: 'OK' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

// Endpoint testowy do sprawdzenia działania sztucznych integracji
router.get('/test', async (req, res) => {
    res.json({
        message: "Integrations Mock API is running",
        services: ['przelewy24', 'inpost', 'dotykacka']
    });
});

module.exports = router;
