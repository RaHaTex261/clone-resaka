const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('socket.io', () => {
    return function() {
        return {
            on: jest.fn(),
            emit: jest.fn()
        };
    };
});

const { app } = require('./app');

describe('Test d\'authentification', () => {
    it('devrait rediriger un utilisateur non authentifié vers /login', async () => {
        const response = await request(app)
            .get('/')
            .expect(302);
        
        expect(response.headers.location).toBe('/login');
    });

    // Fermer la connexion après tous les tests
    afterAll(async () => {
        await mongoose.connection.close();
    });
});