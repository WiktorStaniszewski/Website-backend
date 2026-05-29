const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const SENDER_EMAIL = process.env.SENDER_EMAIL || '"Somnium Cafe" <no-reply@twojadomena.pl>';

const emailService = {
    // 1. Potwierdzenie zamówienia
    async sendOrderConfirmation(userEmail, orderDetails) {
        const html = `
            <h2>Dziękujemy za zamówienie!</h2>
            <p>Twoje zamówienie nr #${orderDetails.id} zostało przyjęte do realizacji.</p>
            <p>Wartość: ${orderDetails.total} PLN</p>
            <p>Zaczynamy przygotowywać Twoje pyszności!</p>
        `;
        return transporter.sendMail({ from: SENDER_EMAIL, to: userEmail, subject: 'Potwierdzenie zamówienia', html });
    },

    // 2. Zmiana statusu
    async sendStatusUpdate(userEmail, orderId, newStatus) {
        const statusMap = {
            'processing': 'jest właśnie przygotowywane',
            'ready': 'jest gotowe do odbioru!',
            'shipped': 'zostało wysłane kurierem'
        };
        const html = `
            <h2>Aktualizacja zamówienia #${orderId}</h2>
            <p>Status Twojego zamówienia uległ zmianie. Obecnie: <strong>${statusMap[newStatus] || newStatus}</strong>.</p>
        `;
        return transporter.sendMail({ from: SENDER_EMAIL, to: userEmail, subject: `Status zamówienia #${orderId}`, html });
    },

    // 3. Powiadomienie o dostępności (Waitlist)
    async sendBackInStock(userEmail, productName) {
        const html = `
            <h2>Dobre wieści!</h2>
            <p>Produkt <strong>${productName}</strong>, na który czekałeś, jest znów dostępny w naszym menu!</p>
            <a href="${process.env.SITE_URL || 'https://twojadomena.pl'}/shop">Złóż zamówienie teraz</a>
        `;
        return transporter.sendMail({ from: SENDER_EMAIL, to: userEmail, subject: `${productName} jest znów dostępny!`, html });
    },

    // 4. Newsletter od Admina (Z obsługą załączników)
    async sendNewsletter(recipients, subject, htmlContent, attachments = []) {
        // Przy masowej wysyłce używamy "Bcc" (ukryte do wiadomości), aby klienci nie widzieli swoich maili nawzajem
        return transporter.sendMail({ 
            from: SENDER_EMAIL, 
            bcc: recipients, 
            subject: subject, 
            html: htmlContent,
            attachments: attachments 
        });
    }
};

module.exports = emailService;