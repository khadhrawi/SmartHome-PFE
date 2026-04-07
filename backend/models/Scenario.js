const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  active: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Simple trigger-action structure for MVP
  trigger: {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    condition: { type: String, enum: ['equals', 'greater_than', 'less_than'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  action: {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    command: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scenario', ScenarioSchema);
