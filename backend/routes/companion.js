const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Device = require('../models/Device');
const HouseState = require('../models/HouseState');
const { protect } = require('../middlewares/auth');
const { aedes } = require('../broker');
const { emitDeviceUpdated } = require('../realtime/notifications');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const buildHouseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
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
    device.state = cmd;
  }
  if ((device.type === 'light' || device.type === 'lamp') && cmd !== 'setBrightness') {
    device.brightness = device.state === 'ON' ? (device.brightness > 0 ? device.brightness : 100) : 0;
  }
  await device.save();
  // Re-fetch full device to ensure houseCode is present for socket emit
  const full = await Device.findById(device._id).lean();
  if (full) emitDeviceUpdated(full);
  else emitDeviceUpdated(device.toObject ? device.toObject() : device);
};

// POST /api/companion/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ message: 'AI companion not configured.' });

    const filter = buildHouseFilter(req.user);
    const devices = await Device.find(filter).select('name type room state brightness topic houseCode');

    const deviceList = devices.map(d =>
      `id=${d._id} name="${d.name}" type=${d.type} room="${d.room}" state=${d.state}`
    ).join('\n');

    const houseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const gasState = await HouseState.findOne({ houseCode });
    const gasInfo = gasState
      ? `gasLevel=${gasState.gasLevel} threshold=${gasState.gasThreshold} valve=${gasState.gasValveOpen ? 'open' : 'closed'} emergency=${gasState.emergencyMode}`
      : 'no gas data';

    const systemPrompt = `You are Melo, a smart home AI companion. Be warm and concise.

HOME DEVICES:
${deviceList || 'none'}

GAS SENSOR: ${gasInfo}

Your job: understand what the user wants and reply with a JSON object in this exact format (no markdown, no extra text):
{
  "reply": "your friendly message to the user",
  "actions": [
    { "deviceId": "<exact id from device list>", "command": "ON|OFF|OPEN|CLOSE|LOCK|UNLOCK|toggle", "brightness": <number or null> }
  ]
}

Rules:
- "actions" can be empty array [] if no device control needed.
- If user says "turn off lights" without a room, ask which room — actions: [].
- If user says "turn off kitchen lights", include ALL matching kitchen light/lamp device ids in actions.
- Use ONLY the exact ids from the HOME DEVICES list above. Never invent ids.
- For gas alerts: mention gas info in reply, actions: [].
- Always respond with valid JSON only. No extra explanation outside the JSON.
User's name: ${req.user.name}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.3,
      messages,
    });

    let raw = response.choices[0].message.content || '{}';

    // Strip markdown code fences if model wraps in ```json
    raw = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ reply: raw });
    }

    const { reply = 'Done!', actions = [] } = parsed;

    // Execute actions server-side
    const results = [];
    console.log('[Companion] actions:', JSON.stringify(actions));
    console.log('[Companion] available device ids:', devices.map(d => d._id.toString()));
    for (const action of actions) {
      const id = (action.deviceId || '').toString().trim();
      if (!id) continue;
      const device = devices.find(d => d._id.toString() === id);
      console.log(`[Companion] action id="${id}" matched=${device?.name || 'NONE'}`);
      if (!device) { results.push(`Device ${id} not found`); continue; }
      try {
        await controlDevice(device, action.command, action.brightness ?? undefined);
        results.push(`${device.name} → ${action.command}`);
      } catch (e) {
        results.push(`${device.name} error: ${e.message}`);
      }
    }

    res.json({ reply, actionsExecuted: results.length > 0 });
  } catch (err) {
    console.error('[Companion]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
