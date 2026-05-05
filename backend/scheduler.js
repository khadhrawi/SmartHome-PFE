const cron = require('node-cron');
const Scenario = require('./models/Scenario');
const Device = require('./models/Device');
const HouseState = require('./models/HouseState');
const { emitDashboardStateUpdated } = require('./realtime/notifications');
const { logAudit } = require('./utils/audit');

const MODE_ROOM_BRIGHTNESS = {
  Cinematic: { living_room: 10, kitchen: 10, bedroom: 8,   bathroom: 14, utility: 14, garage: 18 },
  Dinner:    { living_room: 75, kitchen: 75, bedroom: 35,  bathroom: 55, utility: 55, garage: 70 },
  Morning:   { living_room: 100, kitchen: 100, bedroom: 100, bathroom: 100, utility: 100, garage: 95 },
  Sleep:     { living_room: 25, kitchen: 22, bedroom: 3,   bathroom: 18, utility: 18, garage: 10 },
};

const normalizeRoom = r => {
  const l = String(r || '').trim().toLowerCase();
  if (l === 'living room' || l === 'studio') return 'living_room';
  return l || 'living_room';
};

async function executeScenarioAction(scenario) {
  const houseCode = String(scenario.houseCode || '').trim().toUpperCase();
  const filter = houseCode ? { houseCode } : { owner: scenario.owner };
  const action = String(scenario.action || '');

  try {
    if (action.startsWith('mood:')) {
      const scene = action.split(':')[1];
      const roomBrightness = MODE_ROOM_BRIGHTNESS[scene];
      if (!roomBrightness) return;

      const lights = await Device.find({ ...filter, type: { $in: ['light', 'lamp'] } });
      if (lights.length > 0) {
        await Device.bulkWrite(lights.map(d => {
          const room = normalizeRoom(d.room);
          const brightness = Number(roomBrightness[room] ?? 45);
          return { updateOne: { filter: { _id: d._id }, update: { $set: { brightness, state: brightness > 0 ? 'ON' : 'OFF' } } } };
        }));
      }
      if (scene === 'Morning') {
        await Device.updateMany({ ...filter, type: { $in: ['window', 'blind', 'blinds'] } }, { $set: { state: 'ON', openPct: 100 } });
      } else {
        await Device.updateMany({ ...filter, type: { $in: ['window', 'blind', 'blinds'] } }, { $set: { state: 'OFF', openPct: 0 } });
      }

      // Update HouseState
      await HouseState.findOneAndUpdate({ houseCode }, { lightingMode: scene }, { upsert: true });

      const allDevices = await Device.find(filter).sort({ createdAt: 1 });
      const hs = await HouseState.findOne({ houseCode });
      emitDashboardStateUpdated({
        houseCode,
        payload: {
          lightingMode: scene,
          lockdownMode: !!hs?.lockdownMode,
          awayMode: !!hs?.awayMode,
          devices: allDevices.map(d => ({
            _id: d._id, name: d.name, type: String(d.type || '').toLowerCase(),
            topic: d.topic, room: normalizeRoom(d.room),
            state: d.state === 'ON' ? 'ON' : 'OFF',
            brightness: Number.isFinite(d.brightness) ? d.brightness : 100,
            color: String(d.color || '#ffc87a'),
            position: { x: Number(d.position?.x ?? 50), y: Number(d.position?.y ?? 50) },
          })),
        },
      });

    } else if (action === 'toggle:light:off') {
      await Device.updateMany({ ...filter, type: { $in: ['light', 'lamp'] } }, { $set: { state: 'OFF', brightness: 0 } });
    } else if (action === 'toggle:light:on') {
      await Device.updateMany({ ...filter, type: { $in: ['light', 'lamp'] } }, { $set: { state: 'ON', brightness: 80 } });
    } else if (action === 'lock_all') {
      await Device.updateMany({ ...filter, type: 'door' }, { $set: { state: 'OFF' } });
    }

    // Mark as triggered
    await Scenario.findByIdAndUpdate(scenario._id, { lastTriggeredAt: new Date() });
    logAudit({ req: null, action: `Scheduled scenario triggered: ${scenario.name}`, category: 'scenario', details: `Action: ${action}`, meta: { houseCode } });
    console.log(`[scheduler] Executed scenario "${scenario.name}" (${action})`);
  } catch (err) {
    console.error(`[scheduler] Failed to execute scenario ${scenario._id}:`, err.message);
  }
}

function initScheduler() {
  // Run every minute — check for matching time-based scenarios
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    try {
      const scenarios = await Scenario.find({
        active: true,
        scheduleTime: currentTime,
      }).populate('owner', 'houseCode');

      for (const scenario of scenarios) {
        // Attach houseCode from owner if not stored directly
        if (!scenario.houseCode && scenario.owner?.houseCode) {
          scenario.houseCode = scenario.owner.houseCode;
        }
        await executeScenarioAction(scenario);
      }
    } catch (err) {
      console.error('[scheduler] Cron error:', err.message);
    }
  });

  console.log('[scheduler] Scenario scheduler initialized');
}

module.exports = { initScheduler };
