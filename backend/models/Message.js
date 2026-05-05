const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName:   { type: String, required: true },
  senderEmail:  { type: String, required: true },
  houseCode:    { type: String, default: '' },
  subject:      { type: String, required: true, trim: true },
  body:         { type: String, required: true, trim: true },
  status:       { type: String, enum: ['unread', 'read', 'in_progress', 'resolved'], default: 'unread' },
  adminReply:   { type: String, default: '' },
  repliedAt:    { type: Date, default: null },
  repliedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  repliedByName:{ type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
