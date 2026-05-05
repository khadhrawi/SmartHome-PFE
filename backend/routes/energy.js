const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const Device = require('../models/Device');
const { protect, admin } = require('../middlewares/auth');

// Estimated wattage per device type (W)
const WATTAGE = {
  light: 10, lamp: 10,
  ac: 2000, climate: 1500,
  tv: 150, television: 150,
  washer: 900, washing_machine: 900,
  door: 5, lock: 5,
  camera: 8,
  window: 30, blind: 30, blinds: 30,
  sensor: 2, gas_sensor: 2,
  other: 50,
};

const getWattage = (type) => WATTAGE[String(type || '').toLowerCase()] ?? 50;

// Build 24-hour slots for today
const buildHourlySlots = () => {
  const now = new Date();
  const slots = [];
  for (let h = 0; h < 24; h++) {
    const label = h === 0 ? '12am'
      : h < 12 ? `${h}am`
      : h === 12 ? '12pm'
      : `${h - 12}pm`;
    slots.push({ hour: h, label, kwh: 0 });
  }
  return slots;
};

// GET /api/energy — real energy data from device states + audit log
router.get('/', protect, admin, async (req, res) => {
  try {
    const houseCode = String(req.user?.houseCode || '').trim().toUpperCase();
    const filter = houseCode ? { houseCode } : { owner: req.user._id };

    // Get all devices
    const devices = await Device.find(filter).lean();

    // Today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();

    // Get today's device audit events
    const auditFilter = {
      category: 'device',
      createdAt: { $gte: todayStart, $lte: todayEnd },
      ...(houseCode ? { houseCode } : {}),
    };
    const events = await AuditLog.find(auditFilter).sort({ createdAt: 1 }).lean();

    // Build hourly usage from device events
    // For each ON event, estimate energy until the next OFF event (or now)
    const hourlySlots = buildHourlySlots();

    // Simple approach: per device, track ON intervals through the day
    const deviceIntervals = {};
    events.forEach(ev => {
      const detail = String(ev.details || '').toLowerCase();
      const isOn = detail.includes('state: on') || detail.includes('→ on');
      const isOff = detail.includes('state: off') || detail.includes('→ off');
      const deviceNameMatch = ev.action.match(/device command: (.+?) →/i);
      const deviceName = deviceNameMatch?.[1];
      if (!deviceName) return;

      const device = devices.find(d => d.name?.toLowerCase() === deviceName.toLowerCase());
      if (!device) return;

      const devId = String(device._id);
      if (!deviceIntervals[devId]) deviceIntervals[devId] = { wattage: getWattage(device.type), intervals: [], lastOn: null };

      const evTime = new Date(ev.createdAt);
      if (isOn) {
        deviceIntervals[devId].lastOn = evTime;
      } else if (isOff && deviceIntervals[devId].lastOn) {
        deviceIntervals[devId].intervals.push({ start: deviceIntervals[devId].lastOn, end: evTime });
        deviceIntervals[devId].lastOn = null;
      }
    });

    // Close any still-open intervals
    const now = new Date();
    Object.values(deviceIntervals).forEach(dev => {
      if (dev.lastOn) {
        dev.intervals.push({ start: dev.lastOn, end: now });
      }
    });

    // Distribute energy across hourly slots
    Object.values(deviceIntervals).forEach(({ wattage, intervals }) => {
      intervals.forEach(({ start, end }) => {
        for (let h = start.getHours(); h <= Math.min(end.getHours(), 23); h++) {
          const slotStart = new Date(start);
          slotStart.setHours(h, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(h + 1, 0, 0, 0);

          const overlapStart = start > slotStart ? start : slotStart;
          const overlapEnd = end < slotEnd ? end : slotEnd;
          if (overlapEnd <= overlapStart) continue;

          const hours = (overlapEnd - overlapStart) / 3600000;
          hourlySlots[h].kwh += (wattage * hours) / 1000;
        }
      });
    });

    // Round to 2 decimal places
    hourlySlots.forEach(s => { s.kwh = Math.round(s.kwh * 100) / 100; });

    // Trim to current hour
    const currentHour = now.getHours();
    const usedSlots = hourlySlots.slice(0, currentHour + 1);
    const todayKwh = usedSlots.reduce((s, h) => s + h.kwh, 0);

    // Device breakdown: current device states weighted by wattage
    const deviceBreakdown = devices
      .filter(d => d.state === 'ON')
      .map(d => ({
        id: String(d._id),
        name: d.name,
        type: d.type,
        room: d.room,
        wattage: getWattage(d.type),
        kwh: Math.round((getWattage(d.type) * currentHour) / 1000 * 100) / 100,
      }))
      .sort((a, b) => b.kwh - a.kwh);

    const totalDeviceKwh = deviceBreakdown.reduce((s, d) => s + d.kwh, 0) || 1;
    deviceBreakdown.forEach(d => {
      d.pct = Math.round((d.kwh / totalDeviceKwh) * 100);
    });

    // Weekly estimate (last 7 days from audit events)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekEvents = await AuditLog.find({
      ...auditFilter,
      createdAt: { $gte: weekStart, $lte: todayEnd },
    }).lean();

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = DAYS[d.getDay()];
      weeklyMap[key] = { day: key, kwh: 0, date: d.toDateString() };
    }

    // Count events per day as a simple proxy for energy
    weekEvents.forEach(ev => {
      const day = DAYS[new Date(ev.createdAt).getDay()];
      if (weeklyMap[day]) weeklyMap[day].kwh += 0.3;
    });
    const weekly = Object.values(weeklyMap);
    const avgKwh = weekly.reduce((s, d) => s + d.kwh, 0) / 7;

    res.json({
      hourly: hourlySlots,
      weekly,
      todayKwh: Math.round(todayKwh * 100) / 100,
      avgDailyKwh: Math.round(avgKwh * 100) / 100,
      deviceBreakdown: deviceBreakdown.slice(0, 6),
      activeDevices: devices.filter(d => d.state === 'ON').length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
