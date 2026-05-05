const express = require('express');
const router  = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, admin } = require('../middlewares/auth');

// GET /api/audit — admin sees their house audit log
router.get('/', protect, admin, async (req, res) => {
  try {
    const { category, limit = 100, page = 1 } = req.query;
    const query = { houseCode: req.user.houseCode };
    if (category) query.category = category;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(query),
    ]);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
