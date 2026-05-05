const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');

// Memory storage — we convert to base64 and store in Mongo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

// POST /api/profile/avatar — upload or replace avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: base64 },
      { new: true, select: '-password -twoFactorSecret -twoFactorTempSecret' }
    );

    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/profile/avatar — remove avatar
router.delete('/avatar', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { avatar: null });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/profile/me — return current user profile (includes avatar)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -twoFactorSecret -twoFactorTempSecret');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
