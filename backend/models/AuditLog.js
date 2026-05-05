const mongoose = require('mongoose');
const AuditLogSchema = new mongoose.Schema({
  actor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorName: { type: String, default: 'System' },
  actorRole: { type: String, default: '' },
  houseCode: { type: String, default: '' },
  action:    { type: String, required: true }, // e.g. 'DEVICE_COMMAND', 'USER_LOGIN', etc.
  category:  { type: String, enum: ['auth','device','security','user','scenario','system'], default: 'system' },
  details:   { type: String, default: '' },
  meta:      { type: mongoose.Schema.Types.Mixed, default: {} },
  ip:        { type: String, default: '' },
}, { timestamps: true });
AuditLogSchema.index({ houseCode: 1, createdAt: -1 });
module.exports = mongoose.model('AuditLog', AuditLogSchema);
