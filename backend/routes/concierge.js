const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const { conciergeEmitter, isHouseAdminOnline } = require('../realtime/notifications');

const CONCIERGE_CODE = process.env.CONCIERGE_CODE || 'concierge2024';

const validateCode = (code) => {
  if (!code) return false;
  return String(code).trim() === CONCIERGE_CODE;
};

// POST /api/concierge/token — simple validation endpoint
router.post('/token', (req, res) => {
  const { code } = req.body || {};
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });
  return res.json({ ok: true });
});

// GET /api/concierge/houses?code=... — returns list of admin houses and status
router.get('/houses', async (req, res) => {
  const code = req.query.code || req.headers['x-concierge-code'];
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });

  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).select('houseCode name createdAt');
    const list = (admins || []).map((a, idx) => {
      const houseCode = a.houseCode || `U${idx}`;
      return {
        houseCode,
        houseNumber: 1001 + idx,
        ownerName: a.name || 'House Admin',
        online: isHouseAdminOnline(houseCode),
        createdAt: a.createdAt,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/concierge/messages?code=... — all messages across all houses
router.get('/messages', async (req, res) => {
  const code = req.query.code || req.headers['x-concierge-code'];
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });

  try {
    const { status } = req.query;
    const query = {};
    if (status && ['unread','read','in_progress','resolved'].includes(status)) query.status = status;
    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(200);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/concierge/messages/:id/reply
router.patch('/messages/:id/reply', async (req, res) => {
  const code = req.query.code || req.headers['x-concierge-code'];
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });
  try {
    const { reply, status } = req.body;
    if (!reply?.trim()) return res.status(400).json({ message: 'Reply text is required.' });
    const VALID = ['unread','read','in_progress','resolved'];
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { adminReply: reply.trim(), repliedAt: new Date(), repliedByName: 'Concierge', status: VALID.includes(status) ? status : 'read' },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/concierge/messages/:id/status
router.patch('/messages/:id/status', async (req, res) => {
  const code = req.query.code || req.headers['x-concierge-code'];
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });
  try {
    const { status } = req.body;
    const VALID = ['unread','read','in_progress','resolved'];
    if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const message = await Message.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/concierge/stream?code=... — SSE stream for real-time updates
router.get('/stream', (req, res) => {
  const code = req.query.code || req.headers['x-concierge-code'];
  if (!validateCode(code)) return res.status(401).json({ message: 'Invalid concierge code' });

  // set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const send = (event, data) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // ignore
    }
  };

  const onUnitUpdated = (unit) => send('unit-updated', unit);
  const onAdminConnected = (payload) => send('admin-connected', payload);
  const onAdminDisconnected = (payload) => send('admin-disconnected', payload);

  conciergeEmitter.on('agency:unit-updated', onUnitUpdated);
  conciergeEmitter.on('admin:connected', onAdminConnected);
  conciergeEmitter.on('admin:disconnected', onAdminDisconnected);

  // keep-alive ping
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (e) {}
  }, 20000);

  req.on('close', () => {
    clearInterval(ping);
    conciergeEmitter.removeListener('agency:unit-updated', onUnitUpdated);
    conciergeEmitter.removeListener('admin:connected', onAdminConnected);
    conciergeEmitter.removeListener('admin:disconnected', onAdminDisconnected);
  });
});

module.exports = router;
