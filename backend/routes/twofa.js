const express   = require('express');
const router    = express.Router();
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const { protect } = require('../middlewares/auth');

const toAuthPayload = (user) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role === 'user' ? 'resident' : user.role,
    status: user.status || 'active',
    houseCode: user.houseCode || '',
    linkedAdmin: user.linkedAdmin || null,
    assignedRoom: user.assignedRoom,
    permissions: user.permissions || [],
    roomRequest: user.roomRequest,
    isManaged: user.isManaged ?? null,
    isSuperAdmin: user.isSuperAdmin ?? false,
    avatar: user.avatar || null,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    token,
  };
};

// POST /api/2fa/setup — generate secret + QR code
router.post('/setup', protect, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `SmartHome (${req.user.email})`,
      length: 20,
    });
    // Store temp secret on user (not yet confirmed)
    await User.findByIdAndUpdate(req.user._id, { twoFactorTempSecret: secret.base32 });
    const qr = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/2fa/enable — verify code and enable 2FA
router.post('/enable', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorTempSecret');
    if (!user.twoFactorTempSecret) return res.status(400).json({ message: 'Setup 2FA first.' });
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: String(code),
      window: 1,
    });
    if (!valid) return res.status(400).json({ message: 'Invalid code. Try again.' });
    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: user.twoFactorTempSecret,
      twoFactorEnabled: true,
      twoFactorTempSecret: null,
    });
    res.json({ message: '2FA enabled successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/2fa/disable — disable 2FA
router.post('/disable', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled.' });
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1,
    });
    if (!valid) return res.status(400).json({ message: 'Invalid code.' });
    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    });
    res.json({ message: '2FA disabled.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/2fa/verify — verify code at login using tempToken, returns full auth payload
router.post('/verify', async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ message: 'Temp token required.' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    if (!decoded.twofa) return res.status(400).json({ message: 'Invalid token type.' });

    const user = await User.findById(decoded.id).select('+twoFactorSecret +avatar');
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: 'User not found or 2FA not enabled.' });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1,
    });
    if (!valid) return res.status(400).json({ message: 'Invalid 2FA code.' });

    res.json(toAuthPayload(user));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
