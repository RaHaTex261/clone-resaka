// Classe principale de l'application de chat
class ChatApp {
    constructor() {
        // Connexion au serveur WebSocket
        this.socket = io();
        this.currentUserId = null;
        this.currentRecipient = null;
        this.currentUserName = '';

        // Initialisation des variables pour l'enregistrement audio
        this.audioChunks = [];
        this.recordedAudioBase64 = null;

        // Initialisation et préchargement du son de notification
        this.messageTone = new Audio("/message-tone.mp3");
        this.messageTone.load(); // Préchargement du son
        this.messageTone.volume = 0.5; // Volume à 50%

        // Test initial de la lecture du son
        document.addEventListener('click', () => {
            // Essayer de jouer le son une fois que l'utilisateur a interagi avec la page
            this.messageTone.play().then(() => {
                this.messageTone.pause();
                this.messageTone.currentTime = 0;
            }).catch(err => console.warn('Autoplay du son bloqué:', err));
        }, { once: true });

        // Initialisation des éléments du DOM
        this.initializeElements();

        // Créer un input caché pour stocker le nom
        this.nameInput = document.createElement('input');
        this.nameInput.type = 'hidden';
        document.body.appendChild(this.nameInput);

        // Ajout des écouteurs d'événements
        this.initializeEventListeners();

        // Configuration des écouteurs de socket
        this.initializeSocketListeners();

        // Initialiser le système de keep-alive
        this.initializeKeepAlive();

        // Charger les données initiales
        this.init();

        this.unreadMessages = new Map(); // Pour stocker le nombre de messages non lus par utilisateur
    }

    async init() {
        try {
            // Charger les informations de l'utilisateur
            await this.loadUserInfo();
            
            // Charger tous les utilisateurs
            const users = await this.loadUsers();
            
            // Récupérer le dernier chat actif
            const lastActiveChat = localStorage.getItem('lastActiveChat');
            if (lastActiveChat) {
                const lastActiveChatUser = users.find(user => user._id === lastActiveChat);
                if (lastActiveChatUser) {
                    // Simuler la sélection de l'utilisateur
                    this.currentRecipient = {
                        _id: lastActiveChatUser._id,
                        username: lastActiveChatUser.username,
                        statut: lastActiveChatUser.statut
                    };
                    
                    // Mettre à jour l'interface utilisateur
                    this.updateRecipientInfo();
                    this.updateUsersList(users);
                    
                    // Charger la conversation
                    await this.loadConversation(lastActiveChat);
                }
            }
        } catch (err) {
            console.error('Erreur lors de l\'initialisation:', err);
        }
    }

    // Sélection des éléments du DOM
    initializeElements() {
        this.messageContainer = document.getElementById("message-container");
        this.nameInput = document.getElementById("name-input");
        this.messageForm = document.getElementById("message-form");
        this.messageInput = document.getElementById("message-input");
        this.micButton = document.getElementById("mic-button");
        this.statusIndicator = document.getElementById('status-indicator');
        this.usersList = document.getElementById('users-list');
        this.recipientInfo = document.getElementById('recipient-info');
        this.currentUserNameElement = document.getElementById('current-user-name');

        // Gestionnaire du modal de chiffrement
        this.modal = document.getElementById('encryption-modal');
        this.sendEncrypted = document.getElementById('send-encrypted');
        this.sendPlain = document.getElementById('send-plain');
        this.passwordSection = document.getElementById('password-section');
        this.encryptionPassword = document.getElementById('encryption-password');
        this.confirmSend = document.getElementById('confirm-send');
    }

    // Ajout des écouteurs d'événements pour les interactions utilisateur
    initializeEventListeners() {
        // Gestion de la soumission du formulaire de message
        this.messageForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (this.messageInput.value.trim() && !this.recordedAudioBase64) {
                this.modal.style.display = 'block';
            } else if (this.recordedAudioBase64) {
                this.sendAudioMessage();
            }
        });

        // Gérer le choix "Chiffrer le message"
        this.sendEncrypted.addEventListener('click', () => {
            this.passwordSection.style.display = 'block';
        });

        // Gérer le choix "Envoyer sans chiffrement"
        this.sendPlain.addEventListener('click', () => {
            this.sendTextMessage();
            this.modal.style.display = 'none';
        });

        // Gérer la confirmation d'envoi avec chiffrement
        this.confirmSend.addEventListener('click', () => {
            const password = this.encryptionPassword.value;
            if (password) {
                // TODO: Implémenter la logique de chiffrement ici
                this.sendTextMessage(true);
                this.encryptionPassword.value = '';
                this.passwordSection.style.display = 'none';
                this.modal.style.display = 'none';
            }
        });

        // Fermer le modal en cliquant en dehors
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
                this.passwordSection.style.display = 'none';
                this.encryptionPassword.value = '';
            }
        });

        // Gestion des événements de saisie pour afficher le feedback
        this.messageInput.addEventListener("focus", () => this.handleTyping());
        this.messageInput.addEventListener("keypress", () => this.handleTyping());
        this.messageInput.addEventListener("blur", () => this.handleStopTyping());

        // Gestion du bouton microphone pour l'enregistrement vocal
        this.micButton.addEventListener("click", () => this.handleMicClick());

        // Gestion de la déconnexion
        document.getElementById('logout-button').addEventListener('click', () => {
            // Appel à la route de déconnexion
            fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include' // Pour inclure les cookies
            })
            .then(() => {
                // Redirection vers la page de connexion
                window.location.href = '/login';
            })
            .catch(err => {
                console.error('Erreur lors de la déconnexion:', err);
                // Redirection même en cas d'erreur
                window.location.href = '/login';
            });
        });
    }

    // Configuration des écouteurs de socket pour les événements du serveur
    initializeSocketListeners() {
        // Gestion de la réception des messages texte
        this.socket.on("chat-message", (data) => this.handleIncomingMessage(data));

        // Gestion de la réception des messages audio
        this.socket.on("audio-message", (data) => this.handleIncomingAudio(data));

        // Gestion du feedback de saisie
        this.socket.on("feedback", (data) => this.handleFeedback(data));

        // Nouveau gestionnaire pour les mises à jour de la liste des utilisateurs
        this.socket.on('users_update', (users) => {
            this.updateUsersList(users);
        });

        // Gestion du keep-alive
        this.socket.on('keep_alive', () => {
            this.socket.emit('pong');
        });

        // Écouter les messages privés
        this.socket.on("private-message", (data) => {
            if (data.senderId === this.currentRecipient?._id) {
                this.handleIncomingMessage({
                    message: data.content,
                    name: this.currentRecipient.username,
                    dateTime: data.dateTime,
                    socketId: data.socketId
                });
                // Marquer automatiquement comme lu si la conversation est ouverte
                this.markMessagesAsRead(data.senderId);
            } else {
                // Incrémenter le compteur de messages non lus
                const currentCount = this.unreadMessages.get(data.senderId) || 0;
                this.unreadMessages.set(data.senderId, currentCount + 1);
                this.updateUsersList(this.users); // Mettre à jour l'affichage
            }
        });

        // Écouter les messages audio privés
        this.socket.on("private-audio-message", (data) => {
            if (data.senderId === this.currentRecipient?._id) {
                this.handleIncomingAudio({
                    audio: data.content,
                    name: this.currentRecipient.username,
                    dateTime: data.dateTime,
                    socketId: data.socketId
                });
                // Marquer automatiquement comme lu si la conversation est ouverte
                this.markMessagesAsRead(data.senderId);
            } else {
                // Incrémenter le compteur de messages non lus
                const currentCount = this.unreadMessages.get(data.senderId) || 0;
                this.unreadMessages.set(data.senderId, currentCount + 1);
                this.updateUsersList(this.users); // Mettre à jour l'affichage
            }
        });

        // Écouter l'événement de messages lus
        this.socket.on('messages-read', (data) => {
            // Si quelqu'un a lu nos messages, on peut mettre à jour l'interface
            if (this.currentRecipient?._id === data.readBy) {
                // Mettre à jour les indicateurs de lecture dans l'interface
                document.querySelectorAll('.message-right .message').forEach(msg => {
                    msg.classList.add('read');
                });
            }
        });
    }

    // Initialiser le système de keep-alive
    initializeKeepAlive() {
        // Envoyer un pong toutes les 25 secondes pour maintenir la connexion
        setInterval(() => {
            if (this.socket.connected) {
                this.socket.emit('pong');
            }
        }, 25000);

        // Gérer la reconnexion
        this.socket.on('reconnect', async () => {
            // Recharger les informations utilisateur lors de la reconnexion
            await this.loadUserInfo();
        });
    }

    // Charger les utilisateurs et la dernière conversation active
    async loadInitialData() {
        await this.loadUserInfo();
        const users = await this.loadUsers();
        
        // Récupérer la dernière conversation active depuis le localStorage
        const lastActiveChat = localStorage.getItem('lastActiveChat');
        if (lastActiveChat) {
            const user = users.find(u => u._id === lastActiveChat);
            if (user) {
                const userItem = document.querySelector(`[data-user-id="${user._id}"]`);
                if (userItem) {
                    this.handleUserSelect(userItem);
                }
            }
        }
    }

    // Gestion de la soumission du formulaire de message
    handleSubmit(e) {
        e.preventDefault();
        if (this.messageInput.value !== "" && !this.recordedAudioBase64) {
            this.sendTextMessage();
        } else if (this.recordedAudioBase64) {
            this.sendAudioMessage();
        }
    }

    // Fonction pour charger les informations de l'utilisateur
    async loadUserInfo() {
        try {
            const response = await fetch('/api/auth/user', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Pour inclure les cookies
            });

            if (response.ok) {
                const userData = await response.json();
                // Mettre à jour le champ avec le nom d'utilisateur
                this.nameInput.value = userData.username;
                this.currentUserName = userData.username;
                this.currentUserId = userData.id;
                this.currentUserNameElement.textContent = userData.username;
                // Mise à jour de l'indicateur de statut
                this.updateStatusIndicator(userData.statut);

                // Émettre l'événement de connexion utilisateur
                this.socket.emit('user_connected', userData.id);
            } else {
                console.error('Erreur lors de la récupération des informations utilisateur');
                window.location.href = '/login'; // Rediriger vers la page de connexion si non authentifié
            }
        } catch (err) {
            console.error('Erreur:', err);
            window.location.href = '/login';
        }
    }

    // Nouvelle méthode pour charger la liste des utilisateurs
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                this.updateUsersList(users);
                return users;
            }
        } catch (err) {
            console.error('Erreur lors du chargement des utilisateurs:', err);
        }
        return [];
    }

    // Nouvelle méthode pour mettre à jour la liste des utilisateurs dans l'interface
    updateUsersList(users) {
        const otherUsers = users.filter(user => user._id !== this.currentUserId);

        this.usersList.innerHTML = otherUsers.map(user => `
            <li class="user-item ${this.currentRecipient?._id === user._id ? 'active' : ''}" data-user-id="${user._id}">
                <span class="status-indicator ${user.statut === 1 ? 'online' : 'offline'}"></span>
                <span class="username">${user.username}</span>
                ${this.unreadMessages.get(user._id) ? 
                    `<span class="unread-badge">${this.unreadMessages.get(user._id)}</span>` : 
                    ''}
            </li>
        `).join('');

        // Ajouter les écouteurs d'événements pour chaque utilisateur
        this.usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', () => this.handleUserSelect(item));
        });
    }

    // Nouvelle méthode pour gérer la sélection d'un utilisateur
    async handleUserSelect(userItem) {
        const userId = userItem.dataset.userId;
        const username = userItem.querySelector('.username').textContent;
        const isOnline = userItem.querySelector('.status-indicator').classList.contains('online');

        // Mettre à jour l'interface
        document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
        userItem.classList.add('active');

        // Mettre à jour les informations du destinataire
        this.currentRecipient = { _id: userId, username, statut: isOnline ? 1 : 0 };
        this.updateRecipientInfo();

        // Sauvegarder la conversation active
        localStorage.setItem('lastActiveChat', userId);

        // Marquer les messages comme lus
        await this.markMessagesAsRead(userId);
        
        // Réinitialiser le compteur de messages non lus
        this.unreadMessages.delete(userId);
        
        // Charger la conversation
        await this.loadConversation(userId);
    }

    // Nouvelle méthode pour marquer les messages comme lus
    async markMessagesAsRead(senderId) {
        try {
            await fetch(`/api/messages/${senderId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        } catch (err) {
            console.error('Erreur lors du marquage des messages comme lus:', err);
        }
    }

    // Nouvelle méthode pour mettre à jour l'affichage du destinataire
    updateRecipientInfo() {
        if (this.currentRecipient) {
            this.recipientInfo.innerHTML = `
                <span class="username">Discussion avec ${this.currentRecipient.username}</span>
                <span class="status-indicator ${this.currentRecipient.statut === 1 ? 'online' : 'offline'}"></span>
            `;
            this.recipientInfo.classList.remove('hidden');
        } else {
            this.recipientInfo.classList.add('hidden');
        }
    }

    // Nouvelle méthode pour charger les messages d'une conversation
    async loadConversation(recipientId) {
        if (!recipientId) return;

        try {
            const response = await fetch(`/api/messages/${recipientId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const messages = await response.json();
                this.messageContainer.innerHTML = ''; // Vider le conteneur

                // Trier les messages par date
                messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                messages.forEach(message => {
                    const isOwnMessage = message.senderId === this.currentUserId;
                    const senderName = isOwnMessage ? this.currentUserName : this.currentRecipient.username;

                    if (message.type === 'text') {
                        this.addMessageToUI(isOwnMessage, {
                            message: message.content,
                            name: senderName,
                            dateTime: message.timestamp,
                            isRead: message.isRead,
                            encrypted: message.encrypted
                        });
                    } else if (message.type === 'audio') {
                        this.addAudioMessageToUI(isOwnMessage, {
                            audio: message.content,
                            name: senderName,
                            dateTime: message.timestamp,
                            isRead: message.isRead
                        });
                    }
                });
                
                this.scrollToBottom();

                // Marquer les messages comme lus si nécessaire
                if (this.currentRecipient) {
                    await this.markMessagesAsRead(this.currentRecipient._id);
                }
            }
        } catch (err) {
            console.error('Erreur lors du chargement des messages:', err);
        }
    }

    // Nouvelle méthode pour mettre à jour l'indicateur de statut
    updateStatusIndicator(status) {
        this.statusIndicator.className = 'status-indicator';
        if (status === 1) {
            this.statusIndicator.classList.add('online');
        } else {
            this.statusIndicator.classList.add('offline');
        }
    }

    // Fonction d'envoi de message texte
    sendTextMessage(isEncrypted = false) {
        if (!this.currentRecipient) {
            alert('Veuillez sélectionner un destinataire');
            return;
        }

        const data = {
            receiverId: this.currentRecipient._id,
            content: this.messageInput.value,
            type: 'text',
            dateTime: new Date(),
            socketId: this.socket.id,
            encrypted: isEncrypted
        };

        this.socket.emit("private-message", data);
        this.addMessageToUI(true, {
            message: data.content,
            name: this.nameInput.value,
            dateTime: data.dateTime,
            encrypted: isEncrypted
        });
        this.messageInput.value = "";
    }

    // Fonction d'envoi de message audio
    sendAudioMessage() {
        if (!this.currentRecipient) {
            alert('Veuillez sélectionner un destinataire');
            return;
        }

        const data = {
            receiverId: this.currentRecipient._id,
            content: this.recordedAudioBase64, // Utiliser content au lieu de audio
            type: 'audio',
            dateTime: new Date(),
            socketId: this.socket.id
        };

        this.socket.emit("private-audio-message", data);
        this.addAudioMessageToUI(true, {
            audio: data.content,
            name: this.nameInput.value,
            dateTime: data.dateTime
        });

        this.recordedAudioBase64 = null;
        this.messageInput.value = "";
        this.messageInput.disabled = false;
    }

    // Gestion du clic sur le bouton microphone
    async handleMicClick() {
        if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.startRecording(stream);
            } catch (err) {
                alert("⚠️ Accès micro refusé !");
                console.error(err);
            }
        } else {
            this.stopRecording();
        }
    }

    // Fonction pour démarrer l'enregistrement vocal
    startRecording(stream) {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => this.handleRecordingComplete();
        this.mediaRecorder.start();
        this.micButton.innerHTML = '<i class="fas fa-stop"></i>';
    }

    // Fonction pour arrêter l'enregistrement vocal
    stopRecording() {
        this.mediaRecorder.stop();
    }

    // Gestion de la fin de l'enregistrement vocal
    handleRecordingComplete() {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            this.recordedAudioBase64 = reader.result;
            this.messageInput.value = "🎧 Message vocal prêt à envoyer";
            this.messageInput.disabled = true;
        };
        this.micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    }

    // Gestion de la réception des messages texte
    handleIncomingMessage(data) {
        try {
            // Jouer le son pour tous les messages entrants, sauf ceux envoyés par cet utilisateur
            if (data.socketId !== this.socket.id) {
                this.messageTone.currentTime = 0;
                this.messageTone.play().catch(err => 
                    console.warn('Erreur lors de la lecture du son:', err)
                );
            }
        } catch (err) {
            console.warn('Erreur avec la notification sonore:', err);
        }
        this.addMessageToUI(false, data);
    }

    // Gestion de la réception des messages audio
    handleIncomingAudio(data) {
        try {
            // Jouer le son de notification pour les messages entrants
            if (data.socketId !== this.socket.id) {
                this.messageTone.currentTime = 0;
                this.messageTone.play().catch(err => 
                    console.warn('Erreur lors de la lecture du son:', err)
                );
            }

            // S'assurer que les données audio sont valides
            if (!data.audio || !data.audio.startsWith('data:audio')) {
                console.error('Format audio invalide:', data);
                return;
            }

            this.addAudioMessageToUI(false, {
                ...data,
                audio: data.audio,  // Utiliser directement les données audio reçues
                name: data.name || 'Utilisateur',
                dateTime: data.timestamp || new Date()
            });
        } catch (err) {
            console.error('Erreur lors de la réception du message audio:', err);
        }
    }

    // Ajout d'un message texte à l'interface utilisateur
    addMessageToUI(isOwnMessage, data) {
        this.clearFeedback();
        const messageText = data.message || data.content || '';
        
        // Ajouter le dropdown de déchiffrement uniquement pour les messages chiffrés reçus
        const decryptDropdown = (!isOwnMessage && data.encrypted) ? `
            <div class="decrypt-dropdown">
                <button class="decrypt-button" onclick="event.preventDefault(); this.nextElementSibling.classList.toggle('active')">
                    <i class="fas fa-lock-open"></i>
                    Déchiffrer
                </button>
                <div class="decrypt-section">
                    <input type="password" class="decrypt-password" placeholder="Entrez le mot de passe">
                    <button onclick="event.preventDefault(); 
                        const password = this.previousElementSibling.value;
                        if(password) {
                            this.parentElement.parentElement.parentElement.querySelector('.message-content').textContent = messageText;
                            this.parentElement.classList.remove('active');
                        }">
                        Déchiffrer le message
                    </button>
                </div>
            </div>
        ` : '';

        const element = `
            <li class="${isOwnMessage ? "message-right" : "message-left"}">
                <p class="message">
                    <span class="message-content">${data.encrypted ? '🔒 Message chiffré' : messageText}</span>
                    ${decryptDropdown}
                    <span>${data.name} ● ${moment(data.dateTime || data.timestamp).fromNow()}</span>
                </p>
            </li>
        `;
        this.messageContainer.innerHTML += element;
        this.scrollToBottom();
    }

    // Ajout d'un message audio à l'interface utilisateur
    addAudioMessageToUI(isOwnMessage, data) {
        this.clearFeedback();
        const element = `
            <li class="${isOwnMessage ? "message-right" : "message-left"}">
                <p class="message">
                    🎧 Message vocal
                    <audio controls controlsList="nodownload">
                        <source src="${data.audio}" type="audio/webm">
                        Votre navigateur ne supporte pas la lecture audio.
                    </audio>
                    <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
                </p>
            </li>
        `;
        this.messageContainer.innerHTML += element;
        this.scrollToBottom();

        // Activer automatiquement les contrôles audio
        const lastAudio = this.messageContainer.querySelector('li:last-child audio');
        if (lastAudio) {
            lastAudio.load();
        }
    }

    // Gestion du feedback de saisie
    handleTyping() {
        this.socket.emit("feedback", {
            feedback: `✍️ ${this.nameInput.value} est en train d'écrire...`
        });
    }

    // Gestion de l'arrêt du feedback de saisie
    handleStopTyping() {
        this.socket.emit("feedback", { feedback: "" });
    }

    // Ajout du feedback à l'interface utilisateur
    handleFeedback(data) {
        this.clearFeedback();
        const element = `
            <li class="message-feedback">
                <p class="feedback" id="feedback">${data.feedback}</p>
            </li>
        `;
        this.messageContainer.innerHTML += element;
    }

    // Suppression du feedback de l'interface utilisateur
    clearFeedback() {
        document.querySelectorAll("li.message-feedback").forEach(el => {
            el.parentNode.removeChild(el);
        });
    }

    // Fonction pour faire défiler automatiquement vers le bas
    scrollToBottom() {
        this.messageContainer.scrollTo(0, this.messageContainer.scrollHeight);
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});