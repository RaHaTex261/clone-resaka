const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, messagesController.getAllMessages);
router.get('/:recipientId', authMiddleware, messagesController.getConversation);
router.post('/', authMiddleware, messagesController.sendMessage);
router.delete('/:id', authMiddleware, messagesController.deleteMessage);
router.put('/:recipientId/read', authMiddleware, messagesController.markMessagesAsRead);

module.exports = router;