const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const HOUSE_CODE_PATTERN = /^[A-Z]\d{4}$/;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const createHouseCodeCandidate = () => {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const number = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${number}`;
};

const generateUniqueAdminHouseCode = async (UserModel, excludeId) => {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = createHouseCodeCandidate();
    const exists = await UserModel.exists({
      role: 'admin',
      houseCode: candidate,
      _id: { $ne: excludeId },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error('Unable to generate unique house code');
};

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'resident', 'user', 'agency'], default: 'resident' },
  status: { type: String, enum: ['active', 'pending', 'restricted'], default: 'active' },
  adminAccessCode: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  houseCode: {
    type: String,
    uppercase: true,
    trim: true,
    match: [HOUSE_CODE_PATTERN, 'House code must be 1 uppercase letter followed by 4 numbers'],
  },
  linkedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedRoom: { type: String, default: '' },
  permissions: [{ type: String }],
  roomRequest: { type: String, default: '' },
  inviteCodeUsed: { type: String, default: '' },
  /** Onboarding: set after join/solo choice */
  isManaged:   { type: Boolean, default: null },
  isSuperAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  /** OAuth */
  googleId: { type: String, default: null },

  /** Email verification */
  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },

  /** Password reset */
  passwordResetToken:   { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },

  /** Profile avatar — stored as base64 data URL */
  avatar: { type: String, default: null },

  /** 2FA / TOTP */
  twoFactorEnabled:    { type: Boolean, default: false },
  twoFactorSecret:     { type: String, default: null, select: false },
  twoFactorTempSecret: { type: String, default: null, select: false },
});

UserSchema.index(
  { houseCode: 1 },
  { unique: true, partialFilterExpression: { role: 'admin', houseCode: { $type: 'string' } } },
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (this.houseCode) {
    this.houseCode = String(this.houseCode).trim().toUpperCase();
  }

  if (this.role === 'admin' && !this.houseCode) {
    this.houseCode = await generateUniqueAdminHouseCode(this.constructor, this._id);
  }

  if (this.houseCode && !HOUSE_CODE_PATTERN.test(this.houseCode)) {
    return next(new Error('House code must be 1 uppercase letter followed by 4 numbers'));
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
