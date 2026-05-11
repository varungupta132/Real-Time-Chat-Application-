const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  channel:  { type: String },  // for department channels
  content:  { type: String, required: true },
  type:     { type: String, enum: ['dm', 'channel'], default: 'dm' },
  roomId:   { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
