const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Device = require('../models/Device');
const HouseState = require('../models/HouseState');
const { protect } = require('../middlewares/auth');
const { aedes } = require('../broker');
const { emitDeviceUpdated } = require('../realtime/notifications');

const isGroqConfigured = Boolean(process.env.GROQ_API_KEY);
const groq = isGroqConfigured ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const buildHouseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
};

// Check if a resident can control a specific device
const residentCanControl = (user, device) => {
  if (user.role === 'admin' || user.isSuperAdmin) return true;
  // Resident: can control their assigned room
  const assignedRoom = (user.assignedRoom || '').toLowerCase().trim();
  const deviceRoom = (device.room || '').toLowerCase().trim();
  if (assignedRoom && deviceRoom === assignedRoom) return true;
  // Check granted permissions (e.g. "room:kitchen", "global:controls")
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes('global:controls')) return true;
  if (perms.some(p => p.toLowerCase().includes(deviceRoom))) return true;
  return false;
};

const OPEN_CMDS  = new Set(['OPEN', 'UNLOCK', 'UNLOCKED', 'OPENED']);
const CLOSE_CMDS = new Set(['CLOSE', 'CLOSED', 'LOCK', 'LOCKED']);
const cmdToState = (cmd) => {
  const u = String(cmd || '').toUpperCase();
  if (OPEN_CMDS.has(u))  return 'ON';
  if (CLOSE_CMDS.has(u)) return 'OFF';
  return cmd; // 'ON' or 'OFF' pass through as-is
};

const controlDevice = async (device, command, brightness) => {
  const cmd = brightness !== undefined ? 'setBrightness' : command;
  aedes.publish({
    cmd: 'publish',
    topic: `command/${device.topic}`,
    payload: JSON.stringify(cmd),
    qos: 1, retain: false,
  }, () => {});

  if (cmd === 'toggle') {
    device.state = device.state === 'ON' ? 'OFF' : 'ON';
  } else if (cmd === 'setBrightness') {
    device.brightness = Number(brightness);
    device.state = device.brightness > 0 ? 'ON' : 'OFF';
  } else {
    device.state = cmdToState(cmd);
  }
  if ((device.type === 'light' || device.type === 'lamp') && cmd !== 'setBrightness') {
    device.brightness = device.state === 'ON' ? (device.brightness > 0 ? device.brightness : 100) : 0;
  }
  if (['window', 'blind', 'blinds'].includes(String(device.type || '').toLowerCase())) {
    device.openPct = device.state === 'ON' ? 100 : 0;
  }
  await device.save();
  const full = await Device.findById(device._id).lean();
  emitDeviceUpdated(full || (device.toObject ? device.toObject() : device));
};

// POST /api/companion/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ message: 'AI companion not configured.' });

    const filter = buildHouseFilter(req.user);
    const allDevices = await Device.find(filter).select('name type room state brightness openPct topic houseCode');

    const isAdmin = req.user.role === 'admin' || req.user.isSuperAdmin;
    const assignedRoom = (req.user.assignedRoom || '').trim();

    // Normalize raw DB state to ON/OFF so AI sees what the UI shows
    const normalizeState = (s) => {
      const u = String(s || '').toUpperCase();
      if (['OPEN', 'UNLOCK', 'UNLOCKED', 'OPENED'].includes(u)) return 'ON';
      if (['CLOSE', 'CLOSED', 'LOCK', 'LOCKED'].includes(u)) return 'OFF';
      return u === 'ON' ? 'ON' : 'OFF';
    };

    // Build device list with access flag so AI knows what's allowed
    const deviceList = allDevices.map(d => {
      const canControl = residentCanControl(req.user, d);
      const normState = normalizeState(d.state);
      return `id=${d._id} name="${d.name}" type=${d.type} room="${d.room}" state=${normState} access=${canControl ? 'allowed' : 'denied'}`;
    }).join('\n');

    const houseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const gasState = await HouseState.findOne({ houseCode });
    const gasInfo = gasState
      ? `gasLevel=${gasState.gasLevel} threshold=${gasState.gasThreshold} valve=${gasState.gasValveOpen ? 'open' : 'closed'} emergency=${gasState.emergencyMode}`
      : 'no gas data';
    const dhtInfo = gasState && gasState.temperature != null
      ? `temperature=${gasState.temperature}°C humidity=${gasState.humidity}%`
      : 'no sensor data';

    const accessContext = isAdmin
      ? 'This user is the house owner with full access to all devices.'
      : `This user is a resident. Assigned room: "${assignedRoom || 'none'}". They can only control devices where access=allowed.`;

    const systemPrompt = `You are Melo, a smart home AI companion. Be warm and concise.

${accessContext}

HOME DEVICES:
${deviceList || 'none'}

GAS SENSOR: ${gasInfo}
TEMPERATURE/HUMIDITY: ${dhtInfo}

DEVICE TYPES YOU CAN CONTROL:
- Lights/lamps: commands ON, OFF, or set brightness (number 0-100)
- Doors: command ON = open/unlock, OFF = close/lock, OPEN, CLOSE, LOCK, UNLOCK all accepted
- Windows/blinds: command ON = open, OFF = close
- Any device: toggle
- State ON means the device is active/open/on. State OFF means inactive/closed/off.
- Always execute the user's request even if state already matches — never say "already done" without trying.

Your job: understand what the user wants and reply with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "reply": "your friendly message to the user",
  "actions": [
    { "deviceId": "<exact id from list>", "command": "ON|OFF|OPEN|CLOSE|LOCK|UNLOCK|toggle", "brightness": null }
  ]
}

ACCESS RULES — critical:
- NEVER include devices where access=denied in the actions array.
- If the user asks to control a device where access=denied, set actions=[] and explain in reply: "Sorry, you don't have access to [device/room]. Ask your admin to grant you access."
- If user says "turn off lights" without a room, ask which room first — actions: [].
- If user specifies a room, control ALL matching devices of that type in that room that have access=allowed.
- Use ONLY exact ids from the device list. Never invent ids.
- For gas queries: mention the gas info in reply, actions: [].
- Always respond with valid JSON only.
User's name: ${req.user.name}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    if (!groq) return res.status(503).json({ message: 'AI companion not configured.' });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.3,
      messages,
    });

    let raw = (response.choices[0].message.content || '{}').trim();
    raw = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return res.json({ reply: raw }); }

    const { reply = 'Done!', actions = [] } = parsed;

    // Server-side access enforcement — even if AI ignores the rules
    const results = [];
    for (const action of actions) {
      const id = (action.deviceId || '').toString().trim();
      if (!id) continue;
      const device = allDevices.find(d => d._id.toString() === id);
      if (!device) continue;
      if (!residentCanControl(req.user, device)) continue; // silently skip denied devices
      try {
        await controlDevice(device, action.command, action.brightness ?? undefined);
        results.push(device.name);
      } catch (e) {
        console.error('[Companion] controlDevice error:', e.message);
      }
    }

    res.json({ reply, actionsExecuted: results.length > 0 });
  } catch (err) {
    console.error('[Companion]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
