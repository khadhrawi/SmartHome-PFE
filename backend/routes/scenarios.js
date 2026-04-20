const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const Device = require('../models/Device');
const HouseState = require('../models/HouseState');
const { protect } = require('../middlewares/auth');
const { emitDashboardStateUpdated } = require('../realtime/notifications');

/* ── Scene brightness presets (mirrors floorplan.js) ── */
const VALID_SCENES = ['Morning', 'Dinner', 'Cinematic', 'Sleep'];

const MODE_ROOM_BRIGHTNESS = {
  Cinematic: { living_room: 10, kitchen: 10, bedroom: 8,   bathroom: 14, utility: 14, garage: 18 },
  Dinner:    { living_room: 75, kitchen: 75, bedroom: 35,  bathroom: 55, utility: 55, garage: 70 },
  Morning:   { living_room: 100, kitchen: 100, bedroom: 100, bathroom: 100, utility: 100, garage: 95 },
  Sleep:     { living_room: 25, kitchen: 22, bedroom: 3,   bathroom: 18, utility: 18, garage: 10 },
};

const normalizeRoom = (room) => {
  const l = String(room || '').trim().toLowerCase();
  if (l === 'living room' || l === 'studio') return 'living_room';
  if (l === 'kitchenette') return 'kitchen';
  return l || 'living_room';
};

const houseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
};

// @route   POST /api/scenarios/activate
// @desc    Activate a named scene (Morning, Dinner, Cinematic, Sleep)
// @access  Private (admin)
router.post('/activate', protect, async (req, res) => {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can activate scenes' });
    }

    const { scene } = req.body;
    if (!scene || !VALID_SCENES.includes(scene)) {
      return res.status(400).json({
        message: `Invalid scene. Valid options are: ${VALID_SCENES.join(', ')}`,
      });
    }

    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const filter = houseFilter(req.user);

    // ── 1. Update HouseState lighting mode ──
    let houseState = await HouseState.findOne({ houseCode: normalizedHouseCode });
    if (houseState) {
      houseState.lightingMode = scene;
      houseState.updatedBy = req.user._id;
      await houseState.save();
    } else if (normalizedHouseCode) {
      houseState = await HouseState.create({
        houseCode: normalizedHouseCode,
        lightingMode: scene,
        updatedBy: req.user._id,
      });
    }

    // ── 2. Bulk-update all light devices with scene brightness ──
    const roomBrightness = MODE_ROOM_BRIGHTNESS[scene];
    const lights = await Device.find({ ...filter, type: { $in: ['light', 'lamp'] } });

    if (lights.length > 0) {
      await Device.bulkWrite(
        lights.map((device) => {
          const room = normalizeRoom(device.room);
          const brightness = Number(roomBrightness[room] ?? 45);
          return {
            updateOne: {
              filter: { _id: device._id },
              update: { $set: { brightness, state: brightness > 0 ? 'ON' : 'OFF' } },
            },
          };
        }),
      );
    }

    // ── 3. Broadcast updated state to all connected clients ──
    const allDevices = await Device.find(filter).sort({ createdAt: 1 });
    emitDashboardStateUpdated({
      houseCode: normalizedHouseCode,
      payload: {
        lightingMode: scene,
        lockdownMode: !!houseState?.lockdownMode,
        awayMode: !!houseState?.awayMode,
        devices: allDevices.map((d) => ({
          _id: d._id,
          name: d.name,
          type: String(d.type || '').toLowerCase(),
          topic: d.topic,
          room: normalizeRoom(d.room),
          state: d.state === 'ON' ? 'ON' : 'OFF',
          brightness: Number.isFinite(d.brightness) ? d.brightness : 100,
          color: String(d.color || '#ffc87a'),
          position: { x: Number(d.position?.x ?? 50), y: Number(d.position?.y ?? 50) },
        })),
      },
    });

    res.json({ success: true, scene, devicesUpdated: lights.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/scenarios
// @desc    Get all user scenarios
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const scenarios = await Scenario.find({ owner: req.user._id })
                              .populate('targetDevice');
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/scenarios
// @desc    Create a new scenario
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, trigger, action, active } = req.body;

    const scenario = new Scenario({
      name,
      description,
      trigger,
      action,
      active: active !== undefined ? active : true,
      owner: req.user._id,
    });

    const createdScenario = await scenario.save();
    res.status(201).json(createdScenario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/scenarios/:id
// @desc    Delete a scenario
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id);

    if (scenario && scenario.owner.toString() === req.user._id.toString()) {
      await scenario.deleteOne();
      res.json({ message: 'Scenario removed' });
    } else {
      res.status(404).json({ message: 'Scenario not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
