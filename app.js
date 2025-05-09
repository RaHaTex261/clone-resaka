const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const SocketService = require('./socket');
const authMiddleware = require('./middlewares/authMiddleware');
const redirectIfAuthenticated = require('./middlewares/redirectIfAuthenticated');

// Routes
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');

// Initialisation de l'application
const app = express();
const server = require('http').createServer(app);

// Connexion à la base de données
connectDB();

// Configuration de Socket.io
const socketService = new SocketService(server);
app.set('io', socketService.io);

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);

// Routes publiques avec vérification de l'authentification
app.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('register');
});

app.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('login');
});

// Route principale pour le chat (protégée)
app.get('/', authMiddleware, (req, res) => {
    res.render('chat/index', {
        title: 'Ndao-Dresaka - Application de Chat en Temps Réel'
    });
});

// Redirection vers login si non authentifié
app.get('*', (req, res) => {
    res.redirect('/login');
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Une erreur est survenue !' });
});

// Export du serveur pour les tests
module.exports = { app, server };

// Démarrage du serveur uniquement si ce n'est pas un test
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
    });
}
