const express = require('express');
const router = express.Router();
const PermissionRequest = require('../models/PermissionRequest');
const User = require('../models/User');
const { protect, admin } = require('../middlewares/auth');
const { emitPermissionCreated, emitPermissionUpdated, emitPermissionsUpdated } = require('../realtime/notifications');

const normalizeRoom = (room) => String(room || '').trim().toLowerCase();

const mergeRoomPermission = (permissions, room) => {
  const normalizedRoom = normalizeRoom(room);
  if (!normalizedRoom) {
    return Array.isArray(permissions) ? permissions : [];
  }

  const nextPermissions = new Set(Array.isArray(permissions) ? permissions : []);
  nextPermissions.add(normalizedRoom);
  nextPermissions.add(`room:${normalizedRoom}`);
  return [...nextPermissions];
};

const mergeGrantedPermissions = ({ permissions, room, actionKey }) => {
  let nextPermissions = Array.isArray(permissions) ? [...permissions] : [];

  if (room) {
    nextPermissions = mergeRoomPermission(nextPermissions, room);
  }

  if (actionKey) {
    const nextSet = new Set(nextPermissions);
    nextSet.add(String(actionKey).trim().toLowerCase());
    nextPermissions = [...nextSet];
  }

  return nextPermissions;
};

// @route   POST /api/permissions/request
// @desc    Resident requests restricted permission
// @access  Private
router.post('/request', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Only residents can create permission requests' });
    }

    if (!req.user.houseCode || !req.user.linkedAdmin) {
      return res.status(403).json({ message: 'Resident account is not linked to a house owner' });
    }

    const { actionKey, actionLabel, room, reason } = req.body;
    const normalizedRoom = normalizeRoom(room);
    const normalizedActionKey = String(actionKey || '').trim().toLowerCase();

    if (!normalizedActionKey || !actionLabel) {
      return res.status(400).json({ message: 'actionKey and actionLabel are required' });
    }

    const pendingExisting = await PermissionRequest.findOne({
      requester: req.user._id,
      actionKey: normalizedActionKey,
      room: normalizedRoom,
      status: 'pending',
    });

    if (pendingExisting) {
      return res.status(409).json({ message: 'A similar request is already pending approval' });
    }

    const created = await PermissionRequest.create({
      requester: req.user._id,
      houseCode: req.user.houseCode,
      houseAdmin: req.user.linkedAdmin,
      actionKey: normalizedActionKey,
      actionLabel,
      room: normalizedRoom,
      reason: reason || '',
      status: 'pending',
      adminReadAt: null,
      requesterReadAt: new Date(),
    });

    const populated = await PermissionRequest.findById(created._id)
      .populate('requester', 'name email role assignedRoom roomRequest houseCode linkedAdmin')
      .populate('reviewer', 'name email role');

    emitPermissionCreated(populated);
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/permissions/mine
// @desc    Get current user's requests
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const list = await PermissionRequest.find({ requester: req.user._id })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'name email role');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/permissions/admin/requests
// @desc    Admin view all permission requests
// @access  Private/Admin
router.get('/admin/requests', protect, admin, async (req, res) => {
  try {
    const status = req.query.status;
    const query = { houseCode: req.user.houseCode };
    if (status) {
      query.status = status;
    }

    const list = await PermissionRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('requester', 'name email role assignedRoom roomRequest houseCode linkedAdmin')
      .populate('reviewer', 'name email role');

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/permissions/admin/requests/:id
// @desc    Admin approves or denies a request
// @access  Private/Admin
router.patch('/admin/requests/:id', protect, admin, async (req, res) => {
  try {
    const { decision, reviewNote } = req.body;
    if (!['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved or denied' });
    }

    const request = await PermissionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Permission request not found' });
    }

    if (String(request.houseCode) !== String(req.user.houseCode)) {
      return res.status(403).json({ message: 'Not allowed to review this request' });
    }

    request.status = decision;
    request.reviewer = req.user._id;
    request.reviewNote = reviewNote || '';
    request.reviewedAt = new Date();
    request.adminReadAt = new Date();
    request.requesterReadAt = null;
    await request.save();

    if (decision === 'approved') {
      const resident = await User.findById(request.requester).select('permissions');
      if (!resident) {
        return res.status(404).json({ message: 'Requester account no longer exists' });
      }

      const nextPermissions = mergeGrantedPermissions({
        permissions: resident.permissions,
        room: request.room,
        actionKey: request.actionKey,
      });

      await User.updateOne(
        { _id: request.requester },
        { $set: { permissions: nextPermissions } },
      );

      emitPermissionsUpdated({
        userId: request.requester,
        permissions: nextPermissions,
      });
    }

    const populated = await PermissionRequest.findById(request._id)
      .populate('requester', 'name email role assignedRoom roomRequest houseCode linkedAdmin')
      .populate('reviewer', 'name email role');

    emitPermissionUpdated(populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/permissions/admin/read-all
// @desc    Mark all admin notifications as read
// @access  Private/Admin
router.patch('/admin/read-all', protect, admin, async (req, res) => {
  try {
    const readAt = new Date();
    await PermissionRequest.updateMany({ houseCode: req.user.houseCode, adminReadAt: null }, { $set: { adminReadAt: readAt } });
    res.json({ success: true, readAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/permissions/mine/read-all
// @desc    Mark all resident notifications as read
// @access  Private
router.patch('/mine/read-all', protect, async (req, res) => {
  try {
    const readAt = new Date();
    await PermissionRequest.updateMany(
      { requester: req.user._id, requesterReadAt: null },
      { $set: { requesterReadAt: readAt } },
    );
    res.json({ success: true, readAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/permissions/:id/read
// @desc    Mark one notification as read for admin/requester
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const request = await PermissionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Permission request not found' });
    }

    const requesterMatches = String(request.requester) === String(req.user._id);
    if (req.user.role === 'admin') {
      if (String(request.houseCode) !== String(req.user.houseCode)) {
        return res.status(403).json({ message: 'Not allowed to update this notification' });
      }
      request.adminReadAt = new Date();
    } else if (requesterMatches) {
      request.requesterReadAt = new Date();
    } else {
      return res.status(403).json({ message: 'Not allowed to update this notification' });
    }

    await request.save();

    const populated = await PermissionRequest.findById(request._id)
      .populate('requester', 'name email role assignedRoom roomRequest houseCode linkedAdmin')
      .populate('reviewer', 'name email role');

    emitPermissionUpdated(populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
