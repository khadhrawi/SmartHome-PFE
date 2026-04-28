const express = require('express');
const router = express.Router();
const Unit = require('../models/Unit');
const { protect, agencyOnly } = require('../middlewares/auth');

// ── Helpers ──────────────────────────────────────────────────────────────────

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const createUnitCodeCandidate = () => {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const number = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${number}`;
};

const generateUniqueUnitCode = async () => {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = createUnitCodeCandidate();
    const exists = await Unit.exists({ unitCode: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate unique unit code after 1000 attempts');
};

// ── GET /api/agency/units ─────────────────────────────────────────────────────
// Returns all units managed by the agency
router.get('/units', protect, agencyOnly, async (req, res) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 });
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/agency/units/generate ──────────────────────────────────────────
// Generate a new unique house code and save as an Unclaimed Unit
router.post('/units/generate', protect, agencyOnly, async (req, res) => {
  try {
    const unitCode = await generateUniqueUnitCode();
    const unit = await Unit.create({
      unitCode,
      ownerName: 'Unclaimed',
      status: 'Safe',
      claimed: false,
    });
    res.status(201).json(unit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/agency/units/:id ───────────────────────────────────────────────
// Update a unit's status, ownerName, etc.
router.patch('/units/:id', protect, agencyOnly, async (req, res) => {
  try {
    const { status, ownerName, claimed, houseCode } = req.body;
    const update = { lastUpdated: new Date() };
    if (status)    update.status    = status;
    if (ownerName) update.ownerName = ownerName;
    if (claimed !== undefined) update.claimed = claimed;
    if (houseCode) update.houseCode = houseCode;

    const unit = await Unit.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/agency/units/:id ─────────────────────────────────────────────
router.delete('/units/:id', protect, agencyOnly, async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json({ message: 'Unit removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/agency/analytics ─────────────────────────────────────────────────
// Returns aggregated analytics across all units
router.get('/analytics', protect, agencyOnly, async (req, res) => {
  try {
    const units = await Unit.find();
    const total = units.length;
    const safe      = units.filter(u => u.status === 'Safe').length;
    const warning   = units.filter(u => u.status === 'Warning').length;
    const emergency = units.filter(u => u.status === 'Emergency').length;
    const claimed   = units.filter(u => u.claimed).length;
    const unclaimed = units.filter(u => !u.claimed).length;
    res.json({ total, safe, warning, emergency, claimed, unclaimed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
