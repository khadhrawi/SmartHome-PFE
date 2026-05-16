const mongoose = require('mongoose');

const HouseStateSchema = new mongoose.Schema({
  houseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true,
  },
  lightingMode: {
    type: String,
    enum: ['Cinematic', 'Dinner', 'Morning', 'Sleep', null],
    default: null,
  },
  lockdownMode: { type: Boolean, default: false },
  awayMode:     { type: Boolean, default: false },
  emergencyMode: { type: Boolean, default: false },   // true = gas alarm active
  gasLevel:      { type: Number, default: 0 },         // raw ppm reading
  gasThreshold:  { type: Number, default: 400 },       // ppm above which alarm fires
  gasValveOpen:  { type: Boolean, default: true },     // physical valve state
  lastGasAlert:  { type: Date,   default: null },
  temperature:   { type: Number, default: null },   // °C from DHT11
  humidity:      { type: Number, default: null },   // % from DHT11
  lastDhtRead:   { type: Date,   default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('HouseState', HouseStateSchema);
