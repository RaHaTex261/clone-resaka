// Fichier principal d'initialisation de l'application

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser le service de notifications
    initializeNotifications();
    
    // Initialiser les composants de l'interface utilisateur
    initializeUI();
});

/**
 * Initialise le système de notifications
 * Demande la permission si nécessaire
 */
function initializeNotifications() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

/**
 * Initialise les composants de l'interface utilisateur
 * Configure les gestionnaires d'événements
 */
function initializeUI() {
    // Configurer le thème sombre/clair
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addListener((e) => updateTheme(e.matches));
    updateTheme(prefersDark.matches);
}

/**
 * Met à jour le thème de l'application
 * @param {boolean} isDark - True si le thème sombre doit être appliqué
 */
function updateTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
}

const socket = io();

const clientsTotal = document.getElementById("client-total");
const messageContainer = document.getElementById("message-container");
const nameInput = document.getElementById("name-input");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const micButton = document.getElementById("mic-button");

const messageTone = new Audio("/message-tone.mp3");

let recordedAudioBase64 = null;

// Envoi des messages
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

function sendMessage() {
  // Envoi message texte
  if (messageInput.value !== "" && !recordedAudioBase64) {
    const data = {
      name: nameInput.value,
      message: messageInput.value,
      dateTime: new Date(),
    };
    socket.emit("message", data);
    addMessageToUI(true, data);
    messageInput.value = "";
  }

  // Envoi message vocal
  if (recordedAudioBase64) {
    const data = {
      name: nameInput.value,
      audio: recordedAudioBase64,
      dateTime: new Date(),
    };
    socket.emit("audio-message", data);
    addAudioMessageToUI(true, data);
    recordedAudioBase64 = null;

    // Réinitialiser champ texte
    messageInput.value = "";
    messageInput.disabled = false;
  }
}

// Réception message texte
socket.on("chat-message", (data) => {
  messageTone.play();
  addMessageToUI(false, data);
});

// Réception message vocal
socket.on("audio-message", (data) => {
  messageTone.play();
  addAudioMessageToUI(false, data);
});

// Affichage message texte
function addMessageToUI(isOwnMessage, data) {
  clearFeedback();
  const element = `
    <li class="${isOwnMessage ? "message-right" : "message-left"}">
      <p class="message">
        ${data.message}
        <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
      </p>
    </li>
  `;
  messageContainer.innerHTML += element;
  scrollToBottom();
}

// Affichage message vocal
function addAudioMessageToUI(isOwnMessage, data) {
  clearFeedback();
  const audioContent = data.content || data.audio; // Supporter les deux formats
  const element = `
    <li class="${isOwnMessage ? "message-right" : "message-left"}">
      <p class="message">
        🎧 Message vocal :
        <audio controls src="${audioContent}"></audio>
        <span>${data.name || data.sender} ● ${moment(data.dateTime || data.createdAt).fromNow()}</span>
      </p>
    </li>
  `;
  messageContainer.innerHTML += element;
  scrollToBottom();
}

// Scroll
function scrollToBottom() {
  messageContainer.scrollTo(0, messageContainer.scrollHeight);
}

// Feedback (écriture)
messageInput.addEventListener("focus", () => {
  socket.emit("feedback", {
    feedback: `✍️ ${nameInput.value} est en train d’écrire...`,
  });
});
messageInput.addEventListener("keypress", () => {
  socket.emit("feedback", {
    feedback: `✍️ ${nameInput.value} est en train d’écrire...`,
  });
});
messageInput.addEventListener("blur", () => {
  socket.emit("feedback", { feedback: "" });
});

socket.on("feedback", (data) => {
  clearFeedback();
  const element = `
    <li class="message-feedback">
      <p class="feedback" id="feedback">${data.feedback}</p>
    </li>
  `;
  messageContainer.innerHTML += element;
});

function clearFeedback() {
  document.querySelectorAll("li.message-feedback").forEach((el) =>
    el.parentNode.removeChild(el)
  );
}

// 🎤 Enregistrement vocal
let mediaRecorder;
let audioChunks = [];

micButton.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        reader.onloadend = () => {
          recordedAudioBase64 = reader.result;

          // 📝 Afficher dans le champ de saisie
          messageInput.value = "🎧 Message vocal prêt à envoyer";
          messageInput.disabled = true;
        };

        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
      };

      mediaRecorder.start();
      micButton.innerHTML = '<i class="fas fa-stop"></i>';
    } catch (err) {
      alert("⚠️ Accès micro refusé !");
      console.error(err);
    }
  } else {
    mediaRecorder.stop();
  }
});

// Clients connectés
socket.on("clients-total", (data) => {
  clientsTotal.innerText = `Total Clients: ${data}`;
});
