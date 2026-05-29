const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Brak tokenu' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { sessionId, id: userId, role } = decoded;

        const sessionData = await redisClient.get(`session:${sessionId}`);
        if (!sessionData) {
            return res.status(401).json({ error: 'SESSION_TERMINATED_REMOTELY' });
        }

        const session = JSON.parse(sessionData);
        
        const minutesSincePing = (Date.now() - new Date(session.lastHeartbeat).getTime()) / 60000;
        if (minutesSincePing > 60) {
            await redisClient.del(`session:${sessionId}`);
            await redisClient.del(`user_session:${userId}`);
            return res.status(401).json({ error: 'SESSION_TIMEOUT_CLOSED_TAB' });
        }

        req.user = { id: userId, role, sessionId };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Nieprawidłowy lub wygasły token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Odmowa dostępu. Wymagane uprawnienia administracyjne.' });
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ message: 'Odmowa dostępu. Wymagane uprawnienia Głównego Administratora.' });
    }
};

module.exports = { verifyToken, isAdmin, isSuperAdmin };