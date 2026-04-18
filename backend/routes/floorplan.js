const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const HouseState = require('../models/HouseState');
const PermissionRequest = require('../models/PermissionRequest');
const { protect, admin } = require('../middlewares/auth');
const { aedes } = require('../broker');
const { emitDashboardStateUpdated } = require('../realtime/notifications');

const ROOM_KEYS = ['bathroom', 'utility', 'bedroom', 'kitchen', 'living_room', 'garage'];

const MODE_ROOM_BRIGHTNESS = {
  Cinematic: {
    living_room: 10,
    kitchen: 10,
    bedroom: 8,
    bathroom: 14,
    utility: 14,
    garage: 18,
  },
  Dinner: {
    living_room: 75,
    kitchen: 75,
    bedroom: 35,
    bathroom: 55,
    utility: 55,
    garage: 70,
  },
  Morning: {
    living_room: 100,
    kitchen: 100,
    bedroom: 100,
    bathroom: 100,
    utility: 100,
    garage: 95,
  },
  Sleep: {
    living_room: 25,
    kitchen: 22,
    bedroom: 3,
    bathroom: 18,
    utility: 18,
    garage: 10,
  },
};

const defaultPositions = [
  { x: 20, y: 22 },
  { x: 40, y: 28 },
  { x: 62, y: 24 },
  { x: 74, y: 45 },
  { x: 50, y: 58 },
  { x: 30, y: 62 },
  { x: 16, y: 48 },
];

const ROOM_DEFAULT_POSITION = {
  bathroom: { x: 14, y: 14 },
  utility: { x: 31, y: 14 },
  bedroom: { x: 20, y: 46 },
  kitchen: { x: 52, y: 16 },
  living_room: { x: 52, y: 48 },
  garage: { x: 82, y: 42 },
};

const AUTO_DEVICE_TEMPLATES = [
  {
    key: 'bathroom-light',
    name: 'Bathroom Light',
    type: 'light',
    room: 'bathroom',
    position: { x: 14, y: 14 },
  },
  {
    key: 'utility-light',
    name: 'Utility Light',
    type: 'light',
    room: 'utility',
    position: { x: 31, y: 14 },
  },
  {
    key: 'utility-machine',
    name: 'Utility Machine',
    type: 'machine',
    room: 'utility',
    position: { x: 35, y: 20 },
  },
  {
    key: 'bedroom-light',
    name: 'Bedroom Light',
    type: 'light',
    room: 'bedroom',
    position: { x: 20, y: 46 },
  },
  {
    key: 'kitchen-light',
    name: 'Kitchen Light',
    type: 'light',
    room: 'kitchen',
    position: { x: 52, y: 16 },
  },
  {
    key: 'living-room-main-light',
    name: 'Living Room Main Light',
    type: 'light',
    room: 'living_room',
    position: { x: 49, y: 40 },
  },
  {
    key: 'living-room-tv',
    name: 'Living Room TV',
    type: 'tv',
    room: 'living_room',
    position: { x: 56, y: 46 },
  },
  {
    key: 'living-room-internal-door',
    name: 'Living Room Internal Door',
    type: 'door',
    room: 'living_room',
    position: { x: 44, y: 55 },
  },
  {
    key: 'garage-light',
    name: 'Garage Light',
    type: 'light',
    room: 'garage',
    position: { x: 80, y: 24 },
  },
  {
    key: 'garage-door',
    name: 'Garage Door',
    type: 'door',
    room: 'garage',
    position: { x: 94, y: 46 },
  },
  {
    key: 'main-entrance-door',
    name: 'Main Entrance Door',
    type: 'door',
    room: 'living_room',
    position: { x: 43, y: 45 },
  },
];

const normalizeType = (type) => {
  if (!type) return 'other';
  const lowered = String(type).toLowerCase();
  if (['lamp', 'light'].includes(lowered)) return 'light';
  if (['door', 'lock'].includes(lowered)) return 'door';
  if (['tv', 'television'].includes(lowered)) return 'tv';
  if (['ac', 'climate'].includes(lowered)) return 'ac';
  if (['machine', 'washer', 'washing_machine', 'washing-machine'].includes(lowered)) return 'machine';
  return lowered;
};

const normalizeRoom = (room) => {
  const lowered = String(room || '').trim().toLowerCase();
  if (!lowered) return 'living_room';
  if (ROOM_KEYS.includes(lowered)) return lowered;
  if (lowered === 'kitchenette') return 'kitchen';
  if (lowered === 'living room') return 'living_room';
  if (lowered === 'studio') return 'living_room';
  return 'living_room';
};

const normalizePermissionRoom = (value) => {
  const lowered = String(value || '').trim().toLowerCase();
  if (!lowered) return '';
  if (lowered.startsWith('room:')) {
    return normalizeRoom(lowered.slice(5));
  }
  return normalizeRoom(lowered);
};

const getResidentAssignedRooms = (user) => {
  const rooms = new Set();
  const assignedRoom = normalizeRoom(user?.assignedRoom);
  if (assignedRoom) {
    rooms.add(assignedRoom);
  }

  (Array.isArray(user?.permissions) ? user.permissions : []).forEach((permission) => {
    const normalized = normalizePermissionRoom(permission);
    if (normalized) {
      rooms.add(normalized);
    }
  });

  return rooms;
};

const hasApprovedRoomAccess = async (user, room) => {
  if (!user || String(user.role || '').toLowerCase() === 'admin') {
    return true;
  }

  const normalizedRoom = normalizeRoom(room);
  if (!normalizedRoom) {
    return false;
  }

  const assignedRooms = getResidentAssignedRooms(user);
  if (assignedRooms.has(normalizedRoom)) {
    return true;
  }

  const approvedRequest = await PermissionRequest.exists({
    requester: user._id,
    room: normalizedRoom,
    status: 'approved',
  });

  return !!approvedRequest;
};

const ensureHouseState = async (houseCode, updatedBy = null) => {
  const normalized = String(houseCode || '').trim().toUpperCase();
  if (!normalized) return null;
  const existing = await HouseState.findOne({ houseCode: normalized });
  if (existing) return existing;
  return HouseState.create({ houseCode: normalized, updatedBy });
};

const houseFilter = (user) => {
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  return houseCode ? { houseCode } : { owner: user._id };
};

const autoTopic = (houseCode, key) => {
  return `autogen/${String(houseCode || '').toLowerCase()}/${key}`;
};

const ensureRequiredHouseDevices = async ({ user }) => {
  const normalizedHouseCode = String(user?.houseCode || '').trim().toUpperCase();
  if (!normalizedHouseCode) return;
  if (String(user?.role || '').toLowerCase() !== 'admin') return;

  const filter = houseFilter(user);
  const existingDevices = await Device.find(filter).select('_id topic');
  const existingTopics = new Set(existingDevices.map((device) => String(device.topic || '').trim()));

  const missingTemplates = AUTO_DEVICE_TEMPLATES.filter(
    (template) => !existingTopics.has(autoTopic(normalizedHouseCode, template.key)),
  );

  if (missingTemplates.length === 0) return;

  await Device.insertMany(
    missingTemplates.map((template) => ({
      name: template.name,
      type: template.type,
      room: template.room,
      topic: autoTopic(normalizedHouseCode, template.key),
      owner: user._id,
      houseCode: normalizedHouseCode,
      state: 'OFF',
      brightness: 0,
      position: {
        x: Number(template.position?.x ?? 50),
        y: Number(template.position?.y ?? 50),
      },
    })),
    { ordered: false },
  );
};

const serializeDevice = (device) => ({
  _id: device._id,
  name: device.name,
  type: normalizeType(device.type),
  topic: device.topic,
  room: normalizeRoom(device.room),
  state: device.state === 'ON' ? 'ON' : 'OFF',
  brightness: Number.isFinite(device.brightness) ? device.brightness : 100,
  color: String(device.color || '#ffc87a'),
  position: {
    x: Number(device.position?.x ?? 50),
    y: Number(device.position?.y ?? 50),
  },
  status: device.status,
});

const broadcastHouseState = async ({ user }) => {
  const filter = houseFilter(user);
  const devices = await Device.find(filter).sort({ createdAt: 1 });
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();
  const state = houseCode ? await ensureHouseState(houseCode, user._id) : null;

  emitDashboardStateUpdated({
    houseCode,
    payload: {
      lightingMode: state?.lightingMode || null,
      lockdownMode: !!state?.lockdownMode,
      awayMode: !!state?.awayMode,
      devices: devices.map(serializeDevice),
    },
  });
};

router.get('/state', protect, async (req, res) => {
  try {
    await ensureRequiredHouseDevices({ user: req.user });

    const filter = houseFilter(req.user);
    const devices = await Device.find(filter).sort({ createdAt: 1 });

    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const state = normalizedHouseCode ? await ensureHouseState(normalizedHouseCode, req.user._id) : null;

    res.json({
      lightingMode: state?.lightingMode || null,
      lockdownMode: !!state?.lockdownMode,
      awayMode: !!state?.awayMode,
      devices: devices.map((device, index) => {
        if (!device.position) {
          const roomKey = normalizeRoom(device.room);
          const fallback = ROOM_DEFAULT_POSITION[roomKey] || defaultPositions[index % defaultPositions.length];
          return {
            ...serializeDevice(device),
            position: fallback,
          };
        }
        return serializeDevice(device);
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/modes', protect, async (req, res) => {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update security modes' });
    }

    const normalizedHouseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    if (!normalizedHouseCode) {
      return res.status(400).json({ message: 'House code is required to update modes' });
    }

    const { lightingMode, lockdownMode, awayMode } = req.body || {};
    const state = await ensureHouseState(normalizedHouseCode, req.user._id);

    if (lightingMode !== undefined) {
      state.lightingMode = lightingMode || null;
    }
    if (lockdownMode !== undefined) {
      state.lockdownMode = Boolean(lockdownMode);
    }
    if (awayMode !== undefined) {
      state.awayMode = Boolean(awayMode);
    }

    state.updatedBy = req.user._id;
    await state.save();

    const filter = houseFilter(req.user);

    if (state.lightingMode && MODE_ROOM_BRIGHTNESS[state.lightingMode]) {
      const roomBrightness = MODE_ROOM_BRIGHTNESS[state.lightingMode];
      const lights = await Device.find({ ...filter, type: { $in: ['light', 'lamp'] } });

      if (lights.length > 0) {
        await Device.bulkWrite(
          lights.map((device) => {
            const room = normalizeRoom(device.room);
            const brightness = Number(roomBrightness[room] ?? 45);

            return {
              updateOne: {
                filter: { _id: device._id },
                update: {
                  $set: {
                    brightness,
                    state: brightness > 0 ? 'ON' : 'OFF',
                  },
                },
              },
            };
          }),
        );
      }
    }

    if (state.awayMode) {
      await Device.updateMany(
        { ...filter, type: { $in: ['light', 'lamp'] } },
        { $set: { state: 'OFF', brightness: 0 } },
      );
    }

    await broadcastHouseState({ user: req.user });

    res.json({
      lightingMode: state.lightingMode,
      lockdownMode: state.lockdownMode,
      awayMode: state.awayMode,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id/toggle', protect, async (req, res) => {
  try {
    const filter = houseFilter(req.user);
    const device = await Device.findOne({ ...filter, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const type = normalizeType(device.type);
    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      const allowed = await hasApprovedRoomAccess(req.user, device.room);
      if (!allowed) {
        return res.status(403).json({ message: 'Not authorized to control this room' });
      }
    }

    const nextState = device.state === 'ON' ? 'OFF' : 'ON';
    device.state = nextState;

    if (type === 'light') {
      if (nextState === 'ON') {
        device.brightness = device.brightness > 0 ? device.brightness : 100;
      } else {
        device.brightness = 0;
      }
    }

    await device.save();

    aedes.publish({
      cmd: 'publish',
      topic: `command/${device.topic}`,
      payload: JSON.stringify(nextState),
      qos: 1,
      retain: false,
    });

    await broadcastHouseState({ user: req.user });

    res.json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id/state', protect, async (req, res) => {
  try {
    const filter = houseFilter(req.user);
    const device = await Device.findOne({ ...filter, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      const allowed = await hasApprovedRoomAccess(req.user, device.room);
      if (!allowed) {
        return res.status(403).json({ message: 'Not authorized to control this room' });
      }
    }

    const type = normalizeType(device.type);
    const nextStateRaw = String(req.body?.state || '').toUpperCase();
    const hasState = nextStateRaw === 'ON' || nextStateRaw === 'OFF';

    if (hasState) {
      device.state = nextStateRaw;
    }

    if (type === 'light') {
      if (req.body?.brightness !== undefined) {
        const brightness = Math.max(0, Math.min(100, Number(req.body.brightness || 0)));
        device.brightness = brightness;
        device.state = brightness > 0 ? 'ON' : 'OFF';
      }

      if (typeof req.body?.color === 'string' && req.body.color.trim()) {
        device.color = req.body.color.trim();
      }
    }

    await device.save();

    if (hasState) {
      aedes.publish({
        cmd: 'publish',
        topic: `command/${device.topic}`,
        payload: JSON.stringify(device.state),
        qos: 1,
        retain: false,
      });
    }

    await broadcastHouseState({ user: req.user });
    res.json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id/position', protect, admin, async (req, res) => {
  try {
    const { x, y } = req.body || {};
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
      return res.status(400).json({ message: 'Valid x/y position is required' });
    }

    const filter = houseFilter(req.user);
    const device = await Device.findOne({ ...filter, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.position = {
      x: Math.max(0, Math.min(100, Number(x))),
      y: Math.max(0, Math.min(100, Number(y))),
    };

    await device.save();
    await broadcastHouseState({ user: req.user });

    res.json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id/topic', protect, admin, async (req, res) => {
  try {
    const topic = String(req.body?.topic || '').trim();
    if (!topic) {
      return res.status(400).json({ message: 'MQTT topic is required' });
    }

    const filter = houseFilter(req.user);
    const duplicate = await Device.findOne({ topic, _id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(400).json({ message: 'A device with this topic already exists' });
    }

    const device = await Device.findOne({ ...filter, _id: req.params.id });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.topic = topic;
    await device.save();

    await broadcastHouseState({ user: req.user });

    res.json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/devices', protect, admin, async (req, res) => {
  try {
    const { name, type, room, topic, position } = req.body || {};
    if (!name || !type || !topic) {
      return res.status(400).json({ message: 'name, type and topic are required' });
    }

    const existing = await Device.findOne({ topic });
    if (existing) {
      return res.status(400).json({ message: 'A device with this topic already exists' });
    }

    const houseCode = String(req.user?.houseCode || '').trim().toUpperCase();

    const normalizedRoom = normalizeRoom(room);
    const normalizedType = normalizeType(type);
    const defaultPosition = normalizedType === 'door' && normalizedRoom === 'garage'
      ? { x: 94, y: 46 }
      : ROOM_DEFAULT_POSITION[normalizedRoom] || { x: 52, y: 48 };

    const device = await Device.create({
      name,
      type: normalizedType,
      room: normalizedRoom,
      topic,
      owner: req.user._id,
      houseCode: houseCode || undefined,
      state: 'OFF',
      brightness: 0,
      position: {
        x: Number(position?.x ?? defaultPosition.x),
        y: Number(position?.y ?? defaultPosition.y),
      },
    });

    await broadcastHouseState({ user: req.user });

    res.status(201).json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id/meta', protect, admin, async (req, res) => {
  try {
    const { name, type, room } = req.body || {};
    const filter = houseFilter(req.user);
    const device = await Device.findOne({ ...filter, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (typeof name === 'string' && name.trim()) {
      device.name = name.trim();
    }
    if (typeof type === 'string' && type.trim()) {
      device.type = normalizeType(type);
    }
    if (room !== undefined) {
      device.room = normalizeRoom(room);
    }

    await device.save();
    await broadcastHouseState({ user: req.user });

    res.json(serializeDevice(device));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/devices/:id', protect, admin, async (req, res) => {
  try {
    const filter = houseFilter(req.user);
    const device = await Device.findOne({ ...filter, _id: req.params.id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    await device.deleteOne();
    await broadcastHouseState({ user: req.user });

    res.json({ message: 'Device removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
