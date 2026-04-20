const express = require('express');
const router  = express.Router();
const Message = require('../models/Message');
const { protect, admin } = require('../middlewares/auth');

// ─────────────────────────────────────────────
// POST /api/messages   — authenticated user sends a support request
// ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and message body are required.' });
    }

    const message = await Message.create({
      sender:      req.user._id,
      senderName:  req.user.name,
      senderEmail: req.user.email,
      houseCode:   req.user.houseCode || '',
      subject:     subject.trim(),
      body:        body.trim(),
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages   — admin fetches all support messages
// ─────────────────────────────────────────────
router.get('/', protect, admin, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'name email houseCode')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/mine   — user fetches their own sent messages
// ─────────────────────────────────────────────
router.get('/mine', protect, async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/messages/:id/status   — admin marks message read/resolved
// ─────────────────────────────────────────────
router.patch('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['unread', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
