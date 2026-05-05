const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Device = require('../models/Device');
const { protect, admin } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { emitDeviceUpdated } = require('../realtime/notifications');
const { logAudit } = require('../utils/audit');

const VALID_TYPES = ['sensor','actuator','camera','other','light','door','lamp','lock','ac','climate','tv','television','machine','washer','washing_machine','window','blind','blinds','gas_sensor','gas-sensor'];

const deviceCreateRules = validate([
  body('name').trim().notEmpty().withMessage('Device name is required.').isLength({ max: 60 }).withMessage('Name too long.'),
  body('type').trim().notEmpty().withMessage('Device type is required.').isIn(VALID_TYPES).withMessage('Invalid device type.'),
  body('topic').trim().notEmpty().withMessage('MQTT topic is required.').matches(/^[a-zA-Z0-9/_-]+$/).withMessage('Topic can only contain letters, numbers, /, _, -'),
]);

const buildHouseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
};

// GET /api/devices
router.get('/', protect, async (req, res) => {
  try {
    const devices = await Device.find(buildHouseFilter(req.user));
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/devices
router.post('/', protect, admin, deviceCreateRules, async (req, res) => {
  try {
    const { name, type, topic, room, position } = req.body;
    const existing = await Device.findOne({ topic });
    if (existing) return res.status(400).json({ message: 'A device with this topic already exists' });

    const device = new Device({
      name, type, topic,
      room: room || 'Home',
      position: { x: Number(position?.x ?? 50), y: Number(position?.y ?? 50) },
      owner: req.user._id,
      houseCode: String(req.user?.houseCode || '').trim().toUpperCase(),
      state: 'OFF',
      brightness: 0,
    });

    const created = await device.save();
    logAudit({ req, action: `Device added: ${name}`, category: 'device', details: `Type: ${type}, Room: ${room || 'Home'}` });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/devices/:id
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const device = await Device.findOne({ ...buildHouseFilter(req.user), _id: req.params.id });
    if (device) {
      logAudit({ req, action: `Device removed: ${device.name}`, category: 'device', details: `Room: ${device.room}` });
      await device.deleteOne();
      res.json({ message: 'Device removed' });
    } else {
      res.status(404).json({ message: 'Device not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/devices/:id/command  (also aliased as PATCH for ResidentRoom)
const handleCommand = async (req, res) => {
  try {
    const { command, value } = req.body;
    const device = await Device.findOne({ ...buildHouseFilter(req.user), _id: req.params.id });
    if (!device) return res.status(404).json({ message: 'Device not found' });

    // Residents can only control devices in their assigned room
    if (req.user.role === 'resident' && req.user.assignedRoom) {
      const assignedRoom = req.user.assignedRoom.toLowerCase().trim();
      const deviceRoom   = (device.room || '').toLowerCase().trim();
      if (assignedRoom && deviceRoom !== assignedRoom) {
        return res.status(403).json({ message: 'You can only control devices in your assigned room.' });
      }
    }

    const { aedes } = require('../broker');
    aedes.publish({
      cmd: 'publish',
      topic: `command/${device.topic}`,
      payload: JSON.stringify(command),
      qos: 1,
      retain: false,
    }, () => {});

    // Apply state changes
    if (command === 'toggle') {
      device.state = device.state === 'ON' ? 'OFF' : 'ON';
    } else if (command === 'setBrightness' && value !== undefined) {
      device.brightness = Number(value);
      if (device.brightness > 0) device.state = 'ON';
    } else {
      device.state = command;
    }

    if ((device.type === 'light' || device.type === 'lamp') && command !== 'setBrightness') {
      device.brightness = device.state === 'ON' ? (device.brightness > 0 ? device.brightness : 100) : 0;
    }

    await device.save();

    // Real-time broadcast to all house members
    emitDeviceUpdated(device.toObject ? device.toObject() : device);

    // Audit log
    logAudit({
      req,
      action: `Device command: ${device.name} → ${command === 'setBrightness' ? `brightness ${value}%` : command}`,
      category: 'device',
      details: `Room: ${device.room}, State: ${device.state}`,
    });

    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.put('/:id/command', protect, handleCommand);
router.patch('/:id/command', protect, handleCommand);

module.exports = router;
