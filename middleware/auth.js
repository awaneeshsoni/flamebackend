// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv")
dotenv.config();

const authMiddle = async (req, res, next) => {
    // Get token from header
    let token = req.get('Authorization');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied M' });
    }
    if (token.startsWith("Bearer ")) {
        token = token.slice(7); // Remove "Bearer " (7 characters)
    }

    // Verify token
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.log(token)
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = authMiddle;