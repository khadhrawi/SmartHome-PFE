const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  active: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  houseCode: { type: String, uppercase: true, trim: true, default: '' },
  
  // Flattened Recipe Schema
  trigger: { type: String, required: true },
  targetDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  action: { type: String, required: true },
  scheduleTime: { type: String, default: null }, // "HH:MM" for time-based triggers
  lastTriggeredAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scenario', ScenarioSchema);
