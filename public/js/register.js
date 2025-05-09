document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom_complet = document.getElementById('name').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Vérification des mots de passe
        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nom_complet, username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirection vers la page de chat après inscription réussie
                window.location.href = '/';
            } else {
                alert(data.message || 'Erreur lors de l\'inscription');
            }
        } catch (err) {
            console.error('Erreur:', err);
            alert('Une erreur est survenue lors de l\'inscription');
        }
    });
});