document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirection vers la page de chat si la connexion est réussie
                window.location.href = '/';
            } else {
                // Afficher le message d'erreur
                alert(data.message || 'Erreur de connexion');
            }
        } catch (err) {
            console.error('Erreur:', err);
            alert('Une erreur est survenue lors de la connexion');
        }
    });
});