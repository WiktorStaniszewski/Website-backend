require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const cron = require('node-cron');
const { sequelize, Product, CartReservation, Order } = require('./models');
const { Op } = require('sequelize');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use('/api/cart', require('./routes/cart'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/waitlist', require('./routes/waitlist'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/integrations', require('./routes/integrations'));

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { message: "Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut." }
});
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/deliveries', require('./routes/deliveries'));

app.use('/api/menus', require('./routes/menus'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/promo-codes', require('./routes/promo-codes'));
app.use('/api/reports', require('./routes/reports'));

cron.schedule('* * * * *', async () => {
    console.log(`[CRON ${new Date().toLocaleTimeString()}] Skanowanie porzuconych koszyków...`);
    
    try {
        const expiredReservations = await CartReservation.findAll({
            where: { expiresAt: { [Op.lt]: new Date() } }
        });

        if (expiredReservations.length > 0) {
            console.log(`[CRON] Znaleziono ${expiredReservations.length} przeterminowanych rezerwacji. Zwalnianie...`);
            const t = await sequelize.transaction();
            try {
                for (let resv of expiredReservations) {
                    const product = await Product.findByPk(resv.productId, { transaction: t, lock: t.LOCK.UPDATE });
                    if (product) {
                        product.stockQuantity += resv.quantity;
                        await product.save({ transaction: t });
                    }
                    await resv.destroy({ transaction: t });
                }
                await t.commit();
                console.log(`[CRON SUKCES] Wszystkie zablokowane produkty wróciły na magazyn!`);
            } catch (err) {
                await t.rollback();
                console.error('[CRON BŁĄD TRANSAKCJI]:', err);
            }
        }
    } catch (err) {
        console.error('[CRON BŁĄD ZAPYTANIA DO BAZY]:', err);
    }
});

// CRON DLA ZAMÓWIEŃ OCZEKUJĄCYCH NA PŁATNOŚĆ (co godzinę)
cron.schedule('0 * * * *', async () => {
    console.log(`[CRON ${new Date().toLocaleTimeString()}] Skanowanie nieopłaconych zamówień...`);
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const expiredOrders = await Order.findAll({
            where: {
                status: 'pending_payment',
                createdAt: { [Op.lt]: twentyFourHoursAgo }
            }
        });

        if (expiredOrders.length > 0) {
            console.log(`[CRON] Znaleziono ${expiredOrders.length} nieopłaconych zamówień (powyżej 24h). Anulowanie...`);
            for (let order of expiredOrders) {
                order.status = 'cancelled';
                await order.save();
                // TODO: W przyszłości można by tu również zwalniać stany magazynowe jeśli byłyby rezerwowane przy zamówieniu
            }
        }
    } catch (err) {
        console.error('[CRON BŁĄD SKANOWANIA ZAMÓWIEŃ]:', err);
    }
});


const PORT = process.env.PORT || 5000;

const startServer = async () => {
    let retries = 5;
    while (retries) {
        try {
            await sequelize.sync({ alter: true });
            console.log('PostgreSQL Database Connected & Synced (Alter Mode)');
            
            app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
            return; 
        } catch (err) {
            console.error(`Database connection failed. Retries left: ${retries}`);
            console.error(err.message);
            retries -= 1;
            console.log('Waiting 5 seconds before retrying...');
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    console.error('Could not connect to database after multiple attempts. Exiting.');
    process.exit(1);
};

startServer();