const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect, admin } = require('../middlewares/auth');
const { emitHouseUserCreated } = require('../realtime/notifications');

const HOUSE_CODE_REGEX = /^[A-Z]\d{4}$/;
const INVALID_HOUSE_CODE_MESSAGE = 'Invalid House Code. Please check and try again.';
const INVALID_ADMIN_ACCESS_CODE_MESSAGE = 'Invalid Admin Access Code. Please check and try again.';

const normalizeHouseCode = (value = '') => String(value).trim().toUpperCase();
const normalizeAdminAccessCode = (value = '') => String(value).trim().toUpperCase();
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'ADMIN123';

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
  token: generateToken(user._id),
});

// @route   POST /api/auth/resident/register
// @desc    Register a new resident user
// @access  Public
router.post('/resident/register', async (req, res) => {
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
    });

    if (user) {
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

    if (await user.matchPassword(password)) {
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

    if (await user.matchPassword(password)) {
      res.json(toAuthPayload(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin/register
// @desc    Register a new admin account with admin access code
// @access  Public
router.post('/admin/register', async (req, res) => {
  try {
    const { name, email, password, adminAccessCode } = req.body;
    const normalizedAccessCode = normalizeAdminAccessCode(adminAccessCode);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (normalizedAccessCode !== ADMIN_ACCESS_CODE) {
      return res.status(401).json({ message: INVALID_ADMIN_ACCESS_CODE_MESSAGE });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(422).json({ message: pwError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newAdmin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      adminAccessCode: normalizedAccessCode,
    });

    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      houseCode: newAdmin.houseCode,
      token: jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
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

module.exports = router;
