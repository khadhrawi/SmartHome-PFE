import { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  PowerOff, Lock, Unlock, Home, Moon, Shield, Zap, Settings,
  Film, Utensils, Coffee, ChevronRight, PlusCircle,
  Wind, Thermometer, Lightbulb, Activity, AlertTriangle,
  TrendingUp, TrendingDown, WifiOff, Loader2, CheckCircle2, Tv, Eye,
  X, SlidersHorizontal, Sun, Snowflake
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DeviceCard from '../components/DeviceCard';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import { connectMqtt, getMqttClient } from '../mqtt/client';
import { DEVICE_REGISTRY } from '../data/devices';
import { CAMERA_FEEDS } from '../data/security';

/* ── Warm palette tokens ── */
const C = {
  text:        '#F8F9FA',
  textMuted:   'rgba(248,249,250,0.50)',
  textDimmed:  'rgba(248,249,250,0.28)',
  gold:        '#E3C598',
  goldLight:   '#D4AF37',
  goldDim:     'rgba(227,197,152,0.60)',
  goldBg:      'rgba(227,197,152,0.12)',
  goldBorder:  'rgba(227,197,152,0.28)',
  cardBg:      'rgba(255,255,255,0.10)',
  cardBorder:  'rgba(255,215,140,0.22)',
  onGreen:     '#4ade80',
  offGray:     'rgba(248,249,250,0.25)',
};

/* ══════════════════════════════════════════════════
   MOOD PRESETS
   Each mood defines the desired state of the home:
   - lights  → brightness 0-100 per lamp id
   - ac      → target temperature
   - curtains → 'open' | 'closed'
   - media   → tv on/off + app label
══════════════════════════════════════════════════ */
const MOOD_PRESETS = {
  Cinematic: {
    lights:   { l1: { is_on: true,  brightness: 10 }, l2: { is_on: false, brightness: 0 },
                l3: { is_on: false, brightness: 0  }, l4: { is_on: true,  brightness: 8 },
                l5: { is_on: false, brightness: 0  } },
    ac:       { temp: 22, mode: 'cool' },
    curtains: { position: 'closed' },
    media:    { tv: true, app: 'Netflix' },
    summary:  ['10% lights', '22°C', 'Curtains closed', 'Netflix'],
  },
  Dinner: {
    lights:   { l1: { is_on: true,  brightness: 65 }, l2: { is_on: false, brightness: 0 },
                l3: { is_on: true,  brightness: 80  }, l4: { is_on: true,  brightness: 40 },
                l5: { is_on: false, brightness: 0   } },
    ac:       { temp: 21, mode: 'auto' },
    curtains: { position: 'closed' },
    media:    { tv: false, app: null },
    summary:  ['Warm 65% lights', '21°C', 'Ambient only'],
  },
  Morning: {
    lights:   { l1: { is_on: true, brightness: 100 }, l2: { is_on: true,  brightness: 90  },
                l3: { is_on: true, brightness: 100 }, l4: { is_on: true,  brightness: 100 },
                l5: { is_on: true, brightness: 60  } },
    ac:       { temp: 20, mode: 'fan' },
    curtains: { position: 'open' },
    media:    { tv: false, app: null },
    summary:  ['Full brightness', '20°C', 'Curtains open'],
  },
  Sleep: {
    lights:   { l1: { is_on: false, brightness: 0 }, l2: { is_on: true,  brightness: 3 },
                l3: { is_on: false, brightness: 0 }, l4: { is_on: false, brightness: 0 },
                l5: { is_on: false, brightness: 0 } },
    ac:       { temp: 19, mode: 'quiet' },
    curtains: { position: 'closed' },
    media:    { tv: false, app: null },
    summary:  ['Night light 3%', '19°C', 'Curtains closed'],
  },
};

const MOODS = [
  { name: 'Cinematic', desc: 'Dimmed lights, perfect for films',
    icon: Film,
    img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    color: '#9b59b6' },
  { name: 'Dinner', desc: 'Warm glows for dining',
    icon: Utensils,
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
    color: '#e67e22' },
  { name: 'Morning', desc: 'Bright & energizing start',
    icon: Coffee,
    img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop',
    color: '#E3C598' },
  { name: 'Sleep', desc: 'Minimal light for deep rest',
    icon: Moon,
    img: 'https://images.unsplash.com/photo-1540206395-68808572332f?q=80&w=800&auto=format&fit=crop',
    color: '#3b82f6' },
];

const BASE_QUICK_ACTIONS = [
  { id: 'all_off', label: 'All Lights',  sub: 'Master brightness control', icon: PowerOff,  accent: '#E3C598', longPress: true  },
  { id: 'lock',    label: 'Lock Down',   sub: 'Secure all entrances',      icon: Lock,      accent: '#f87171', longPress: false },
  { id: 'away',    label: 'Away Mode',   sub: 'Enable ghost protocol',     icon: Home,      accent: '#60a5fa', longPress: false },
  { id: 'climate', label: 'Climate',     sub: 'Master temperature control', icon: Thermometer, accent: '#3E5F4F', longPress: true },
];

/* Returns an ordered copy of BASE_QUICK_ACTIONS with the context-aware
   'most likely' action promoted to slot 0 based on current hour. */
function getContextActions(hour, isAwayOn) {
  const clone = [...BASE_QUICK_ACTIONS];
  let priority;
  if (hour >= 23 || hour < 5)  priority = 'sleep';
  else if (hour >= 5 && hour < 10) priority = 'all_off';   // morning → manage lights
  else if (hour >= 18 && hour < 23) priority = isAwayOn ? 'away' : 'climate'; // evening
  else priority = 'lock';                                    // daytime → security
  // Make a synthetic 'sleep' entry if needed
  const sleepAction = { id: 'sleep', label: 'Sleep Mode', sub: 'Hibernate entire home', icon: Moon, accent: '#a78bfa', longPress: false };
  const allActions = [...clone, sleepAction];
  const set = new Map(allActions.map(a => [a.id, a]));
  const prioritised = set.get(priority);
  const rest = [...set.values()].filter(a => a.id !== priority).slice(0, 3);
  return prioritised ? [prioritised, ...rest] : [...set.values()].slice(0, 4);
}

/* ══════════════════════════════════════════════════
   CENTRALIZED HOME STATE
   Simulates the local device ecosystem:
   - lights[]  → controllable lamps with brightness
   - climate[] → temperature/humidity sensors
   - doors[]   → door/window security status
══════════════════════════════════════════════════ */
const INITIAL_HOME_STATE = {
  lights: [
    { id: 'l1', name: 'Living Room Lamp',  room: 'Living Room', is_on: true,  brightness: 80 },
    { id: 'l2', name: 'Bedroom Ceiling',   room: 'Bedroom',     is_on: false, brightness: 0  },
    { id: 'l3', name: 'Kitchen Under-cab', room: 'Kitchen',     is_on: true,  brightness: 60 },
    { id: 'l4', name: 'Hallway Strip',     room: 'Hallway',     is_on: false, brightness: 0  },
    { id: 'l5', name: 'Garden Spot',       room: 'Outdoor',     is_on: true,  brightness: 45 },
  ],
  climate: [
    { id: 'c1', name: 'Living Room Sensor', room: 'Living Room', temp: 22.4, humidity: 48 },
    { id: 'c2', name: 'Bedroom Sensor',     room: 'Bedroom',     temp: 21.1, humidity: 52 },
    { id: 'c3', name: 'Kitchen Sensor',     room: 'Kitchen',     temp: 24.7, humidity: 55 },
    { id: 'c4', name: 'Outdoor Sensor',     room: 'Outdoor',     temp: 14.2, humidity: 68 },
  ],
  doors: [
    { id: 'd1', name: 'Front Door',     locked: true  },
    { id: 'd2', name: 'Back Door',      locked: true  },
    { id: 'd3', name: 'Garage Door',    locked: true  },
    { id: 'd4', name: 'Living Room Win', locked: true  },
    { id: 'd5', name: 'Bedroom Window', locked: true  },
  ],
};

/* DEVICE_REGISTRY imported from data/devices.js */

/* ── Styled card wrapper ── */
function GCard({ children, className = '', style = {}, onClick, lift = false }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-3xl ${lift ? 'glass-card-lift' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255,215,140,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,220,140,0.14), inset 0 -1px 0 rgba(0,0,0,0.20)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Main component ─── */
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [devices, setDevices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null); // for Smart Controller overlay
  const [isAwayMode, setIsAwayMode]         = useState(false);

  /* ── Quick Action per-button state ── */
  // 'idle' | 'processing' | 'success' | 'blocked'
  const [qaBtnState, setQaBtnState]   = useState({});
  const [qaBlocked,  setQaBlocked]    = useState({}); // id → blockedDeviceName
  const longPressTimer = useRef(null);

  /* ── Floating Slider (long-press) ── */
  // type: 'brightness' | 'temperature' | null
  const [floatingSlider, setFloatingSlider] = useState(null); // { type, value }

  /* ── HomeState: centralized local mock ── */
  const [homeState, setHomeState]   = useState(INITIAL_HOME_STATE);

  // Master control refs — initialized from INITIAL_HOME_STATE so they're available immediately
  const masterBrightness = useRef(
    INITIAL_HOME_STATE.lights.filter(l => l.is_on).length > 0
      ? Math.round(INITIAL_HOME_STATE.lights.reduce((s, l) => s + l.brightness, 0) / INITIAL_HOME_STATE.lights.length)
      : 75
  );
  const masterTemp = useRef(
    Math.round(INITIAL_HOME_STATE.climate.reduce((s, c) => s + c.temp, 0) / INITIAL_HOME_STATE.climate.length)
  );

  /* ── Live device list — starts from shared registry, patched by overlay ── */
  const [mockDevices, setMockDevices] = useState(DEVICE_REGISTRY);

  /* combined display list: real backend devices first, then registry as fallback */
  const displayDevices = devices.length > 0 ? devices : mockDevices;

  /* ── Mood state ── */
  const [activeMood, setActiveMood]         = useState(null);   // name of active mood
  const [activatingMood, setActivatingMood] = useState(null);   // name being applied right now
  const [moodBrokenBy, setMoodBrokenBy]     = useState(null);   // device name that broke the mood
  // Snapshot of light brightnesses when mood was last applied (for override detection)
  const moodSnapshotRef = useRef(null);

  /* ── Energy: base + live random drift ── */
  const [energyKwh, setEnergyKwh]         = useState(3.2);
  const [energyDelta, setEnergyDelta]     = useState(null); // '+0.04' / '-0.01'
  const energyRef = useRef(3.2);

  /* ── Live Energy Simulation ──
     Every 30 s → add a small random increment (0.01–0.09 kWh)
     reflecting the active devices drawing power.
     Occasionally a tiny drop simulates a device turning off.
  ── */
  useEffect(() => {
    const tick = () => {
      const lightsOnCount = homeState.lights.filter(l => l.is_on).length;
      // More lights on → more consumption per tick
      const base      = 0.01 + lightsOnCount * 0.008;
      const variance  = (Math.random() - 0.18) * 0.04; // slight chance of drop
      const delta     = parseFloat((base + variance).toFixed(3));
      energyRef.current = parseFloat((energyRef.current + delta).toFixed(3));
      setEnergyKwh(energyRef.current);
      setEnergyDelta(delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2));
      // Clear delta label after 4 s
      setTimeout(() => setEnergyDelta(null), 4000);
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [homeState.lights]);

  /* ── Derived stats from HomeState ── */
  // Average indoor temperature (exclude outdoor sensors)
  const indoorSensors = homeState.climate.filter(c => c.room !== 'Outdoor');
  const avgTemp = indoorSensors.length
    ? (indoorSensors.reduce((s, c) => s + c.temp, 0) / indoorSensors.length).toFixed(1)
    : '--';

  // Security analysis
  const openDoors    = homeState.doors.filter(d => !d.locked);
  const isSecure     = openDoors.length === 0;
  // Away mode + any camera motion → high-priority alert
  const cameraMotion = CAMERA_FEEDS.some(cam => cam.motionDetected);
  const isAlertState = isAwayMode && cameraMotion;

  // Lights: merge real backend devices + homeState
  const backendLights = devices.filter(d => d.type === 'lamp');
  const backendOn     = backendLights.filter(l => l.state === 'ON').length;
  const stateOn       = homeState.lights.filter(l => l.is_on).length;
  const lightsOn      = backendLights.length > 0 ? backendOn : stateOn;
  const totalLights   = backendLights.length > 0 ? backendLights.length : homeState.lights.length;

  /* Legacy alias for hero sub-line */
  const lights = backendLights;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDevices = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/devices');
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const c = connectMqtt();
    if (c) c.on('message', fetchDevices);
    return () => {
      const cl = getMqttClient();
      if (cl) cl.removeListener('message', fetchDevices);
    };
  }, []);

  const handleToggle = async (id, state) => {
    const cmd = state === 'ON' ? 'OFF' : 'ON';
    await axios.post(`http://localhost:5000/api/devices/${id}/command`, { command: cmd });
    setDevices(prev => prev.map(d => d._id === id ? { ...d, state: cmd } : d));
  };

  /* ──────────────────────────────────────────────
     triggerMood(moodName)
     1. Shows activating spinner on the tapped card
     2. Simulates 1.2 s device communication delay
     3. Applies the preset to homeState.lights & extras
     4. Records a brightness snapshot for override detection
     5. Deactivates any previously active mood
  ────────────────────────────────────────────── */
  const triggerMood = async (moodName) => {
    // Toggle off if already active
    if (activeMood === moodName) {
      setActiveMood(null);
      moodSnapshotRef.current = null;
      showToast(`${moodName} mood deactivated`);
      return;
    }

    setActivatingMood(moodName);
    setMoodBrokenBy(null);

    // Simulate async device communication (1.2 s)
    await new Promise(r => setTimeout(r, 1200));

    const preset = MOOD_PRESETS[moodName];
    if (!preset) { setActivatingMood(null); return; }

    // Apply light settings from preset to homeState
    setHomeState(prev => ({
      ...prev,
      lights: prev.lights.map(light => {
        const p = preset.lights[light.id];
        return p ? { ...light, ...p } : light;
      }),
    }));

    // Record snapshot of the brightness values we just applied
    moodSnapshotRef.current = { moodName, lights: { ...preset.lights } };

    setActiveMood(moodName);
    setActivatingMood(null);
    showToast(`✦ ${moodName} mood activated`);
  };

  /* ──────────────────────────────────────────────
     Smart Override Detection
     Watch homeState.lights; if any light's brightness
     deviates from the active mood snapshot, mark mood broken.
  ────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeMood || !moodSnapshotRef.current) return;
    const snap = moodSnapshotRef.current.lights;
    for (const light of homeState.lights) {
      const expected = snap[light.id];
      if (!expected) continue;
      if (light.brightness !== expected.brightness || light.is_on !== expected.is_on) {
        setActiveMood(null);
        setMoodBrokenBy(light.name);
        moodSnapshotRef.current = null;
        // Auto-clear the broken-by notice after 5 s
        setTimeout(() => setMoodBrokenBy(null), 5000);
        return;
      }
    }
  }, [homeState.lights, activeMood]);

  /* ── Set per-button state helper ── */
  const setQAState = useCallback((id, state, extra = {}) => {
    setQaBtnState(prev => ({ ...prev, [id]: state }));
    if (extra.blocked) setQaBlocked(prev => ({ ...prev, [id]: extra.blocked }));
    if (state === 'success' || state === 'blocked') {
      setTimeout(() => {
        setQaBtnState(prev => ({ ...prev, [id]: 'idle' }));
        setQaBlocked(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, state === 'success' ? 2000 : 3500);
    }
  }, []);

  const handleQuickAction = async (id) => {
    if (qaBtnState[id] === 'processing') return;
    setQAState(id, 'processing');
    try {
      const offBackend = arr => Promise.all(arr.map(l =>
        axios.post(`http://localhost:5000/api/devices/${l._id}/command`, { command: 'OFF' })));

      if (id === 'all_off') {
        await offBackend(lights.filter(l => l.state === 'ON'));
        setHomeState(s => ({ ...s, lights: s.lights.map(l => ({ ...l, is_on: false, brightness: 0 })) }));
        setQAState(id, 'success');
        showToast('✦ All lights turned off');

      } else if (id === 'lock') {
        // ── Security verification ──
        await new Promise(r => setTimeout(r, 900));  // simulate device-comm latency
        const openDoorsList = homeState.doors.filter(d => !d.locked);
        if (openDoorsList.length > 0) {
          // Blocked — at least one door is open
          setQAState(id, 'blocked', { blocked: openDoorsList[0].name });
          showToast(`⚠ ${openDoorsList[0].name} is open — cannot lock down`);
        } else {
          setHomeState(s => ({ ...s, doors: s.doors.map(d => ({ ...d, locked: true })) }));
          setQAState(id, 'success');
          showToast('🔒 House is now locked');
        }

      } else if (id === 'away') {
        await new Promise(r => setTimeout(r, 1200));
        const nextAway = !isAwayMode;
        if (nextAway) {
          await offBackend(lights.filter(l => l.state === 'ON'));
          setHomeState(s => ({
            ...s,
            lights: s.lights.map(l => ({ ...l, is_on: false, brightness: 0 })),
            doors:  s.doors.map(d => ({ ...d, locked: true })),
          }));
        }
        setIsAwayMode(nextAway);
        setQAState(id, 'success');
        showToast(nextAway ? '🏠 Away Mode activated — cameras monitoring' : 'Away Mode deactivated');

      } else if (id === 'sleep') {
        await new Promise(r => setTimeout(r, 800));
        await offBackend(lights.filter(l => l.state === 'ON'));
        setHomeState(s => ({ ...s, lights: s.lights.map(l => ({ ...l, is_on: false, brightness: 0 })) }));
        setQAState(id, 'success');
        showToast('🌙 Sleep Mode activated');

      } else if (id === 'climate') {
        // climate long-press already opens slider; tap just shows toast
        setQAState(id, 'success');
        showToast('Hold to control temperature');
      }
      fetchDevices();
    } catch { setQAState(id, 'idle'); showToast('Action failed — check backend'); }
  };

  /* ── Long-press handler for brightness / temperature ── */
  const handleLongPressStart = useCallback((actionId) => {
    longPressTimer.current = setTimeout(() => {
      if (actionId === 'all_off') {
        setFloatingSlider({ type: 'brightness', value: masterBrightness.current });
      } else if (actionId === 'climate') {
        setFloatingSlider({ type: 'temperature', value: masterTemp.current });
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const applyMasterBrightness = useCallback((val) => {
    masterBrightness.current = val;
    setHomeState(s => ({
      ...s,
      lights: s.lights.map(l => ({ ...l, is_on: val > 0, brightness: val })),
    }));
  }, []);

  const applyMasterTemp = useCallback((val) => {
    masterTemp.current = val;
    setHomeState(s => ({
      ...s,
      climate: s.climate.map(c => ({ ...c, temp: val })),
    }));
  }, []);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await axios.post('http://localhost:5000/api/devices', {
        name: fd.get('name'), type: fd.get('type'), room: fd.get('room'), state: 'OFF',
      });
      setShowAdd(false);
      fetchDevices();
      showToast('Device registered successfully');
    } catch { showToast('Failed to add device'); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="w-12 h-12 rounded-2xl border-2 border-t-amber-400 border-white/10 animate-spin"
        style={{ borderTopColor: C.gold }} />
      <p className="text-sm font-semibold uppercase tracking-[0.3em] warm-pulse" style={{ color: C.goldDim }}>
        Synchronizing…
      </p>
    </div>
  );

  return (
    <div className="space-y-12" style={{ color: C.text }}>

      {/* ══════ ADD DEVICE MODAL ══════ */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: 'rgba(8,16,13,0.75)', backdropFilter: 'blur(25px)' }}>
          <GCard className="w-full max-w-md p-10 space-y-8">
            <div>
              <h3 className="text-2xl font-black tracking-tight" style={{ color: C.text }}>Register Device</h3>
              <p className="text-sm mt-1 font-medium" style={{ color: C.textMuted }}>Add a new unit to your ecosystem.</p>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.goldDim }}>Name</label>
                <input name="name" required autoFocus placeholder="e.g. Living Room Lamp"
                  className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium placeholder:opacity-30 focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.cardBorder}`, color: C.text }}
                  onFocus={e => e.target.style.borderColor = C.goldBorder}
                  onBlur={e => e.target.style.borderColor = C.cardBorder}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ n:'type', opts:['lamp','fan','sensor','other'] }, { n:'room', opts:['Living Room','Bedroom','Kitchen','Bathroom'] }].map(f => (
                  <div key={f.n} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest capitalize" style={{ color: C.goldDim }}>{f.n}</label>
                    <select name={f.n} className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.cardBorder}`, color: C.text }}>
                      {f.opts.map(o => <option key={o} value={o} style={{ background: '#0D1A15' }}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.1)`, color: C.textMuted }}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0D1A15', boxShadow: `0 8px 25px ${C.goldBg}` }}>
                  Confirm
                </button>
              </div>
            </form>
          </GCard>
        </div>
      )}

      {/* ══════ HERO — Compact Glassmorphic Premium Card ══════ */}
      <section>
        <div
          className="relative overflow-hidden rounded-[2rem]"
          style={{
            background: 'rgba(26,31,29,0.55)',
            backdropFilter: 'blur(25px) saturate(160%)',
            WebkitBackdropFilter: 'blur(25px) saturate(160%)',
            border: '1px solid rgba(227,197,152,0.16)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2)',
          }}
        >
          {/* ── Shimmer sweep ── */}
          <div className="absolute inset-y-0 left-0 w-1/3 pointer-events-none shimmer-sweep"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,220,120,0.06), transparent)' }} />

          {/* ── Ambient warm orb — top-right ── */}
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none lamp-glow"
            style={{ background: 'radial-gradient(circle, rgba(255,165,40,0.18) 0%, rgba(220,120,20,0.07) 55%, transparent 75%)' }} />

          {/* ── Ambient warm orb — bottom-left ── */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none lamp-glow"
            style={{ background: 'radial-gradient(circle, rgba(200,120,30,0.12) 0%, transparent 70%)', animationDelay: '1.8s' }} />

          {/* ── Decorative right ring ── */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
            style={{ border: '1px solid rgba(227,197,152,0.08)', boxShadow: 'inset 0 0 40px rgba(227,197,152,0.06)' }} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[60%] w-44 h-44 rounded-full pointer-events-none"
            style={{ border: '1px solid rgba(227,197,152,0.12)' }} />

          {/* ── Content row ── */}
          <div className="flex items-center justify-between gap-6 px-8 py-7">

            {/* LEFT — greeting block */}
            <div className="flex-1 space-y-3 min-w-0">

              {/* Status pill + date */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(227,197,152,0.09)', border: '1px solid rgba(227,197,152,0.20)' }}>
                  <span className="w-1.5 h-1.5 rounded-full status-blink"
                    style={{ background: C.gold, flexShrink: 0 }} />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: C.gold }}>
                    All systems active
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.textDimmed }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {/* Greeting headline */}
              <div>
                <h1 className="font-headline text-3xl sm:text-[2.15rem] font-bold tracking-tight leading-[1.1]"
                  style={{ color: C.text, letterSpacing: '-0.02em' }}>
                  {greeting()},{' '}
                  <span style={{
                    background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 60%, #c47a10 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {user?.name?.split(' ')[0] || 'Imen'}
                  </span>
                </h1>

                {/* Sub-line */}
                <p className="mt-2 text-sm font-medium" style={{ color: 'rgba(248,249,250,0.42)', maxWidth: '34ch' }}>
                  Your home is running smoothly.
                  {lightsOn > 0 && (
                    <span style={{ color: 'rgba(248,249,250,0.28)' }}> · {lightsOn} light{lightsOn > 1 ? 's' : ''} on</span>
                  )}
                </p>
              </div>
            </div>

            {/* RIGHT — compact action buttons */}
            <div className="flex flex-col gap-2.5 shrink-0">
              {/* PRIMARY — Register Device */}
              <button
                onClick={() => setShowAdd(true)}
                className="group relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-300 overflow-hidden hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight} 60%, #c47a10)`,
                  color: '#0D1A15',
                  boxShadow: `0 6px 20px rgba(227,197,152,0.35), 0 2px 6px rgba(0,0,0,0.3)`,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 10px 28px rgba(227,197,152,0.55), 0 2px 6px rgba(0,0,0,0.3)`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = `0 6px 20px rgba(227,197,152,0.35), 0 2px 6px rgba(0,0,0,0.3)`}
              >
                {/* Button inner shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                <PlusCircle size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                Register Device
              </button>

              {/* SECONDARY — Manage Scenes */}
              <Link
                to="/scenarios"
                className="group flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(248,249,250,0.55)',
                  border: `1px solid rgba(227,197,152,0.22)`,
                  backdropFilter: 'blur(10px)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(227,197,152,0.10)';
                  e.currentTarget.style.borderColor = 'rgba(227,197,152,0.38)';
                  e.currentTarget.style.color = `rgba(240,220,160,0.9)`;
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(227,197,152,0.15)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(227,197,152,0.22)';
                  e.currentTarget.style.color = 'rgba(248,249,250,0.55)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Settings size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                Manage Scenes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ STATS — Live Functional Cards ══════ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">

        {/* ── 1. Lights On ── */}
        <GCard lift className="p-6 flex flex-col gap-4 relative overflow-hidden">
          {/* Ambient glow when lights are on */}
          {lightsOn > 0 && (
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.20) 0%, transparent 70%)' }} />
          )}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: lightsOn > 0 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${lightsOn > 0 ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.5s ease',
              }}>
              <Lightbulb size={18} strokeWidth={2.5}
                style={{ color: lightsOn > 0 ? C.gold : C.textDimmed, transition: 'color 0.5s' }} />
            </div>
            {/* Live dot */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full warm-pulse"
                style={{ background: lightsOn > 0 ? C.gold : C.offGray }} />
              <span className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: lightsOn > 0 ? C.goldDim : C.textDimmed }}>
                {lightsOn > 0 ? 'Active' : 'Off'}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black" style={{ color: C.text }}>{lightsOn}</span>
              <span className="text-sm font-semibold mb-1" style={{ color: C.textMuted }}>/ {totalLights}</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.textDimmed }}>
              Lights On
            </div>
            <div className="text-[11px] font-medium mt-1.5" style={{ color: C.textDimmed }}>
              {lightsOn === 0 ? 'All lights off' :
               lightsOn === totalLights ? 'All lights active' :
               `${totalLights - lightsOn} light${totalLights - lightsOn > 1 ? 's' : ''} off`}
            </div>
          </div>
        </GCard>

        {/* ── 2. Temperature ── */}
        <GCard lift className="p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.28)' }}>
              <Thermometer size={18} strokeWidth={2.5} style={{ color: '#f97316' }} />
            </div>
            {/* Sensor count badge */}
            <div className="px-2 py-1 rounded-lg"
              style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.18)' }}>
              <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(249,115,22,0.75)' }}>
                {indoorSensors.length} sensor{indoorSensors.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black" style={{ color: C.text }}>{avgTemp}</span>
              <span className="text-base font-bold mb-0.5" style={{ color: 'rgba(249,115,22,0.7)' }}>°C</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.textDimmed }}>Avg Temperature</div>
            <div className="text-[11px] font-medium mt-1.5" style={{ color: C.textDimmed }}>
              {indoorSensors.map(s => `${s.room} ${s.temp}°`).join(' · ')}
            </div>
          </div>
        </GCard>

        {/* ── 3. Energy ── */}
        <GCard lift className="p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(62,95,79,0.12) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(62,95,79,0.12)', border: '1px solid rgba(62,95,79,0.25)' }}>
              <Zap size={18} strokeWidth={2.5} style={{ color: '#3E5F4F' }} />
            </div>
            {/* Delta chip — appears after each tick */}
            {energyDelta && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{
                  background: energyDelta.startsWith('+') ? 'rgba(62,95,79,0.12)' : 'rgba(96,165,250,0.12)',
                  border: `1px solid ${energyDelta.startsWith('+') ? 'rgba(62,95,79,0.25)' : 'rgba(96,165,250,0.25)'}`,
                }}>
                {energyDelta.startsWith('+') 
                  ? <TrendingUp size={10} style={{ color: '#3E5F4F' }} />
                  : <TrendingDown size={10} style={{ color: '#60a5fa' }} />}
                <span className="text-[9px] font-bold"
                  style={{ color: energyDelta.startsWith('+') ? '#3E5F4F' : '#60a5fa' }}>
                  {energyDelta} kWh
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black" style={{ color: C.text }}>{energyKwh.toFixed(2)}</span>
              <span className="text-sm font-bold mb-0.5" style={{ color: 'rgba(62,95,79,0.7)' }}>kWh</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.textDimmed }}>Energy Usage</div>
            <div className="text-[11px] font-medium mt-1.5" style={{ color: C.textDimmed }}>
              Updates every 30 s · {lightsOn} device{lightsOn !== 1 ? 's' : ''} drawing
            </div>
          </div>
        </GCard>

        {/* ── 4. Security ── */}
        <GCard lift className="p-6 flex flex-col gap-4 relative overflow-hidden"
          style={isAlertState ? {
            borderColor: 'rgba(248,113,113,0.60)',
            background: 'rgba(45,8,8,0.72)',
            boxShadow: '0 0 0 1px rgba(248,113,113,0.30), 0 20px 60px rgba(248,113,113,0.24)',
            animation: 'warm-pulse 2s ease-in-out infinite',
          } : !isSecure ? {
            borderColor: 'rgba(248,113,113,0.35)',
            background: 'rgba(40,10,10,0.55)',
            boxShadow: '0 0 0 1px rgba(248,113,113,0.20), 0 20px 50px rgba(248,113,113,0.12)',
          } : {}}>

          {/* Pulsing warning ring */}
          {(isAlertState || !isSecure) && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ boxShadow: `inset 0 0 40px rgba(248,113,113,${isAlertState ? '0.14' : '0.07'})`, animation: 'warm-pulse 2s ease-in-out infinite' }} />
          )}

          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: (isAlertState || !isSecure) ? 'rgba(248,113,113,0.18)' : 'rgba(96,165,250,0.12)',
                border: `1px solid ${(isAlertState || !isSecure) ? 'rgba(248,113,113,0.42)' : 'rgba(96,165,250,0.25)'}`,
                transition: 'all 0.5s ease',
              }}>
              {(isSecure && !isAlertState)
                ? <Shield size={18} strokeWidth={2.5} style={{ color: '#60a5fa' }} />
                : <AlertTriangle size={18} strokeWidth={2.5} style={{ color: '#f87171' }} />}
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{
                background: (isAlertState || !isSecure) ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.10)',
                border: `1px solid ${(isAlertState || !isSecure) ? 'rgba(248,113,113,0.28)' : 'rgba(96,165,250,0.20)'}`,
              }}>
              {isAlertState && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#f87171', animation: 'warm-pulse 0.8s ease-in-out infinite' }} />
              )}
              <span className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: (isAlertState || !isSecure) ? '#f87171' : '#60a5fa' }}>
                {isAlertState ? '⚠ Alert' : isSecure ? 'Secure' : 'Open'}
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-2xl font-black leading-tight"
              style={{ color: (isAlertState || !isSecure) ? '#fca5a5' : C.text, transition: 'color 0.5s' }}>
              {isAlertState ? 'Motion Detected!' : isSecure ? 'Home Secure' : 'Breach Detected'}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.textDimmed }}>
              Security
            </div>
            <div className="text-[11px] font-medium mt-1.5"
              style={{ color: (isAlertState || !isSecure) ? 'rgba(248,113,113,0.75)' : C.textDimmed }}>
              {isAlertState
                ? `Away mode · ${CAMERA_FEEDS.filter(c => c.motionDetected).length} camera${CAMERA_FEEDS.filter(c => c.motionDetected).length > 1 ? 's' : ''} triggered`
                : isSecure
                ? `${homeState.doors.length} entrances locked`
                : `Open: ${openDoors.map(d => d.name).join(', ')}`}
            </div>
          </div>

          {/* View Feed CTA — only visible in alert state */}
          {isAlertState && (
            <Link
              to="/security"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: 'rgba(248,113,113,0.18)',
                border: '1px solid rgba(248,113,113,0.45)',
                color: '#f87171',
                boxShadow: '0 4px 16px rgba(248,113,113,0.18)',
              }}
            >
              <Eye size={13} /> View Feed
            </Link>
          )}
        </GCard>

      </section>

      {/* ══════ FEATURED MOODS ══════ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: C.text }}>Featured Moods</h2>
            <p className="text-sm font-medium mt-1" style={{ color: C.textMuted }}>
              {activeMood
                ? <span>Scene active: <span style={{ color: C.gold }}>{activeMood}</span> — tap to deactivate</span>
                : 'Set the atmosphere with one tap'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Override notice */}
            {moodBrokenBy && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <AlertTriangle size={11} style={{ color: '#f87171' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>
                  Override: {moodBrokenBy}
                </span>
              </div>
            )}
            <Link to="/scenarios" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors hover:opacity-80"
              style={{ color: C.goldDim }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto scrollbar-none pb-4 -mx-2 px-2">
          {MOODS.map((m) => {
            const isActive      = activeMood === m.name;
            const isActivating  = activatingMood === m.name;
            const isOtherActive = activatingMood && activatingMood !== m.name;
            const preset        = MOOD_PRESETS[m.name];

            return (
              <button
                key={m.name}
                onClick={() => !activatingMood && triggerMood(m.name)}
                disabled={!!activatingMood}
                className="group/mood relative flex-shrink-0 w-[220px] h-[310px] rounded-3xl overflow-hidden text-left"
                style={{
                  border: isActive
                    ? `2px solid ${m.color}`
                    : isActivating
                      ? `2px solid ${m.color}80`
                      : '1px solid rgba(255,220,140,0.14)',
                  boxShadow: isActive
                    ? `0 0 30px ${m.color}40, 0 20px 60px rgba(0,0,0,0.5)`
                    : '0 20px 60px rgba(0,0,0,0.4)',
                  opacity: isOtherActive ? 0.45 : 1,
                  transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)',
                  cursor: activatingMood ? 'not-allowed' : 'pointer',
                }}
              >
                {/* ── Photo ── */}
                <img
                  src={m.img} alt={m.name}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover/mood:scale-110"
                  style={{
                    filter: isActive
                      ? 'brightness(0.6) saturate(1.4)'
                      : 'brightness(0.45) saturate(1.15)',
                    transition: 'filter 0.5s ease',
                  }}
                />

                {/* ── Base gradient overlay ── */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}
                />

                {/* ── Active color tint ── */}
                <div className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: m.color,
                    opacity: isActive ? 0.14 : isActivating ? 0.10 : 0,
                  }}
                />

                {/* ── Hover tint ── */}
                <div className="absolute inset-0 opacity-0 group-hover/mood:opacity-[0.12] transition-opacity duration-400"
                  style={{ background: m.color }}
                />

                {/* ── Activating glow ring (spinner variant) ── */}
                {isActivating && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 0 2px ${m.color}60`,
                      animation: 'warm-pulse 0.9s ease-in-out infinite',
                    }}
                  />
                )}

                {/* ── Active glowing border inner ring ── */}
                {isActive && (
                  <div className="absolute inset-[2px] rounded-[calc(1.5rem-2px)] pointer-events-none"
                    style={{ boxShadow: `inset 0 0 20px ${m.color}25` }}
                  />
                )}

                {/* ── TOP badges ── */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  {/* Status badge */}
                  {isActivating ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${m.color}50`, backdropFilter: 'blur(8px)' }}>
                      <Loader2 size={11} style={{ color: m.color, animation: 'spin 0.8s linear infinite' }} />
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: m.color }}>Applying…</span>
                    </div>
                  ) : isActive ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${m.color}70`, backdropFilter: 'blur(8px)' }}>
                      <CheckCircle2 size={11} style={{ color: m.color }} />
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: m.color }}>Active</span>
                    </div>
                  ) : <div />}

                  {/* Media badge for Cinematic */}
                  {(isActive || isActivating) && preset?.media?.tv && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                      <Tv size={9} style={{ color: 'rgba(255,255,255,0.7)' }} />
                      <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{preset.media.app}</span>
                    </div>
                  )}
                </div>

                {/* ── CONTENT (bottom) ── */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  {/* Icon + title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover/mood:scale-110"
                      style={{
                        background: `${m.color}${isActive ? '40' : '25'}`,
                        border: `1px solid ${m.color}${isActive ? '80' : '50'}`,
                        color: m.color,
                        boxShadow: isActive ? `0 0 12px ${m.color}50` : 'none',
                        transition: 'all 0.4s ease',
                      }}>
                      <m.icon size={17} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: '#F8F9FA' }}>{m.name}</p>
                      <p className="text-[10px] font-medium" style={{ color: 'rgba(248,249,250,0.45)' }}>{m.desc}</p>
                    </div>
                  </div>

                  {/* Device state summary chips (shown when active or activating) */}
                  {(isActive || isActivating) && preset?.summary && (
                    <div className="flex flex-wrap gap-1.5">
                      {preset.summary.map((chip, ci) => (
                        <span key={ci}
                          className="text-[9px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: `${m.color}18`,
                            border: `1px solid ${m.color}35`,
                            color: `${m.color}ee`,
                          }}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inactive: just description chips placeholder */}
                  {!isActive && !isActivating && (
                    <div className="flex gap-1.5 opacity-0 group-hover/mood:opacity-100 transition-opacity duration-300">
                      {preset?.summary?.slice(0, 2).map((chip, ci) => (
                        <span key={ci}
                          className="text-[9px] font-bold px-2 py-1 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════ LIVE DEVICES ══════ */}
      <section className="space-y-6">

        {/* ── Section header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: C.text }}>Live Devices</h2>
              <p className="text-sm font-medium mt-1" style={{ color: C.textMuted }}>
                {mockDevices.filter(d => d.status === 'on' || d.status === 'online').length} active
                &nbsp;·&nbsp; tap any card to control
              </p>
            </div>

            {/* ── Pulsing ● LIVE badge ── */}
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.25)',
                boxShadow: '0 0 18px rgba(74,222,128,0.10)',
              }}
            >
              {/* double-ring ping */}
              <span className="relative flex w-2.5 h-2.5 flex-shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full"
                  style={{ background: '#4ade80', opacity: 0.5 }}
                />
                <span
                  className="relative inline-flex rounded-full w-2.5 h-2.5"
                  style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade8099' }}
                />
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: '#4ade80' }}
              >
                Live
              </span>
            </div>
          </div>

          <Link
            to="/devices"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
            style={{ color: C.textDimmed }}
          >
            View all <ChevronRight size={13} />
          </Link>
        </div>

        {/* ── Smart Controller Overlay ── */}
        {selectedDevice && (
          <SmartDeviceOverlay
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            onUpdate={(patch) => {
              setMockDevices(prev =>
                prev.map(d => (d.id === selectedDevice.id ? { ...d, ...patch } : d))
              );
              setSelectedDevice(prev => ({ ...prev, ...patch }));
              /* Sync homeState lights so energy/mood detection stays accurate */
              if (selectedDevice.type === 'light') {
                setHomeState(prev => ({
                  ...prev,
                  lights: prev.lights.map(l =>
                    l.name === selectedDevice.name
                      ? {
                          ...l,
                          is_on: (patch.status ?? selectedDevice.status) === 'on',
                          brightness: patch.value ?? patch.brightness ?? l.brightness,
                        }
                      : l
                  ),
                }));
              }
            }}
          />
        )}

        {/* ── Device grid — conditional on data ── */}
        {displayDevices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayDevices.slice(0, 8).map(d => {
              const isMock = !!d.id && !d._id;
              const isOn   = isMock
                ? (d.type === 'security' ? d.locked : d.status === 'on' || d.status === 'online')
                : d.state === 'ON';
              const adapter = { ...d, _id: d.id, state: isOn ? 'ON' : 'OFF' };

              return (
                <DeviceCard
                  key={d.id ?? d._id}
                  device={adapter}
                  onToggle={() => {
                    if (isMock) {
                      setSelectedDevice(d);
                    } else {
                      handleToggle(d._id, d.state);
                    }
                  }}
                />
              );
            })}
          </div>
        ) : (
          /* ── Empty state ── */
          <GCard
            className="py-24 flex flex-col items-center gap-5 text-center"
            style={{ borderStyle: 'dashed' }}
          >
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Wind size={28} style={{ color: C.textDimmed }} />
            </div>
            <div>
              <p className="text-lg font-black" style={{ color: C.textMuted }}>
                No devices registered
              </p>
              <p className="text-sm font-medium mt-1.5" style={{ color: C.textDimmed }}>
                Register your first smart unit to begin controlling your home.
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="px-7 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                background: C.goldBg,
                border: `1px solid ${C.goldBorder}`,
                color: C.gold,
                boxShadow: `0 8px 24px rgba(227,197,152,0.12)`,
              }}
            >
              + Register Device
            </button>
          </GCard>
        )}
      </section>

      {/* ══════ QUICK ACTIONS ══════ */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: C.text }}>Quick Actions</h2>
            <p className="text-sm font-medium mt-1" style={{ color: C.textMuted }}>
              Context-aware · {new Date().getHours() >= 23 || new Date().getHours() < 5 ? 'Night protocol active' : new Date().getHours() < 10 ? 'Morning mode' : new Date().getHours() < 18 ? 'Daytime mode' : 'Evening mode'}
            </p>
          </div>
          {/* Context badge showing most-likely action */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(227,197,152,0.09)', border: '1px solid rgba(227,197,152,0.22)' }}>
            <span className="w-1.5 h-1.5 rounded-full warm-pulse" style={{ background: C.gold }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.goldDim }}>
              {getContextActions(new Date().getHours(), isAwayMode)[0]?.label} suggested
            </span>
          </div>
        </div>

        {/* ── Floating slider overlay ── */}
        {floatingSlider && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center pb-32 px-6"
            style={{ background: 'rgba(8,4,1,0.55)', backdropFilter: 'blur(16px)' }}
            onClick={e => { if (e.target === e.currentTarget) setFloatingSlider(null); }}
          >
            <div
              className="w-full max-w-sm rounded-[2rem] p-6 space-y-5"
              style={{
                background: 'linear-gradient(160deg, rgba(26,31,29,0.97) 0%, rgba(13,26,21,0.99) 100%)',
                border: `1px solid ${floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.30)' : 'rgba(62,95,79,0.25)'}`,
                boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px ${floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.10)' : 'rgba(62,95,79,0.08)'}`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center mb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.18)' : 'rgba(62,95,79,0.15)',
                      border: `1px solid ${floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.35)' : 'rgba(62,95,79,0.30)'}`,
                    }}>
                    {floatingSlider.type === 'brightness'
                      ? <Sun size={18} style={{ color: '#E3C598' }} />
                      : <Snowflake size={18} style={{ color: '#3E5F4F' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: C.text }}>
                      {floatingSlider.type === 'brightness' ? 'Master Brightness' : 'Master Temperature'}
                    </p>
                    <p className="text-[10px] font-medium" style={{ color: C.textMuted }}>
                      {floatingSlider.type === 'brightness' ? `All ${homeState.lights.length} lights` : `${homeState.climate.length} climate sensors`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setFloatingSlider(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: C.textMuted }}>
                  <X size={14} />
                </button>
              </div>

              {/* Value display */}
              <div className="text-center">
                <span className="text-5xl font-black"
                  style={{ color: floatingSlider.type === 'brightness' ? '#D4AF37' : '#3E5F4F' }}>
                  {floatingSlider.value}
                </span>
                <span className="text-xl font-bold ml-1"
                  style={{ color: floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.6)' : 'rgba(62,95,79,0.6)' }}>
                  {floatingSlider.type === 'brightness' ? '%' : '°C'}
                </span>
              </div>

              {/* Slider track */}
              <div className="space-y-3">
                <input
                  type="range"
                  min={floatingSlider.type === 'brightness' ? 0 : 16}
                  max={floatingSlider.type === 'brightness' ? 100 : 30}
                  value={floatingSlider.value}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFloatingSlider(prev => ({ ...prev, value: val }));
                    if (floatingSlider.type === 'brightness') applyMasterBrightness(val);
                    else applyMasterTemp(val);
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: floatingSlider.type === 'brightness'
                      ? `linear-gradient(to right, #E3C598 ${floatingSlider.value}%, rgba(255,255,255,0.10) ${floatingSlider.value}%)`
                      : `linear-gradient(to right, #3E5F4F ${((floatingSlider.value - 16) / 14) * 100}%, rgba(255,255,255,0.10) ${((floatingSlider.value - 16) / 14) * 100}%)`,
                    accentColor: floatingSlider.type === 'brightness' ? '#D4AF37' : '#3E5F4F',
                  }}
                />
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold" style={{ color: C.textDimmed }}>
                    {floatingSlider.type === 'brightness' ? '0%' : '16°C'}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: C.textDimmed }}>
                    {floatingSlider.type === 'brightness' ? '100%' : '30°C'}
                  </span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                {(floatingSlider.type === 'brightness'
                  ? [{ label: 'Off', val: 0 }, { label: 'Dim', val: 20 }, { label: 'Cozy', val: 55 }, { label: 'Full', val: 100 }]
                  : [{ label: '18°', val: 18 }, { label: '20°', val: 20 }, { label: '22°', val: 22 }, { label: '26°', val: 26 }]
                ).map(p => (
                  <button key={p.label}
                    onClick={() => {
                      setFloatingSlider(prev => ({ ...prev, value: p.val }));
                      if (floatingSlider.type === 'brightness') applyMasterBrightness(p.val);
                      else applyMasterTemp(p.val);
                    }}
                    className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all hover:scale-[1.04] active:scale-95"
                    style={{
                      background: floatingSlider.value === p.val
                        ? (floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.22)' : 'rgba(62,95,79,0.20)')
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${floatingSlider.value === p.val
                        ? (floatingSlider.type === 'brightness' ? 'rgba(212,175,55,0.45)' : 'rgba(62,95,79,0.40)')
                        : 'rgba(255,255,255,0.09)'}`,
                      color: floatingSlider.value === p.val
                        ? (floatingSlider.type === 'brightness' ? '#D4AF37' : '#3E5F4F')
                        : C.textMuted,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Action cards grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {getContextActions(new Date().getHours(), isAwayMode).map((a, idx) => {
            const btnState  = qaBtnState[a.id] || 'idle';
            const blockedBy = qaBlocked[a.id];
            const isFirst   = idx === 0;
            const isProcessing = btnState === 'processing';
            const isSuccess    = btnState === 'success';
            const isBlocked    = btnState === 'blocked';

            // Colour overrides per state
            const stateAccent = isBlocked ? '#f5c842' : isSuccess ? '#4ade80' : a.accent;

            return (
              <div
                key={a.id}
                className={`glass-card rounded-3xl p-6 flex flex-col gap-4 text-left cursor-pointer relative overflow-hidden transition-all duration-300 select-none
                  ${!isProcessing && !isBlocked ? 'glass-card-lift' : ''}`}
                style={{
                  background: isBlocked
                    ? 'linear-gradient(135deg, rgba(245,200,66,0.10) 0%, rgba(255,255,255,0.04) 100%)'
                    : isSuccess
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.10) 0%, rgba(255,255,255,0.04) 100%)'
                    : isFirst
                    ? `linear-gradient(135deg, ${a.accent}12 0%, rgba(255,255,255,0.04) 100%)`
                    : undefined,
                  borderColor: isBlocked ? 'rgba(245,200,66,0.40)'
                    : isSuccess ? 'rgba(74,222,128,0.35)'
                    : isFirst ? `${a.accent}30`
                    : undefined,
                  boxShadow: isBlocked ? '0 0 20px rgba(245,200,66,0.10)'
                    : isSuccess ? '0 0 20px rgba(74,222,128,0.12)'
                    : isFirst ? `0 8px 30px ${a.accent}12`
                    : undefined,
                }}
                onClick={() => !isProcessing && handleQuickAction(a.id)}
                onMouseDown={() => a.longPress && handleLongPressStart(a.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => a.longPress && handleLongPressStart(a.id)}
                onTouchEnd={handleLongPressEnd}
              >
                {/* Context-priority crown badge on slot 0 */}
                {isFirst && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: `${a.accent}18`, border: `1px solid ${a.accent}35` }}>
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: a.accent }}>Suggested</span>
                  </div>
                )}

                {/* Long-press hint */}
                {a.longPress && !isProcessing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-40">
                    <SlidersHorizontal size={10} style={{ color: C.textMuted }} />
                    <span className="text-[8px] font-medium" style={{ color: C.textMuted }}>Hold</span>
                  </div>
                )}

                {/* Icon block */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${stateAccent}18`,
                    border: `1px solid ${stateAccent}30`,
                    color: stateAccent,
                    // Gold rhythmic pulse while processing
                    animation: isProcessing ? 'warm-pulse 0.9s ease-in-out infinite' : 'none',
                    boxShadow: isProcessing ? `0 0 18px ${C.gold}40` : 'none',
                    transition: 'all 0.4s ease',
                  }}
                >
                  {isProcessing
                    ? <Loader2 size={20} strokeWidth={2.5} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : isSuccess
                    ? <CheckCircle2 size={20} strokeWidth={2.5} />
                    : isBlocked
                    ? <AlertTriangle size={20} strokeWidth={2.5} />
                    : <a.icon size={20} strokeWidth={2.5} />}
                </div>

                {/* Text */}
                <div className="flex-1">
                  <p className="text-sm font-black leading-tight"
                    style={{ color: isBlocked ? '#f5c842' : isSuccess ? '#4ade80' : C.text }}>
                    {isSuccess ? 'Done!' : isBlocked ? 'Blocked' : a.label}
                  </p>
                  <p className="text-[11px] font-medium mt-1 leading-snug"
                    style={{ color: isBlocked ? 'rgba(245,200,66,0.65)' : C.textMuted }}>
                    {isProcessing ? 'Processing…'
                      : isSuccess ? `${a.label} applied`
                      : isBlocked ? `${blockedBy} is open`
                      : a.longPress ? a.sub + ' · hold for slider'
                      : a.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Spacer */}
      <div className="h-8" />

      {/* ══════ TOAST ══════ */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-4 px-8 py-4 rounded-full transition-all"
          style={{
            background: 'rgba(26,31,29,0.85)',
            border: `1px solid ${C.goldBorder}`,
            backdropFilter: 'blur(25px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          }}>
          <span className="w-2.5 h-2.5 rounded-full warm-pulse" style={{ background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
          <p className="text-sm font-bold" style={{ color: C.text }}>{toast}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
