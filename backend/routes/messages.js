const express = require('express');
const router  = express.Router();
const { body: vBody } = require('express-validator');
const Message = require('../models/Message');
const { protect, admin } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const VALID_STATUSES = ['unread', 'read', 'in_progress', 'resolved'];

const messageRules = validate([
  vBody('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 120 }).withMessage('Subject too long.'),
  vBody('body').trim().notEmpty().withMessage('Message body is required.').isLength({ max: 2000 }).withMessage('Message too long (max 2000 chars).'),
]);

// POST /api/messages — authenticated user sends a support request
router.post('/', protect, messageRules, async (req, res) => {
  try {
    const { subject, body } = req.body;

    const message = await Message.create({
      sender:      req.user._id,
      senderName:  req.user.name,
      senderEmail: req.user.email,
      houseCode:   req.user.houseCode || '',
      subject:     subject.trim(),
      body:        body.trim(),
    });
    res.status(201).json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages — admin fetches messages for their house
router.get('/', protect, admin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { houseCode: req.user.houseCode };
    if (status && VALID_STATUSES.includes(status)) query.status = status;

    const messages = await Message.find(query)
      .populate('sender', 'name email houseCode role')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages/mine — user fetches their own messages + replies
router.get('/mine', protect, async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/messages/:id/status — admin updates status
router.patch('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, houseCode: req.user.houseCode },
      { status },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/messages/:id/reply — admin replies to a message
router.patch('/:id/reply', protect, admin, async (req, res) => {
  try {
    const { reply, status } = req.body;
    if (!reply?.trim()) return res.status(400).json({ message: 'Reply text is required.' });

    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, houseCode: req.user.houseCode },
      {
        adminReply:    reply.trim(),
        repliedAt:     new Date(),
        repliedBy:     req.user._id,
        repliedByName: req.user.name,
        status:        VALID_STATUSES.includes(status) ? status : 'read',
      },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
