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
  awayMode: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('HouseState', HouseStateSchema);
