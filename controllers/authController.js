const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const authController = {
    // Inscription d'un nouvel utilisateur
    async register(req, res) {
        try {
            const { nom_complet, username, email, password } = req.body;
            
            // Vérifier si l'utilisateur existe déjà (email ou username)
            let userExists = await User.findOne({ 
                $or: [
                    { email },
                    { username }
                ]
            });

            if (userExists) {
                return res.status(400).json({ 
                    message: userExists.email === email 
                        ? 'Cet email est déjà utilisé' 
                        : 'Ce nom d\'utilisateur est déjà pris'
                });
            }

            // Créer le nouvel utilisateur
            const user = new User({ nom_complet, username, email, password });
            await user.save();

            const token = jwt.sign(
                { user: { id: user.id } },
                process.env.JWT_SECRET || 'votre_secret_jwt',
                { expiresIn: '1h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 3600000 // 1 heure
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Erreur lors de l\'inscription:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Connexion d'un utilisateur
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ message: 'Identifiants invalides' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Identifiants invalides' });
            }

            // Mettre à jour le statut en ligne
            user.statut = 1;
            await user.save();

            const token = jwt.sign(
                { 
                    user: { 
                        id: user._id.toString()
                    } 
                },
                process.env.JWT_SECRET || 'votre_secret_jwt',
                { expiresIn: '1h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 3600000 // 1 heure
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Erreur lors de la connexion:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Déconnexion
    async logout(req, res) {
        try {
            const token = req.cookies?.token;
            
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
                    // Ne pas mettre à jour le statut ici, car il est géré par Socket.IO
                    // La déconnexion du socket se produira naturellement
                } catch (err) {
                    console.error('Erreur lors du décodage du token:', err);
                }
            }
            
            res.clearCookie('token');
            res.json({ success: true });
        } catch (err) {
            console.error('Erreur lors de la déconnexion:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Récupération des informations de l'utilisateur
    async getUser(req, res) {
        try {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }
            res.json({
                id: user._id,
                nom_complet: user.nom_complet,
                username: user.username,
                email: user.email,
                statut: user.statut
            });
        } catch (err) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }
};

module.exports = authController;