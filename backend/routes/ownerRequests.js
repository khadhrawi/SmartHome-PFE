const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const HouseOwnerRequest = require('../models/HouseOwnerRequest');
const { protect, agencyOnly } = require('../middlewares/auth');
const { sendOwnerApprovalEmail, sendOwnerRejectionEmail } = require('../utils/email');

// POST /api/owner-requests — anyone submits a request to become a house owner
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, note } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await HouseOwnerRequest.findOne({ email: email.toLowerCase(), status: 'pending' });
    if (existing) {
      return res.status(409).json({ message: 'A pending request already exists for this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await HouseOwnerRequest.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      note: note || '',
    });

    res.status(201).json({ message: 'Request submitted. You will receive an email once approved.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner-requests — admin (agency) sees all requests
router.get('/', protect, agencyOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await HouseOwnerRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/owner-requests/:id/approve — admin approves, generates unique code, emails it
router.patch('/:id/approve', protect, agencyOnly, async (req, res) => {
  try {
    const request = await HouseOwnerRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'pending') return res.status(409).json({ message: 'Request already reviewed.' });

    const accessCode = HouseOwnerRequest.generateAccessCode();
    request.status = 'approved';
    request.accessCode = accessCode;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    await sendOwnerApprovalEmail(request.email, request.name, accessCode);

    res.json({ message: 'Approved. Access code sent to applicant.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/owner-requests/:id/reject — admin rejects
router.patch('/:id/reject', protect, agencyOnly, async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const request = await HouseOwnerRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'pending') return res.status(409).json({ message: 'Request already reviewed.' });

    request.status = 'rejected';
    request.reviewNote = reviewNote || '';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    await sendOwnerRejectionEmail(request.email, request.name, reviewNote);

    res.json({ message: 'Request rejected.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
