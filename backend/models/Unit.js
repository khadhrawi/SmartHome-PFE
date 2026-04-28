const mongoose = require('mongoose');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Generate a candidate [A-Z]\d{4} unit code */
const createUnitCodeCandidate = () => {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const number = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${number}`;
};

const UnitSchema = new mongoose.Schema(
  {
    unitCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    ownerName: {
      type: String,
      default: 'Unclaimed',
      trim: true,
    },
    // References the User who owns / manages this unit
    ownerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Safe', 'Warning', 'Emergency'],
      default: 'Safe',
    },
    claimed: {
      type: Boolean,
      default: false,
    },
    // Links to an admin User's houseCode once claimed
    houseCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    /**
     * isManaged:
     *   true  → agency-managed unit (Request Maintenance active, agency oversight)
     *   false → solo/independent unit (owner gets full Super-Admin rights, no agency UI)
     */
    isManaged: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

/** Static helper used by the solo-unit creation endpoint */
UnitSchema.statics.generateUniqueCode = async function () {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = createUnitCodeCandidate();
    const exists = await this.exists({ unitCode: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate unique unit code after 1000 attempts');
};

module.exports = mongoose.model('Unit', UnitSchema);
