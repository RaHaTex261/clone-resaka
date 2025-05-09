const jwt = require('jsonwebtoken');
const User = require('../models/User');

const redirectIfAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
            const user = await User.findById(decoded.user.id);
            
            if (user && user.statut === 1) {
                return res.redirect('/'); // Rediriger vers le chat
            }
        }
        next();
    } catch (err) {
        next();
    }
};

module.exports = redirectIfAuthenticated;