const express = require('express');
const router = express.Router();
const HouseState = require('../models/HouseState');
const { protect, admin } = require('../middlewares/auth');
const { aedes } = require('../broker');
const { emitGasEmergency } = require('../realtime/notifications');

const GAS_THRESHOLD_DEFAULT = 400; // ppm

const houseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : null;
};

/* ── Shared: publish alarm command to ESP32/buzzer ── */
const triggerHardwareAlarm = (houseCode, active) => {
  const topic = `command/autogen/${String(houseCode).toLowerCase()}/alarm`;
  aedes.publish({
    cmd: 'publish',
    topic,
    payload: JSON.stringify({ alarm: active, ts: Date.now() }),
    qos: 1,
    retain: true,
  });
  console.log(`[GAS] Hardware alarm ${active ? 'ACTIVATED' : 'cleared'} → ${topic}`);
};

/* ── Shared: publish gas valve command ── */
const setGasValve = (houseCode, open) => {
  const topic = `command/autogen/${String(houseCode).toLowerCase()}/gas-valve`;
  aedes.publish({
    cmd: 'publish',
    topic,
    payload: JSON.stringify({ open, ts: Date.now() }),
    qos: 1,
    retain: true,
  });
  console.log(`[GAS] Gas valve ${open ? 'OPENED' : 'CLOSED'} → ${topic}`);
};

/* ─────────────────────────────────────────────────────────────
   GET /api/gas/state
   Returns current gas level, emergency flag, valve state
─────────────────────────────────────────────────────────────── */
router.get('/state', protect, async (req, res) => {
  try {
    const filter = houseFilter(req.user);
    if (!filter) return res.status(400).json({ message: 'House code required' });

    const state = await HouseState.findOne(filter);
    res.json({
      gasLevel:     state?.gasLevel     ?? 0,
      gasThreshold: state?.gasThreshold ?? GAS_THRESHOLD_DEFAULT,
      gasValveOpen: state?.gasValveOpen ?? true,
      emergencyMode: state?.emergencyMode ?? false,
      lastGasAlert:  state?.lastGasAlert  ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/gas/reading  { gasLevel: <number>, houseCode: <string> }
   Called by MQTT handler (internal) or can simulate from test client.
   Checks threshold → sets emergencyMode → triggers alarm → emits socket.
─────────────────────────────────────────────────────────────── */
router.post('/reading', protect, async (req, res) => {
  try {
    const rawLevel = Number(req.body?.gasLevel ?? 0);
    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    if (!normalizedHouseCode) return res.status(400).json({ message: 'House code required' });

    let state = await HouseState.findOne({ houseCode: normalizedHouseCode });
    if (!state) {
      state = await HouseState.create({ houseCode: normalizedHouseCode });
    }

    const threshold = state.gasThreshold ?? GAS_THRESHOLD_DEFAULT;
    const wasEmergency = state.emergencyMode;
    const nowEmergency = rawLevel > threshold;

    state.gasLevel = rawLevel;
    state.emergencyMode = nowEmergency;
    if (nowEmergency && !wasEmergency) {
      state.lastGasAlert = new Date();
    }
    await state.save();

    // Trigger / clear hardware alarm
    if (nowEmergency !== wasEmergency) {
      triggerHardwareAlarm(normalizedHouseCode, nowEmergency);
    }

    // Broadcast to all frontend clients in this house
    emitGasEmergency({
      houseCode: normalizedHouseCode,
      gasLevel: rawLevel,
      threshold,
      emergencyMode: nowEmergency,
      gasValveOpen: state.gasValveOpen,
    });

    res.json({ gasLevel: rawLevel, threshold, emergencyMode: nowEmergency });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/gas/clear-emergency   (admin only)
   Manually clears emergency after safe conditions confirmed.
─────────────────────────────────────────────────────────────── */
router.post('/clear-emergency', protect, admin, async (req, res) => {
  try {
    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    if (!normalizedHouseCode) return res.status(400).json({ message: 'House code required' });

    const state = await HouseState.findOneAndUpdate(
      { houseCode: normalizedHouseCode },
      { $set: { emergencyMode: false } },
      { new: true, upsert: true },
    );

    triggerHardwareAlarm(normalizedHouseCode, false);
    emitGasEmergency({
      houseCode: normalizedHouseCode,
      gasLevel: state.gasLevel ?? 0,
      threshold: state.gasThreshold ?? GAS_THRESHOLD_DEFAULT,
      emergencyMode: false,
      gasValveOpen: state.gasValveOpen,
    });

    res.json({ success: true, emergencyMode: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/gas/threshold   { threshold: <number> }  (admin only)
─────────────────────────────────────────────────────────────── */
router.patch('/threshold', protect, admin, async (req, res) => {
  try {
    const threshold = Math.max(50, Math.min(2000, Number(req.body?.threshold ?? 400)));
    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();

    const state = await HouseState.findOneAndUpdate(
      { houseCode: normalizedHouseCode },
      { $set: { gasThreshold: threshold } },
      { new: true, upsert: true },
    );

    res.json({ gasThreshold: state.gasThreshold });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/gas/valve   { open: boolean }  (admin only)
   Manually open/close the gas valve.
─────────────────────────────────────────────────────────────── */
router.post('/valve', protect, admin, async (req, res) => {
  try {
    const open = Boolean(req.body?.open ?? true);
    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();

    const state = await HouseState.findOneAndUpdate(
      { houseCode: normalizedHouseCode },
      { $set: { gasValveOpen: open } },
      { new: true, upsert: true },
    );

    setGasValve(normalizedHouseCode, open);
    emitGasEmergency({
      houseCode: normalizedHouseCode,
      gasLevel: state.gasLevel ?? 0,
      threshold: state.gasThreshold ?? GAS_THRESHOLD_DEFAULT,
      emergencyMode: state.emergencyMode ?? false,
      gasValveOpen: open,
    });

    res.json({ gasValveOpen: open });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { router, triggerHardwareAlarm, setGasValve };
