const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // for DMs
  channel:    { type: String },                                          // for channels
  content:    { type: String, required: true, trim: true },
  type:       { type: String, enum: ['dm', 'channel'], required: true },
  roomId:     { type: String, required: true, index: true },
  readBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
