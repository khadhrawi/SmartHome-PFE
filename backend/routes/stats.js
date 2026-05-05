const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const User = require('../models/User');
const Message = require('../models/Message');
const { protect, admin } = require('../middlewares/auth');

// GET /api/stats — live house stats for admin dashboard
router.get('/', protect, admin, async (req, res) => {
  try {
    const houseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const filter = houseCode ? { houseCode } : { owner: req.user._id };

    const [devices, residents, unreadMessages] = await Promise.all([
      Device.find(filter).lean(),
      User.countDocuments({ houseCode, role: 'resident' }),
      Message.countDocuments({ houseCode, status: 'unread' }),
    ]);

    const activeDevices = devices.filter(d => d.state === 'ON').length;
    const lightsOn = devices.filter(d => ['light','lamp'].includes(String(d.type||'').toLowerCase()) && d.state === 'ON').length;
    const doorsOpen = devices.filter(d => d.type === 'door' && d.state === 'ON').length;

    res.json({
      totalDevices: devices.length,
      activeDevices,
      lightsOn,
      doorsOpen,
      residents,
      unreadMessages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
