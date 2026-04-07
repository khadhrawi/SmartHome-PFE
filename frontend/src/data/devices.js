/**
 * DEVICE_REGISTRY
 * Single source of truth for all smart home devices.
 * Used by: Dashboard, Devices page, Rooms page.
 *
 * Schema per device:
 *   id        – unique string
 *   name      – display label
 *   room      – room name (matches ROOMS keys)
 *   type      – 'light' | 'climate' | 'security' | 'appliance' | 'media'
 *   category  – filter label: 'Lighting' | 'Climate' | 'Security' | 'Media' | 'Appliance'
 *   status    – 'on' | 'off' | 'online' | 'offline'
 *   value     – numeric reading (brightness %, °C, etc.)
 *   locked    – boolean  (security devices only)
 *   color     – preferred glow hex (lights only)
 *   humidity  – % RH (climate only)
 *   wattage   – string  (appliances only)
 *   todayKwh  – string  (appliances only)
 *   lastSeen  – human-readable string
 *   activity  – array of { time, event } (security only)
 */
export const DEVICE_REGISTRY = [
  // ── Living Room ──────────────────────────────
  {
    id: 'rd1', name: 'Living Room Lamp',  room: 'Living Room',
    type: 'light',     category: 'Lighting',
    status: 'on',  value: 80, color: '#ffc87a', lastSeen: '2m ago',
  },
  {
    id: 'rd4', name: 'Living Room AC',   room: 'Living Room',
    type: 'climate',   category: 'Climate',
    status: 'on',  value: 22, humidity: 48, currentTemp: 22.4, lastSeen: '1m ago',
  },
  {
    id: 'rd11', name: 'Smart TV',         room: 'Living Room',
    type: 'media',     category: 'Media',
    status: 'on',  value: 0, wattage: '120W', todayKwh: '0.4 kWh', lastSeen: 'just now',
  },
  {
    id: 'rd12', name: 'Smart Speaker',    room: 'Living Room',
    type: 'media',     category: 'Media',
    status: 'off', value: 0, wattage: '18W', todayKwh: '0.1 kWh', lastSeen: '10m ago',
  },

  // ── Bedroom ──────────────────────────────────
  {
    id: 'rd2', name: 'Bedroom LED Strip', room: 'Bedroom',
    type: 'light',     category: 'Lighting',
    status: 'off', value: 0,  color: '#60a5fa', lastSeen: '5m ago',
  },
  {
    id: 'rd5', name: 'Bedroom AC',        room: 'Bedroom',
    type: 'climate',   category: 'Climate',
    status: 'on',  value: 20, humidity: 52, currentTemp: 21.2, lastSeen: '3m ago',
  },
  {
    id: 'rd13', name: 'Ceiling Fan',      room: 'Bedroom',
    type: 'appliance', category: 'Appliance',
    status: 'on',  value: 0, wattage: '55W', todayKwh: '0.3 kWh', lastSeen: '2m ago',
  },

  // ── Kitchen ──────────────────────────────────
  {
    id: 'rd3', name: 'Kitchen Light',     room: 'Kitchen',
    type: 'light',     category: 'Lighting',
    status: 'on',  value: 60, color: '#ffc87a', lastSeen: '1m ago',
  },
  {
    id: 'rd14', name: 'Kitchen Sensor',   room: 'Kitchen',
    type: 'climate',   category: 'Climate',
    status: 'online', value: 24.7, humidity: 55, currentTemp: 24.7, lastSeen: '1m ago',
  },
  {
    id: 'rd15', name: 'Smart Oven',       room: 'Kitchen',
    type: 'appliance', category: 'Appliance',
    status: 'off', value: 0, wattage: '2200W', todayKwh: '0.8 kWh', lastSeen: '20m ago',
  },

  // ── Entrance ─────────────────────────────────
  {
    id: 'rd6', name: 'Front Door Lock',   room: 'Entrance',
    type: 'security',  category: 'Security',
    status: 'online', locked: true,  lastSeen: 'just now',
    activity: [
      { time: '00:04', event: 'Locked remotely' },
      { time: '23:51', event: 'Motion detected' },
      { time: '23:40', event: 'Unlocked — Imen' },
    ],
  },
  {
    id: 'rd16', name: 'Motion Sensor',    room: 'Entrance',
    type: 'security',  category: 'Security',
    status: 'online', locked: true, lastSeen: '30s ago',
    activity: [
      { time: '23:51', event: 'Motion detected' },
      { time: '22:18', event: 'All clear' },
    ],
  },

  // ── Garage ───────────────────────────────────
  {
    id: 'rd7', name: 'Garage Door',       room: 'Garage',
    type: 'security',  category: 'Security',
    status: 'online', locked: true, lastSeen: '8m ago',
    activity: [
      { time: '22:15', event: 'Garage locked' },
      { time: '20:33', event: 'Opened by car remote' },
    ],
  },

  // ── Utility ──────────────────────────────────
  {
    id: 'rd8', name: 'Smart Washing M.',  room: 'Utility',
    type: 'appliance', category: 'Appliance',
    status: 'off', value: 0, wattage: '800W', todayKwh: '1.2 kWh', lastSeen: '15m ago',
  },
];

/** All unique room names in display order */
export const ROOM_ORDER = [
  'Living Room', 'Bedroom', 'Kitchen', 'Entrance', 'Garage', 'Utility',
];

/** Category filter pills */
export const CATEGORIES = ['All', 'Lighting', 'Climate', 'Security', 'Media', 'Appliance'];

/** Room metadata: emoji icon + accent color */
export const ROOM_META = {
  'Living Room': { emoji: '🛋️', accent: '#E3C598', temp: 22.4 },
  'Bedroom':     { emoji: '🛏️', accent: '#818cf8', temp: 21.2 },
  'Kitchen':     { emoji: '🍳', accent: '#f97316', temp: 24.7 },
  'Entrance':    { emoji: '🚪', accent: '#60a5fa', temp: null  },
  'Garage':      { emoji: '🚗', accent: '#3E5F4F', temp: null  },
  'Utility':     { emoji: '🔧', accent: '#a78bfa', temp: null  },
};
