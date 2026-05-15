const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  // null = global chat, otherwise it's a DM room (sorted usernames joined by '_')
  room: { type: String, default: 'global' }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
