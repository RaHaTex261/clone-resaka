const User = require('../models/User');

const userController = {
    async getAllUsers(req, res) {
        try {
            // Récupérer tous les utilisateurs sauf l'utilisateur actuel
            const users = await User.find({ _id: { $ne: req.user.id } })
                .select('username nom_complet statut');
            
            res.json(users);
        } catch (err) {
            console.error('Erreur lors de la récupération des utilisateurs:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }
};

module.exports = userController;