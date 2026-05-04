const mongoose = require('mongoose');
const crypto = require('crypto');

const HouseOwnerRequestSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phone:    { type: String, default: '' },
    note:     { type: String, default: '' },
    status:   { type: String, enum: ['pending', 'approved', 'rejected', 'consumed'], default: 'pending' },
    accessCode: { type: String, default: null },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

HouseOwnerRequestSchema.statics.generateAccessCode = () =>
  'HO-' + crypto.randomBytes(4).toString('hex').toUpperCase();

module.exports = mongoose.model('HouseOwnerRequest', HouseOwnerRequestSchema);
