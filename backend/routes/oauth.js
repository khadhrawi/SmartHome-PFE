const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/oauth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        let user = await User.findOne({ email });

        if (user) {
          // Link googleId if not already linked
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isEmailVerified = true;
            await user.save();
          }
          return done(null, user);
        }

        // New user — create as resident, unverified house assignment (goes through onboarding)
        user = await User.create({
          name: profile.displayName || email.split('@')[0],
          email,
          password: require('crypto').randomBytes(32).toString('hex'), // unusable password
          role: 'resident',
          status: 'active',
          googleId: profile.id,
          isEmailVerified: true, // Google already verified the email
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// Kick off Google OAuth — ?role=admin or ?role=resident stored in state
router.get('/google', (req, res, next) => {
  const role = ['admin', 'resident'].includes(req.query.role) ? req.query.role : 'resident';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role,
    session: false,
  })(req, res, next);
});

// Google callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND}/auth/choose?oauthError=1` }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${FRONTEND}/auth/choose?oauthError=1`);
    }

    // If 2FA is enabled, send a temp token instead and let the frontend handle verification
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, twofa: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      const encoded = encodeURIComponent(JSON.stringify({ requiresTwoFactor: true, tempToken }));
      return res.redirect(`${FRONTEND}/auth/oauth/callback?data=${encoded}`);
    }

    const token = generateToken(user._id);

    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role === 'user' ? 'resident' : user.role,
      status: user.status || 'active',
      houseCode: user.houseCode || '',
      linkedAdmin: user.linkedAdmin || null,
      assignedRoom: user.assignedRoom || '',
      permissions: user.permissions || [],
      isManaged: user.isManaged ?? null,
      isSuperAdmin: user.isSuperAdmin ?? false,
      avatar: user.avatar || null,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      token,
    };

    const encoded = encodeURIComponent(JSON.stringify(payload));
    res.redirect(`${FRONTEND}/auth/oauth/callback?data=${encoded}`);
  })(req, res, next);
});

module.exports = router;
