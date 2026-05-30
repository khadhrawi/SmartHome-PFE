require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initNotificationsServer } = require('./realtime/notifications');

// MQTT Broker
const { aedes, mqttServer } = require('./broker');
const ws = require('ws');

// Passport (OAuth — stateless, no session needed)
const passport = require('passport');
require('./routes/oauth'); // registers the GoogleStrategy

// Import Routes
const authRoutes       = require('./routes/auth');
const oauthRoutes      = require('./routes/oauth');
const deviceRoutes     = require('./routes/devices');
const floorPlanRoutes  = require('./routes/floorplan');
const scenarioRoutes   = require('./routes/scenarios');
const permissionRoutes = require('./routes/permissions');
const usersRoutes      = require('./routes/users');
const messagesRoutes   = require('./routes/messages');
const { router: gasRoutes } = require('./routes/gas');
const dhtRoutes             = require('./routes/dht');
const agencyRoutes         = require('./routes/agency');
const unitsRoutes          = require('./routes/units');
const conciergeRoutes      = require('./routes/concierge');
const ownerRequestRoutes   = require('./routes/ownerRequests');
const auditRoutes          = require('./routes/audit');
const twofaRoutes          = require('./routes/twofa');
const statsRoutes          = require('./routes/stats');
const energyRoutes         = require('./routes/energy');
const profileRoutes        = require('./routes/profile');
const companionRoutes      = require('./routes/companion');

const app = express();

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: allow localhost dev + comma-separated FRONTEND_URLS from env (Vercel etc.)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...String(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile apps, curl, ESP32 — no Origin header
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, true); // permissive for dev/demo — tighten in production
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// Global rate limit. Localhost (dev) is exempted; otherwise 2000 req / 15 min per IP.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '::1' || ip === '127.0.0.1' || ip.endsWith('127.0.0.1');
  },
  message: { message: 'Too many requests, please try again later.' },
}));

// Strict limit on auth endpoints: 20 attempts / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
});

// Load API Routes
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/devices',     deviceRoutes);
app.use('/api/floorplan',   floorPlanRoutes);
app.use('/api/scenarios',   scenarioRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/messages',    messagesRoutes);
app.use('/api/gas',         gasRoutes);
app.use('/api/dht',         dhtRoutes);
app.use('/api/agency',      agencyRoutes);
app.use('/api/units',       unitsRoutes);
app.use('/api/concierge',     conciergeRoutes);
app.use('/api/oauth',         oauthRoutes);
app.use('/api/owner-requests', ownerRequestRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/2fa',           twofaRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/energy',        energyRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/companion',     companionRoutes);

// Create HTTP server for Express and WebSockets
const httpServer = http.createServer(app);
initNotificationsServer(httpServer);

// Local MQTT WebSocket bridge — only mounted when running an embedded broker
// (no external MQTT_BROKER_URL). In cloud mode the backend is just an MQTT
// client to HiveMQ, so we don't need to expose /mqtt at all.
const useExternalMqtt = !!process.env.MQTT_BROKER_URL;
if (!useExternalMqtt) {
  const wss = new ws.Server({ noServer: true });
  const wsStream = require('websocket-stream');

  wss.on('connection', function (conn, req) {
    const stream = wsStream(conn);
    aedes.handle(stream);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    if (url === '/mqtt' || url.startsWith('/mqtt?') || url.startsWith('/mqtt/')) {
      wss.handleUpgrade(req, socket, head, (conn) => {
        wss.emit('connection', conn, req);
      });
    }
    // any other path (e.g. /socket.io/) is left alone for Socket.IO to handle
  });
}

// Connect mapping MongoDB and Start Servers
const PORT = process.env.PORT || 5000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;

const startServers = () => {
  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err);
  });

  httpServer.listen(PORT, () => {
    console.log(`HTTP Server listening on port ${PORT}${useExternalMqtt ? ' (cloud MQTT mode)' : ' + MQTT over WS'}`);
  });

  // Embedded MQTT TCP server is only relevant when not using an external broker
  if (!useExternalMqtt && mqttServer && typeof mqttServer.on === 'function') {
    mqttServer.on('error', (err) => {
      console.error('MQTT TCP server error:', err.message);
    });

    mqttServer.listen(MQTT_PORT, () => {
      console.log(`Aedes MQTT TCP Server listening on port ${MQTT_PORT}`);
    });
  }
};

startServers();

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/SmartHome")
  .then(async () => {
    console.log('MongoDB Connected successfully');

    // Auto-verify all admin accounts (admins don't need email verification)
    try {
      const User = require('./models/User');
      const adminFix = await User.updateMany(
        { role: 'admin', isEmailVerified: false },
        { $set: { isEmailVerified: true } }
      );
      if (adminFix.modifiedCount > 0) {
        console.log(`[migrate] Auto-verified ${adminFix.modifiedCount} admin account(s)`);
      }
    } catch (e) {
      console.error('[migrate] Admin verify failed:', e.message);
    }
    // Normalize stale device states (OPEN/CLOSE/LOCK → ON/OFF) and fix window openPct
    try {
      const Device = require('./models/Device');
      const openStates  = ['OPEN', 'UNLOCK', 'UNLOCKED', 'OPENED'];
      const closeStates = ['CLOSE', 'CLOSED', 'LOCK', 'LOCKED'];
      const windowTypes = ['window', 'blind', 'blinds'];
      const [openRes, closeRes, winOnRes, winOffRes] = await Promise.all([
        Device.updateMany({ state: { $in: openStates }  }, { $set: { state: 'ON'  } }),
        Device.updateMany({ state: { $in: closeStates } }, { $set: { state: 'OFF' } }),
        // Fix windows that are ON but openPct is 0
        Device.updateMany({ type: { $in: windowTypes }, state: 'ON',  openPct: 0 }, { $set: { openPct: 100 } }),
        // Fix windows that are OFF but openPct is non-zero
        Device.updateMany({ type: { $in: windowTypes }, state: 'OFF', openPct: { $gt: 0 } }, { $set: { openPct: 0 } }),
      ]);
      const total = openRes.modifiedCount + closeRes.modifiedCount + winOnRes.modifiedCount + winOffRes.modifiedCount;
      if (total > 0) console.log(`[migrate] Fixed ${total} device states/openPct values`);
    } catch (e) {
      console.error('[migrate] State normalization failed:', e.message);
    }

    // Init gas MQTT listener (needs Mongoose ready)
    require('./gasMonitor').init();

    // Init DHT11 temperature/humidity MQTT listener
    require('./dhtMonitor').init();

    // Start scenario scheduler (cron jobs for time-based automations)
    require('./scheduler').initScheduler();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
