const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['sensor', 'actuator', 'camera', 'other', 'light', 'door', 'lamp', 'lock', 'ac', 'climate', 'tv', 'television', 'machine', 'washer', 'washing_machine', 'window', 'blind', 'blinds', 'gas_sensor', 'gas-sensor'] },
  topic: { type: String, required: true, unique: true },
  room: { type: String, default: 'Home' },
  position: {
    x: { type: Number, min: 0, max: 100, default: 50 },
    y: { type: Number, min: 0, max: 100, default: 50 },
  },
  brightness: { type: Number, min: 0, max: 100, default: 100 },
  openPct:    { type: Number, min: 0, max: 100, default: 0 },   // for window/blind devices
  color: { type: String, default: '#ffc87a' },
  effect: { type: String, enum: ['none', 'rainbow', 'pulse'], default: 'none' },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  houseCode: { type: String, uppercase: true, trim: true, default: '' },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);
