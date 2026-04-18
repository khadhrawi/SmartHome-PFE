const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { protect, admin } = require('../middlewares/auth');

const buildHouseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
};

// @route   GET /api/devices
// @desc    Get all devices
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const devices = await Device.find(buildHouseFilter(req.user));
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/devices
// @desc    Register a new device
// @access  Private
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, type, topic, room, position } = req.body;
    
    // Check if topic exists
    const existing = await Device.findOne({ topic });
    if(existing) {
       return res.status(400).json({ message: 'A device with this topic already exists' });
    }

    const device = new Device({
      name,
      type,
      topic,
      room: room || 'Home',
      position: {
        x: Number(position?.x ?? 50),
        y: Number(position?.y ?? 50),
      },
      owner: req.user._id,
      houseCode: String(req.user?.houseCode || '').trim().toUpperCase(),
      state: 'OFF',
      brightness: 0,
    });

    const createdDevice = await device.save();
    res.status(201).json(createdDevice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/devices/:id
// @desc    Delete a device
// @access  Private
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const device = await Device.findOne({ ...buildHouseFilter(req.user), _id: req.params.id });

    if (device) {
      await device.deleteOne();
      res.json({ message: 'Device removed' });
    } else {
      res.status(404).json({ message: 'Device not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/devices/:id/command
// @desc    Send command to device via MQTT (mock api trigger)
// @access  Private
router.put('/:id/command', protect, async (req, res) => {
  try {
     const { command } = req.body;
    const device = await Device.findOne({ ...buildHouseFilter(req.user), _id: req.params.id });
     
    if (device) {
        const { aedes } = require('../broker');
        aedes.publish({
           cmd: 'publish',
           topic: `command/${device.topic}`,
           payload: JSON.stringify(command),
           qos: 1,
           retain: false
        }, () => {
           console.log(`[MQTT] Published command to command/${device.topic}`);
        });

      device.state = command;
      if (device.type === 'light' || device.type === 'lamp') {
       device.brightness = command === 'ON' ? (device.brightness > 0 ? device.brightness : 100) : 0;
      }
      await device.save();

        res.json({ message: 'Command sent' });
     } else {
      res.status(404).json({ message: 'Device not found' });
     }
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
});

module.exports = router;
