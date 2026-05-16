/**
 * gasMonitor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens on MQTT topic  sensors/{houseCode}/gas
 * Payload expected:  { level: <number_ppm> }  OR  plain number string
 *
 * On every reading:
 *   1. Persists gasLevel to HouseState
 *   2. If level > threshold  → emergencyMode = true, triggers hardware alarm
 *   3. If level safe again   → emergencyMode = false, clears alarm
 *   4. Broadcasts socket event to all house clients via emitGasEmergency()
 *
 * Also applies gas-valve rules per lighting scene:
 *   Morning / Dinner  → valve OPEN  (cooking allowed)
 *   Sleep / Away      → valve CLOSED (safety)
 *   Emergency         → valve CLOSED always
 */

const { aedes }          = require('./broker');
const HouseState         = require('./models/HouseState');
const { emitGasEmergency } = require('./realtime/notifications');

const GAS_SENSOR_TOPIC_PREFIX = 'sensors/';
const GAS_SENSOR_SUFFIX       = '/gas';
const GAS_THRESHOLD_DEFAULT   = 5; // ppm — low for testing (raise to 400 in production)

const VALVE_OPEN_SCENES  = new Set(['Morning', 'Dinner']);
const VALVE_CLOSE_SCENES = new Set(['Sleep', 'Away']);

/* ── Publish hardware alarm command via MQTT ─────────────────────────── */
function triggerHardwareAlarm(houseCode, active) {
  const topic = `command/autogen/${String(houseCode).toLowerCase()}/alarm`;
  try {
    aedes.publish({
      cmd: 'publish',
      topic,
      payload: JSON.stringify({ alarm: active, ts: Date.now() }),
      qos: 1,
      retain: true,
    });
    console.log(`[GAS] Alarm ${active ? 'ACTIVATED 🚨' : 'cleared ✅'} → ${topic}`);
  } catch (e) {
    console.error('[GAS] alarm publish error:', e.message);
  }
}

/* ── Publish gas valve open/close via MQTT ──────────────────────────── */
function setGasValve(houseCode, open) {
  const topic = `command/autogen/${String(houseCode).toLowerCase()}/gas-valve`;
  try {
    aedes.publish({
      cmd: 'publish',
      topic,
      payload: JSON.stringify({ open, ts: Date.now() }),
      qos: 1,
      retain: true,
    });
    console.log(`[GAS] Valve ${open ? 'OPENED 🔓' : 'CLOSED 🔒'} → ${topic}`);
  } catch (e) {
    console.error('[GAS] valve publish error:', e.message);
  }
}

/* ── Gas valve logic per scene ──────────────────────────────────────── */
async function applySceneGasValve(houseCode, scene) {
  const state = await HouseState.findOne({ houseCode });
  if (!state || state.emergencyMode) return; // never re-open during emergency

  const shouldOpen = VALVE_OPEN_SCENES.has(scene);
  if (state.gasValveOpen !== shouldOpen) {
    state.gasValveOpen = shouldOpen;
    await state.save();
    setGasValve(houseCode, shouldOpen);
  }
}

/* ── Core reading handler ────────────────────────────────────────────── */
async function handleGasReading(houseCode, rawLevel) {
  try {
    let state = await HouseState.findOne({ houseCode });
    if (!state) {
      state = await HouseState.create({ houseCode });
    }

    const threshold    = state.gasThreshold ?? GAS_THRESHOLD_DEFAULT;
    const wasEmergency = state.emergencyMode;
    const nowEmergency = rawLevel > threshold;

    state.gasLevel     = rawLevel;
    state.emergencyMode = nowEmergency;

    if (nowEmergency) {
      state.lastGasAlert = new Date();
      state.gasValveOpen = false; // always close valve in emergency
    }

    await state.save();

    // Hardware alarm transitions
    if (nowEmergency && !wasEmergency) {
      triggerHardwareAlarm(houseCode, true);
      setGasValve(houseCode, false);
      console.warn(`[GAS] 🚨 EMERGENCY declared for ${houseCode} — level=${rawLevel} ppm`);
    } else if (!nowEmergency && wasEmergency) {
      triggerHardwareAlarm(houseCode, false);
      console.log(`[GAS] ✅ Emergency cleared for ${houseCode} — level=${rawLevel} ppm`);
    }

    // Broadcast to all clients in this house
    emitGasEmergency({
      houseCode,
      gasLevel:      rawLevel,
      threshold,
      emergencyMode: nowEmergency,
      gasValveOpen:  state.gasValveOpen,
    });
  } catch (err) {
    console.error('[GAS] handleGasReading error:', err.message);
  }
}

/* ── Subscribe to MQTT gas sensor topics ────────────────────────────── */
function init() {
  aedes.on('publish', async (packet, client) => {
    if (!client) return; // skip server-generated messages
    const topic = String(packet.topic || '');

    // Match: sensors/<houseCode>/gas
    if (!topic.startsWith(GAS_SENSOR_TOPIC_PREFIX) || !topic.endsWith(GAS_SENSOR_SUFFIX)) return;

    const parts     = topic.split('/');
    if (parts.length < 3) return;
    const houseCode = parts[1].toUpperCase();

    let rawLevel = 0;
    try {
      const raw = packet.payload.toString();
      const parsed = JSON.parse(raw);
      rawLevel = Number(parsed?.level ?? parsed?.value ?? parsed ?? 0);
    } catch {
      rawLevel = Number(packet.payload.toString()) || 0;
    }

    if (!Number.isFinite(rawLevel)) return;
    await handleGasReading(houseCode, rawLevel);
  });

  console.log('[GAS] 🔍 Gas sensor monitor active — listening on sensors/<houseCode>/gas');
}

module.exports = { init, applySceneGasValve, triggerHardwareAlarm, setGasValve };
