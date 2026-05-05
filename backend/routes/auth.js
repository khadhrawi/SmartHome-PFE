const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const HouseOwnerRequest = require('../models/HouseOwnerRequest');
const jwt = require('jsonwebtoken');
const { protect, admin } = require('../middlewares/auth');
const { emitHouseUserCreated } = require('../realtime/notifications');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { logAudit } = require('../utils/audit');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');

const registerRules = validate([
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 60 }).withMessage('Name too long.'),
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
]);

const HOUSE_CODE_REGEX = /^[A-Z]\d{4}$/;
const INVALID_HOUSE_CODE_MESSAGE = 'Invalid House Code. Please check and try again.';
const INVALID_ADMIN_ACCESS_CODE_MESSAGE = 'Invalid Admin Access Code. Please check and try again.';

const normalizeHouseCode = (value = '') => String(value).trim().toUpperCase();
const normalizeAdminAccessCode = (value = '') => String(value).trim().toUpperCase();
const ADMIN_ACCESS_CODE  = process.env.ADMIN_ACCESS_CODE  || 'ADMIN123';
const AGENCY_ACCESS_CODE = process.env.AGENCY_ACCESS_CODE || 'AGENCY2024';

/**
 * Server-side password strength guard.
 * Rules (must match the frontend PasswordStrengthBar):
 *   • 8+ characters
 *   • At least one digit  [0-9]
 *   • At least one special character  [^A-Za-z0-9]
 * Returns an error string if the password is weak/medium, or null if strong.
 */
const validatePasswordStrength = (password = '') => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null; // strong — all checks pass
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateTempToken = (id) => {
  return jwt.sign({ id, twofa: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
};

const toAuthPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role === 'user' ? 'resident' : user.role,
  status: user.status || 'active',
  houseCode: user.houseCode || '',
  linkedAdmin: user.linkedAdmin || null,
  assignedRoom: user.assignedRoom,
  permissions: user.permissions || [],
  roomRequest: user.roomRequest,
  isManaged: user.isManaged ?? null,
  isSuperAdmin: user.isSuperAdmin ?? false,
  avatar: user.avatar || null,
  twoFactorEnabled: user.twoFactorEnabled ?? false,
  token: generateToken(user._id),
});

// @route   POST /api/auth/resident/register
// @desc    Register a new resident user
// @access  Public
router.post('/resident/register', registerRules, async (req, res) => {
  try {
    const { name, email, password, assignedRoom, roomRequest, inviteCode, houseCode } = req.body;
    const normalizedHouseCode = normalizeHouseCode(houseCode);

    if (!HOUSE_CODE_REGEX.test(normalizedHouseCode)) {
      return res.status(400).json({ message: INVALID_HOUSE_CODE_MESSAGE });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const adminUser = await User.findOne({ role: 'admin', houseCode: normalizedHouseCode });
    if (!adminUser) {
      return res.status(400).json({ message: INVALID_HOUSE_CODE_MESSAGE });
    }

    if (!assignedRoom && !roomRequest) {
      return res.status(400).json({ message: 'Assigned room or room request is required' });
    }

    const requiredInvite = process.env.RESIDENT_INVITE_CODE;
    if (requiredInvite && inviteCode !== requiredInvite) {
      return res.status(403).json({ message: 'Valid invite code is required for resident signup' });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(422).json({ message: pwError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      name,
      email,
      password,
      role: 'resident',
      status: 'active',
      houseCode: normalizedHouseCode,
      linkedAdmin: adminUser._id,
      assignedRoom: assignedRoom || '',
      permissions: [],
      roomRequest: roomRequest || '',
      inviteCodeUsed: inviteCode || '',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    if (user) {
      sendVerificationEmail(user.email, verificationToken).catch(() => {});
      emitHouseUserCreated({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        houseCode: user.houseCode,
        assignedRoom: user.assignedRoom,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
      });
      res.status(201).json(toAuthPayload(user));
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/resident/login
// @desc    Auth resident user & get token
// @access  Public
router.post('/resident/login', async (req, res) => {
  try {
    const { email, password, houseCode } = req.body;
    const normalizedHouseCode = normalizeHouseCode(houseCode);

    if (!HOUSE_CODE_REGEX.test(normalizedHouseCode)) {
      return res.status(400).json({ message: INVALID_HOUSE_CODE_MESSAGE });
    }

    const adminUser = await User.findOne({ role: 'admin', houseCode: normalizedHouseCode });
    if (!adminUser) {
      return res.status(400).json({ message: INVALID_HOUSE_CODE_MESSAGE });
    }

    const user = await User.findOne({ email });

    if (!user || user.role === 'admin') {
      return res.status(403).json({ message: 'This portal is for house residents only' });
    }

    const belongsToHouseCode = normalizeHouseCode(user.houseCode) === normalizedHouseCode;
    const belongsToAdmin = user.linkedAdmin ? String(user.linkedAdmin) === String(adminUser._id) : false;
    if (!belongsToHouseCode || !belongsToAdmin) {
      return res.status(400).json({ message: INVALID_HOUSE_CODE_MESSAGE });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.', code: 'EMAIL_NOT_VERIFIED' });
    }

    if (await user.matchPassword(password)) {
      if (user.twoFactorEnabled) {
        return res.json({ requiresTwoFactor: true, tempToken: generateTempToken(user._id) });
      }
      logAudit({ req, action: 'Resident login', category: 'auth', details: `${user.name} logged in`, meta: { userId: user._id, houseCode: user.houseCode } });
      res.json(toAuthPayload(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin/login
// @desc    Auth admin user & get token
// @access  Public
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password, adminAccessCode } = req.body;
    const normalizedAccessCode = normalizeAdminAccessCode(adminAccessCode);

    if (normalizedAccessCode !== ADMIN_ACCESS_CODE) {
      return res.status(401).json({ message: INVALID_ADMIN_ACCESS_CODE_MESSAGE });
    }

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'This portal is for admins only' });
    }

    if (!HOUSE_CODE_REGEX.test(normalizeHouseCode(user.houseCode))) {
      user.houseCode = undefined;
      await user.save();
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.', code: 'EMAIL_NOT_VERIFIED' });
    }

    if (await user.matchPassword(password)) {
      if (user.twoFactorEnabled) {
        return res.json({ requiresTwoFactor: true, tempToken: generateTempToken(user._id) });
      }
      logAudit({ req, action: 'Admin login', category: 'auth', details: `${user.name} logged in`, meta: { userId: user._id, houseCode: user.houseCode } });
      res.json(toAuthPayload(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin/register
// @desc    Register a new house owner account using the unique code sent by admin after approval
// @access  Public
router.post('/admin/register', async (req, res) => {
  try {
    const { name, email, password, adminAccessCode } = req.body;

    if (!name || !email || !password || !adminAccessCode) {
      return res.status(400).json({ message: 'All fields including the access code are required.' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Validate the unique access code against approved HouseOwnerRequests
    const approvedRequest = await HouseOwnerRequest.findOne({
      email: email.toLowerCase(),
      status: 'approved',
      accessCode: adminAccessCode.trim().toUpperCase(),
    });

    if (!approvedRequest) {
      return res.status(401).json({ message: 'Invalid or expired access code. Make sure you are using the code sent to this exact email.' });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(422).json({ message: pwError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const newAdmin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      isEmailVerified: true,
    });

    // Mark the request as consumed so the code can't be reused
    approvedRequest.status = 'consumed';
    await approvedRequest.save();

    const token = jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin/create
// @desc    Create an admin account through protected flow (legacy, for existing admins)
// @access  Private/Admin
router.post('/admin/create', protect, admin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(422).json({ message: pwError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newAdmin = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      houseCode: newAdmin.houseCode,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── @route   POST /api/auth/agency/register ──────────────────────────────────
// @desc    Register a new agency account
// @access  Public (protected by agency access code)
router.post('/agency/register', async (req, res) => {
  try {
    const { name, email, password, agencyAccessCode } = req.body;
    const normalizedCode = normalizeAdminAccessCode(agencyAccessCode);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (normalizedCode !== AGENCY_ACCESS_CODE) {
      return res.status(401).json({ message: 'Invalid Agency Access Code. Please check and try again.' });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) return res.status(422).json({ message: pwError });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const newAgency = await User.create({
      name,
      email,
      password,
      role: 'agency',
      status: 'active',
      adminAccessCode: normalizedCode,
    });

    res.status(201).json({
      _id: newAgency._id,
      name: newAgency.name,
      email: newAgency.email,
      role: newAgency.role,
      token: generateToken(newAgency._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── @route   POST /api/auth/agency/login ─────────────────────────────────────
// @desc    Auth agency user & get token — legacy agency login (no dashboard route)
// @access  Public
router.post('/agency/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== 'agency') {
      return res.status(403).json({ message: 'This portal is for agency accounts only' });
    }

    if (await user.matchPassword(password)) {
      if (user.twoFactorEnabled) {
        return res.json({ requiresTwoFactor: true, tempToken: generateTempToken(user._id) });
      }
      res.json({
        ...toAuthPayload(user),
        redirectTo: '/dashboard',
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Backwards compatibility for legacy screens
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user?.role === 'admin') {
      return res.status(410).json({ message: 'Use the dedicated admin login portal' });
    }
    return res.status(410).json({ message: 'Use the dedicated house resident login portal' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/register', async (req, res) => {
  return res.status(410).json({ message: 'Use the dedicated house resident registration portal' });
});

// ── @route   POST /api/auth/verify-email ─────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── @route   POST /api/auth/resend-verification ───────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.isEmailVerified) {
      return res.json({ message: 'If an unverified account exists, a new email has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, token);
    res.json({ message: 'Verification email resent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── @route   POST /api/auth/forgot-password ───────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return 200 to avoid user enumeration
    if (!user || !user.isEmailVerified) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(user.email, token);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── @route   POST /api/auth/reset-password ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) return res.status(422).json({ message: pwError });

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
