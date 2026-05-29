const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');
const redisClient = require('../config/redisClient');
const { verifyToken } = require('../middleware/authMiddleware');

const SESSION_TTL = parseInt(process.env.SESSION_TTL) || 3600; 

const createSession = async (user, deviceInfo, ipAddress) => {
    const sessionId = crypto.randomUUID();
    const sessionData = {
        userId: user.id,
        deviceInfo,
        ipAddress,
        lastHeartbeat: new Date().toISOString()
    };

    await redisClient.setEx(`session:${sessionId}`, SESSION_TTL, JSON.stringify(sessionData));
    await redisClient.setEx(`user_session:${user.id}`, SESSION_TTL, sessionId);

    const secretKey = process.env.JWT_SECRET;
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email, sessionId },
        secretKey,
        { expiresIn: '12h' }
    );
};

// --- REJESTRACJA ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ message: "Nazwa użytkownika, email i hasło są wymagane" });
        }

        const existingUser = await User.findOne({
            where: { [Op.or]: [{ email }, { username }] }
        });

        if (existingUser) return res.status(400).json({ message: "Użytkownik o podanym emailu lub nazwie już istnieje" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'customer',
            image: "https://robohash.org/" + username,
            isActive: true
        });

        const token = await createSession(newUser, req.headers['user-agent'], req.ip);

        res.status(201).json({
            token,
            user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role, image: newUser.image, firstName: newUser.firstName, phone: newUser.phone }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGOWANIE (Nadpisujące sesję - KISS) ---
router.post('/login', async (req, res) => {
    try {
        const { email, password, force } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email/Nazwa użytkownika i hasło są wymagane" });
        }

        const user = await User.findOne({
            where: { [Op.or]: [{ email: email }, { username: email }] }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania' });
        }

        const oldSessionId = await redisClient.get(`user_session:${user.id}`);
        if (oldSessionId) {
            if (!force) {
                return res.status(409).json({ error: 'SESSION_EXISTS', message: 'Istnieje aktywna sesja na innym urządzeniu.' });
            } else {
                await redisClient.del(`session:${oldSessionId}`);
            }
        }

        const token = await createSession(user, req.headers['user-agent'], req.ip);

        res.json({
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role, image: user.image, firstName: user.firstName, phone: user.phone }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// --- WYLOGOWANIE (Usunięcie sesji z Redis) ---
router.post('/logout', verifyToken, async (req, res) => {
    try {
        console.log(`[AUTH] Logout requested for user ${req.user.id}, session ${req.user.sessionId}`);
        const del1 = await redisClient.del(`session:${req.user.sessionId}`);
        const del2 = await redisClient.del(`user_session:${req.user.id}`);
        console.log(`[AUTH] Logout redis del results: session=${del1}, user_session=${del2}`);
        res.json({ status: 'ok' });
    } catch (err) {
        console.error(`[AUTH] Logout error:`, err);
        res.status(500).json({ message: err.message });
    }
});

// --- ODBIERANIE PINGU (Przedłużanie życia dla otwartej karty) ---
router.post('/ping', verifyToken, async (req, res) => {
    try {
        const sessionKey = `session:${req.user.sessionId}`;
        const sessionData = await redisClient.get(sessionKey);

        if (!sessionData) return res.status(401).send();

        const session = JSON.parse(sessionData);
        session.lastHeartbeat = new Date().toISOString();

        // Odnawiamy TTL w Redis, aby sesja nie wygasła dopóki jest pingowana
        await redisClient.setEx(sessionKey, SESSION_TTL, JSON.stringify(session));
        await redisClient.expire(`user_session:${req.user.id}`, SESSION_TTL);

        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).send();
    }
});

// --- WYDŁUŻENIE SESJI O KOLEJNĄ GODZINĘ (Akcja z prompta) ---
router.post('/extend', verifyToken, async (req, res) => {
    try {
        const sessionKey = `session:${req.user.sessionId}`;
        const userKey = `user_session:${req.user.id}`;
        const sessionData = await redisClient.get(sessionKey);

        if (!sessionData) return res.status(401).send();

        const session = JSON.parse(sessionData);
        session.lastHeartbeat = new Date().toISOString();

        await redisClient.setEx(sessionKey, SESSION_TTL, JSON.stringify(session));
        await redisClient.setEx(userKey, SESSION_TTL, req.user.sessionId);

        const secretKey = process.env.JWT_SECRET;
        const newToken = jwt.sign(
            { id: req.user.id, role: req.user.role, email: req.user.email, sessionId: req.user.sessionId },
            secretKey,
            { expiresIn: '12h' }
        );
        res.json({ token: newToken });
    } catch (err) {
        res.status(500).send();
    }
});

// --- WERYFIKACJA HASŁA ADMINA ---
router.post('/verify-password', verifyToken, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: "Hasło jest wymagane" });
        }

        const user = await User.findByPk(req.user.id);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Nieprawidłowe hasło" });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;