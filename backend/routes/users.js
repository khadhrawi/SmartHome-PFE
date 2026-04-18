const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middlewares/auth');
const {
  emitHouseUserCreated,
  emitHouseUserUpdated,
  emitHouseUserDeleted,
} = require('../realtime/notifications');

const router = express.Router();

const ALLOWED_ROLES = ['resident', 'user'];
const ALLOWED_STATUSES = ['active', 'pending', 'restricted'];

const sanitizeRole = (role = 'resident') => String(role).trim().toLowerCase();
const sanitizeStatus = (status = 'active') => String(status).trim().toLowerCase();
const sanitizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map((item) => String(item).trim()).filter(Boolean))];
};

const serializeHouseUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'active',
  houseCode: user.houseCode,
  linkedAdmin: user.linkedAdmin,
  assignedRoom: user.assignedRoom || '',
  permissions: user.permissions || [],
  createdAt: user.createdAt,
});

const randomPassword = () => Math.random().toString(36).slice(2, 11) + 'A1!';

// @route   GET /api/users/house-crew
// @desc    Get all house residents/users for authenticated admin
// @access  Private/Admin
router.get('/house-crew', protect, admin, async (req, res) => {
  try {
    const houseCode = req.user.houseCode;
    if (!houseCode) {
      return res.status(400).json({ message: 'Admin house code not found' });
    }

    const users = await User.find({ houseCode, role: { $ne: 'admin' } })
      .select('_id name email role status houseCode linkedAdmin assignedRoom permissions createdAt')
      .sort({ createdAt: -1 });

    return res.json(users.map(serializeHouseUser));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/users/house-crew
// @desc    Admin manually creates a house resident/user
// @access  Private/Admin
router.post('/house-crew', protect, admin, async (req, res) => {
  try {
    const houseCode = req.user.houseCode;
    const { name, email, role = 'resident', status = 'pending', assignedRoom = '', permissions = [] } = req.body;

    if (!houseCode) {
      return res.status(400).json({ message: 'Admin house code not found' });
    }

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedRole = sanitizeRole(role);
    const normalizedStatus = sanitizeStatus(status);

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const userExists = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const createdUser = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: randomPassword(),
      role: normalizedRole,
      status: normalizedStatus,
      houseCode,
      linkedAdmin: req.user._id,
      assignedRoom: String(assignedRoom || '').trim(),
      permissions: sanitizePermissions(permissions),
      inviteCodeUsed: 'admin-created',
    });

    const payload = serializeHouseUser(createdUser);
    emitHouseUserCreated(payload);

    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/users/house-crew/:userId
// @desc    Admin updates house resident/user fields
// @access  Private/Admin
router.patch('/house-crew/:userId', protect, admin, async (req, res) => {
  try {
    const houseCode = req.user.houseCode;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user.houseCode) !== String(houseCode)) {
      return res.status(403).json({ message: 'Not allowed to manage this user' });
    }

    const { name, email, role, status, assignedRoom, permissions } = req.body;

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = normalizedEmail;
    }

    if (typeof role === 'string') {
      const normalizedRole = sanitizeRole(role);
      if (!ALLOWED_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      user.role = normalizedRole;
    }

    if (typeof status === 'string') {
      const normalizedStatus = sanitizeStatus(status);
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      user.status = normalizedStatus;
    }

    if (typeof assignedRoom === 'string') {
      user.assignedRoom = assignedRoom.trim();
    }

    if (Array.isArray(permissions)) {
      user.permissions = sanitizePermissions(permissions);
    }

    await user.save();

    const payload = serializeHouseUser(user);
    emitHouseUserUpdated(payload);

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/house-crew/:userId
// @desc    Admin removes user from house
// @access  Private/Admin
router.delete('/house-crew/:userId', protect, admin, async (req, res) => {
  try {
    const houseCode = req.user.houseCode;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user.houseCode) !== String(houseCode)) {
      return res.status(403).json({ message: 'Not allowed to manage this user' });
    }

    await User.findByIdAndDelete(userId);
    emitHouseUserDeleted({ houseCode, userId: String(user._id) });

    return res.json({ success: true, userId: String(user._id) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;