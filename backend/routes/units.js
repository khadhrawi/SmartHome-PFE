const express = require('express');
const router = express.Router();
const Unit = require('../models/Unit');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the enriched user payload sent back after join / solo */
const toOnboardedPayload = (user, unit, forceSuperAdmin) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'active',
  houseCode: unit.unitCode,
  isManaged: unit.isManaged,
  isSuperAdmin: forceSuperAdmin ?? false,
  unitId: unit._id,
  permissions: user.permissions || [],
  assignedRoom: user.assignedRoom || '',
  roomRequest: user.roomRequest || '',
});

// ─── GET /api/units/verify/:code ────────────────────────────────────────────
// Public-ish: check whether a unitCode exists in the Units collection
router.get('/verify/:code', protect, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const unit = await Unit.findOne({ unitCode: code });
    if (!unit) {
      return res.status(404).json({ valid: false, message: 'No residence found with that code.' });
    }
    res.json({
      valid: true,
      unitCode: unit.unitCode,
      ownerName: unit.ownerName,
      isManaged: unit.isManaged,
      claimed: unit.claimed,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/units/join ────────────────────────────────────────────────────
// Logged-in user joins an existing agency-managed unit by its code.
// Marks the unit as claimed + links the user.
router.post('/join', protect, async (req, res) => {
  try {
    const { houseCode } = req.body;
    const code = String(houseCode || '').trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ message: 'House code is required.' });
    }

    const unit = await Unit.findOne({ unitCode: code });
    if (!unit) {
      return res.status(404).json({ message: 'No residence found with that code. Please check and try again.' });
    }

    // Allow multiple residents to join the same unit
    // Only block if requester is not the owner AND this is a resident trying to claim ownership
    if (!unit.claimed) {
      unit.claimed = true;
      unit.ownerID = req.user._id;
      unit.ownerName = req.user.name;
      unit.lastUpdated = new Date();
      await unit.save();
    }

    // Persist houseCode on the User document — residents are never superAdmin
    // Link resident to the unit owner (admin) so permission requests can be routed
    await User.findByIdAndUpdate(req.user._id, {
      houseCode: unit.unitCode,
      isManaged: unit.isManaged,
      isSuperAdmin: false,
      linkedAdmin: unit.ownerID,
    });

    res.json(toOnboardedPayload(req.user, unit, false));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/units/solo ────────────────────────────────────────────────────
// Logged-in user starts a solo home: generates a unique unit code,
// sets ownerID = current user, isManaged = false.
router.post('/solo', protect, async (req, res) => {
  try {
    const unitCode = await Unit.generateUniqueCode();

    const unit = await Unit.create({
      unitCode,
      ownerName: req.user.name,
      ownerID: req.user._id,
      status: 'Safe',
      claimed: true,
      isManaged: false,  // ← Solo = not agency-managed
      houseCode: unitCode,
      lastUpdated: new Date(),
    });

    // Persist houseCode on the User document + flag super-admin rights
    await User.findByIdAndUpdate(req.user._id, {
      houseCode: unit.unitCode,
      isManaged: false,
      isSuperAdmin: true,
    });

    res.status(201).json(toOnboardedPayload(req.user, unit, true));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/units/my ───────────────────────────────────────────────────────
// Returns the unit linked to the current logged-in user
router.get('/my', protect, async (req, res) => {
  try {
    if (!req.user.houseCode) {
      return res.json(null);
    }
    const unit = await Unit.findOne({ unitCode: req.user.houseCode });
    if (!unit) return res.json(null);
    res.json({
      unitCode: unit.unitCode,
      ownerName: unit.ownerName,
      isManaged: unit.isManaged,
      isSuperAdmin: !unit.isManaged,
      status: unit.status,
      claimed: unit.claimed,
      lastUpdated: unit.lastUpdated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
