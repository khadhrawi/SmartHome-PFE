/** ── Camera Feeds ── */
export const CAMERA_FEEDS = [
  {
    id: 'cam1',
    location: 'Front Door',
    room: 'Entrance',
    emoji: '🚪',
    isLive: true,
    motionDetected: true,
    accentColor: '#f87171',
    recentEvents: [
      { time: '10:45 AM', event: 'Person detected', type: 'motion' },
      { time: '10:32 AM', event: 'Motion cleared',  type: 'clear'  },
      { time: '09:14 AM', event: 'Door unlocked — Imen', type: 'access' },
      { time: '08:57 AM', event: 'Package delivery detected', type: 'motion' },
    ],
    thumbnailGradient: 'linear-gradient(135deg, rgba(248,113,113,0.15) 0%, rgba(30,15,5,0.9) 100%)',
  },
  {
    id: 'cam2',
    location: 'Living Room',
    room: 'Living Room',
    emoji: '🛋️',
    isLive: true,
    motionDetected: false,
    accentColor: '#E3C598',
    recentEvents: [
      { time: '09:01 AM', event: 'Motion detected',  type: 'motion' },
      { time: '08:45 AM', event: 'Motion cleared',   type: 'clear'  },
      { time: '07:30 AM', event: 'Day mode activated', type: 'system' },
    ],
    thumbnailGradient: 'linear-gradient(135deg, rgba(227,197,152,0.12) 0%, rgba(30,15,5,0.9) 100%)',
  },
  {
    id: 'cam3',
    location: 'Back Garden',
    room: 'Outdoor',
    emoji: '🌿',
    isLive: true,
    motionDetected: false,
    accentColor: '#4ade80',
    recentEvents: [
      { time: '11:20 AM', event: 'Wind motion (false positive)', type: 'motion' },
      { time: '06:48 AM', event: 'Night mode deactivated', type: 'system' },
    ],
    thumbnailGradient: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(15,20,10,0.9) 100%)',
  },
  {
    id: 'cam4',
    location: 'Garage',
    room: 'Garage',
    emoji: '🚗',
    isLive: false,
    motionDetected: false,
    accentColor: '#60a5fa',
    recentEvents: [
      { time: 'Yesterday 10:15 PM', event: 'Car parked',   type: 'access' },
      { time: 'Yesterday 06:20 PM', event: 'Garage opened', type: 'access' },
    ],
    thumbnailGradient: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(10,12,20,0.9) 100%)',
  },
];

/** Time-stamped motion log for alert ticker */
export const MOTION_LOG = [
  { id: 'm1', camera: 'Front Door', time: '10:45 AM', severity: 'high'   },
  { id: 'm2', camera: 'Back Garden', time: '11:20 AM', severity: 'low'   },
  { id: 'm3', camera: 'Living Room', time: '09:01 AM', severity: 'medium' },
];

/** Event type → display config */
export const EVENT_CONFIG = {
  motion: { label: 'Motion',  color: '#f87171', dot: '#f87171' },
  clear:  { label: 'Clear',   color: '#4ade80', dot: '#4ade80' },
  access: { label: 'Access',  color: '#60a5fa', dot: '#60a5fa' },
  system: { label: 'System',  color: '#a78bfa', dot: '#a78bfa' },
};
