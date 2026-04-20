const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName:  { type: String, required: true },
  senderEmail: { type: String, required: true },
  houseCode:   { type: String, default: '' },
  subject:     { type: String, required: true, trim: true },
  body:        { type: String, required: true, trim: true },
  status:      { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
