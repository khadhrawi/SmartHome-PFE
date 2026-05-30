const express = require('express');
const router = express.Router();
const HouseState = require('../models/HouseState');
const { protect } = require('../middlewares/auth');

const houseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : null;
};

router.get('/state', protect, async (req, res) => {
  try {
    const filter = houseFilter(req.user);
    if (!filter) return res.status(400).json({ message: 'House code required' });

    const state = await HouseState.findOne(filter);
    res.json({
      temperature: state?.temperature ?? null,
      humidity:    state?.humidity    ?? null,
      lastDhtRead: state?.lastDhtRead ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
