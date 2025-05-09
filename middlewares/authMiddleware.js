const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Vérifier le token dans le cookie
        const token = req.cookies?.token || req.header('x-auth-token');

        if (!token) {
            return res.redirect('/login');
        }

        // Décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
        
        // Vérifier si l'utilisateur existe et son statut
        const user = await User.findById(decoded.user.id);
        
        if (!user) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        // Vérifier le statut de l'utilisateur
        if (user.statut === 0) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        // Mettre l'utilisateur dans la requête
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Erreur d\'authentification:', err);
        res.clearCookie('token');
        res.redirect('/login');
    }
};

module.exports = authMiddleware;