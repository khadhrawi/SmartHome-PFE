const mongoose = require('mongoose');

const PermissionRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  houseCode: { type: String, required: true, uppercase: true, trim: true },
  houseAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionKey: { type: String, required: true },
  actionLabel: { type: String, required: true },
  room: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String, default: '' },
  reviewedAt: { type: Date },
  adminReadAt: { type: Date, default: null },
  requesterReadAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PermissionRequest', PermissionRequestSchema);
