/**
 * AUTOMATION_RULES
 * Each rule: id, title, description, isEnabled, trigger, condition, action, lastTriggered
 *
 * trigger.type: 'time' | 'sensor' | 'device' | 'location'
 * action.type:  'execute_mood' | 'toggle_device' | 'set_brightness' | 'set_temperature' | 'lock_all'
 */
export const INITIAL_AUTOMATION_RULES = [
  {
    id: 'a1',
    title: 'Good Night Mode',
    description: 'Automatically activates Sleep mood at 11 PM.',
    isEnabled: true,
    trigger: { type: 'time', triggerTime: '23:00', label: 'Every day at 23:00' },
    condition: { type: 'time_match', label: 'Time is 23:00' },
    action: { type: 'execute_mood', mood: 'Sleep', label: 'Activate Sleep mood' },
    lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    runCount: 14,
    accentColor: '#818cf8',
    emoji: '🌙',
  },
  {
    id: 'a2',
    title: 'Morning Energizer',
    description: 'Brightens all lights and opens curtains at sunrise.',
    isEnabled: true,
    trigger: { type: 'time', triggerTime: '07:00', label: 'Every day at 07:00' },
    condition: { type: 'time_match', label: 'Time is 07:00' },
    action: { type: 'execute_mood', mood: 'Morning', label: 'Activate Morning mood' },
    lastTriggered: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    runCount: 21,
    accentColor: '#f5c842',
    emoji: '☀️',
  },
  {
    id: 'a3',
    title: 'Front Door Alert',
    description: 'Turns on porch light when front door is unlocked.',
    isEnabled: true,
    trigger: { type: 'device', deviceId: 'rd6', deviceName: 'Front Door Lock', label: 'Front Door Lock' },
    condition: { type: 'equals', field: 'locked', value: 'false', label: 'Is Unlocked' },
    action: { type: 'toggle_device', deviceId: 'rd3', deviceName: 'Kitchen Light', targetStatus: 'on', label: 'Turn on Kitchen Light' },
    lastTriggered: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30m ago
    runCount: 8,
    accentColor: '#f97316',
    emoji: '🚪',
  },
  {
    id: 'a4',
    title: 'Heat Warning',
    description: 'Turns AC on when temperature exceeds 26°C.',
    isEnabled: false,
    trigger: { type: 'sensor', deviceId: 'rd4', deviceName: 'Living Room AC', label: 'Living Room AC' },
    condition: { type: 'greater_than', field: 'value', value: '26', label: 'Temperature > 26°C' },
    action: { type: 'set_temperature', deviceId: 'rd4', targetTemp: 22, label: 'Set AC to 22°C' },
    lastTriggered: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    runCount: 3,
    accentColor: '#f87171',
    emoji: '🌡️',
  },
  {
    id: 'a5',
    title: 'Cinematic Evening',
    description: 'Dims lights and activates Cinematic mood on weekdays at 8 PM.',
    isEnabled: true,
    trigger: { type: 'time', triggerTime: '20:00', label: 'Weekdays at 20:00' },
    condition: { type: 'time_match', label: 'Time is 20:00' },
    action: { type: 'execute_mood', mood: 'Cinematic', label: 'Activate Cinematic mood' },
    lastTriggered: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    runCount: 9,
    accentColor: '#a78bfa',
    emoji: '🎬',
  },
  {
    id: 'a6',
    title: 'Security Lockdown',
    description: 'Locks all doors when Away mode is activated.',
    isEnabled: true,
    trigger: { type: 'location', label: 'When leaving home' },
    condition: { type: 'location_away', label: 'Location: Away' },
    action: { type: 'lock_all', label: 'Lock all doors' },
    lastTriggered: null,
    runCount: 0,
    accentColor: '#60a5fa',
    emoji: '🔒',
  },
];

/** ── Trigger type options for the wizard ── */
export const TRIGGER_TYPES = [
  {
    value: 'time',
    label: 'Scheduled Time',
    description: 'Runs at a specific time every day',
    emoji: '⏰',
    accent: '#f5c842',
  },
  {
    value: 'device',
    label: 'Device State',
    description: 'Reacts when a device changes state',
    emoji: '💡',
    accent: '#E3C598',
  },
  {
    value: 'sensor',
    label: 'Sensor Reading',
    description: 'Triggers on temperature or humidity',
    emoji: '🌡️',
    accent: '#f97316',
  },
  {
    value: 'location',
    label: 'Location Event',
    description: 'Fires on arriving or leaving home',
    emoji: '📍',
    accent: '#4ade80',
  },
];

/** ── Condition options per trigger type ── */
export const CONDITIONS_BY_TRIGGER = {
  time: [
    { value: 'time_match', label: 'Time matches exactly' },
  ],
  device: [
    { value: 'equals_on',   label: 'Is turned ON' },
    { value: 'equals_off',  label: 'Is turned OFF' },
    { value: 'is_locked',   label: 'Is Locked' },
    { value: 'is_unlocked', label: 'Is Unlocked' },
  ],
  sensor: [
    { value: 'greater_than', label: 'Reading is above threshold' },
    { value: 'less_than',    label: 'Reading is below threshold' },
    { value: 'equals',       label: 'Reading equals value' },
  ],
  location: [
    { value: 'location_away', label: 'Leaving home (Away)' },
    { value: 'location_home', label: 'Returning home (Arrived)' },
  ],
};

/** ── Action options for the wizard ── */
export const ACTION_TYPES = [
  {
    value: 'execute_mood',
    label: 'Activate Mood Scene',
    emoji: '✨',
    accent: '#a78bfa',
    moods: ['Sleep', 'Morning', 'Cinematic', 'Dinner'],
  },
  {
    value: 'toggle_device',
    label: 'Toggle a Device',
    emoji: '💡',
    accent: '#E3C598',
  },
  {
    value: 'set_temperature',
    label: 'Set Temperature',
    emoji: '🌡️',
    accent: '#f97316',
  },
  {
    value: 'lock_all',
    label: 'Lock All Doors',
    emoji: '🔒',
    accent: '#60a5fa',
  },
  {
    value: 'notify',
    label: 'Send Notification',
    emoji: '🔔',
    accent: '#3E5F4F',
  },
];

/** ── Human-readable "last triggered" ── */
export function formatLastTriggered(isoString) {
  if (!isoString) return 'Never ran';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `Ran ${mins}m ago`;
  if (hours < 24)  return `Ran ${hours}h ago`;
  return `Ran ${days}d ago`;
}
