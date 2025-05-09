# Ndao Iresaka

## Installation
```bash
git clone [url-du-repo]
cd ndao-iresaka
npm install
```

## Lancement
```bash
npm run dev  # Mode développement
npm start    # Mode production
```

## Endpoints API

### Authentification
- `POST /api/auth/register` - Inscription utilisateur
- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/logout` - Déconnexion

### Messages
- `GET /api/messages` - Récupérer les messages
- `POST /api/messages` - Envoyer un message
- `PUT /api/messages/:id/read` - Marquer comme lu

## Exemple de test (Postman / Socket.IO Client)

### Test avec Postman
```http
# Inscription
POST http://localhost:3000/api/auth/register
{
    "username": "test",
    "email": "test@example.com",
    "password": "test123"
}

# Connexion
POST http://localhost:3000/api/auth/login
{
    "email": "test@example.com",
    "password": "test123"
}
```

### Test avec Socket.IO Client
```javascript
const socket = io('http://localhost:3000', {
    auth: { token: 'votre_token_jwt' }
});

socket.emit('send_message', {
    receiverId: 'user_id',
    content: 'Hello!',
    type: 'text'
});
```

## Exemple de tests automatisés (Jest)
```bash
# Lancer tous les tests
npm test

# Lancer un fichier de test spécifique
npm test app.test.js
```

Exemple de test:
```javascript
describe('Auth API', () => {
    test('should register new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'test',
                email: 'test@example.com',
                password: 'test123'
            });
        expect(response.status).toBe(201);
    });
});
```

## Démarche TDD appliquée dans le projet

1. **Écriture des tests d'abord**
   - Tests d'authentification
   - Tests de messagerie
   - Tests de connexion Socket.IO

2. **Implémentation du code**
   - Développement des fonctionnalités
   - Validation des tests

3. **Refactoring**
   - Amélioration du code
   - Maintien des tests
