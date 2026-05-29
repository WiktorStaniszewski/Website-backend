const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const emailService = require('../services/emailService');
const { User } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

router.post('/send', verifyToken, isSuperAdmin, upload.array('attachments'), async (req, res) => {
    try {
        const { subject, htmlContent } = req.body;
        const files = req.files;

        const attachments = files.map(file => ({
            filename: file.originalname,
            path: file.path
        }));
        const users = await User.findAll({ attributes: ['email'], where: { role: 'customer' } });
        const recipients = users.map(u => u.email);

        await emailService.sendNewsletter(recipients, subject, htmlContent, attachments);
        
        res.json({ message: 'Newsletter wysłany!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});