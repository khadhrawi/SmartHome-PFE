const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { protect } = require('../middlewares/auth');

// @route   GET /api/devices
// @desc    Get all devices
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.user._id });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/devices
// @desc    Register a new device
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, type, topic } = req.body;
    
    // Check if topic exists
    const existing = await Device.findOne({ topic });
    if(existing) {
       return res.status(400).json({ message: 'A device with this topic already exists' });
    }

    const device = new Device({
      name,
      type,
      topic,
      owner: req.user._id,
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
router.delete('/:id', protect, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (device && device.owner.toString() === req.user._id.toString()) {
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
     const device = await Device.findById(req.params.id);
     
     if (device && device.owner.toString() === req.user._id.toString()) {
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

        res.json({ message: 'Command sent' });
     } else {
        res.status(404).json({ message: 'Device not found or not owned by you' });
     }
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
});

module.exports = router;
