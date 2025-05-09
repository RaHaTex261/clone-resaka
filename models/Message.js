const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: ObjectId,
        required: true,
        ref: 'User'
    },
    receiverId: {
        type: ObjectId,
        required: true,
        ref: 'User'
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['text', 'audio'],
        default: 'text'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { collection: 'message' }); // Spécification explicite de la collection

module.exports = mongoose.model('Message', MessageSchema);