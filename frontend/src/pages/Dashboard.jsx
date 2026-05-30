import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, ChevronRight, Plus, X, CheckCircle2, ChevronDown, Lock, Send, Flame, Link2, Zap, Lightbulb, DoorOpen, AppWindow, Thermometer, Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FloorPlan from '../components/FloorPlan';
import DeviceCard from '../components/DeviceCard';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import { useFloorPlanState } from '../hooks/useFloorPlanState';
import { useGasMonitor } from '../hooks/useGasMonitor';
import { useDht } from '../hooks/useDht';
import api from '../api/axios';

/* ── Live Stats Bar ───────────────────────────────────────── */
function LiveStatsBar() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
    const id = setInterval(() => api.get('/stats').then(r => setStats(r.data)).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);
  const items = [
    { label: 'Total Devices',   value: stats?.totalDevices  ?? '–', accent: '#60a5fa' },
    { label: 'Active Now',      value: stats?.activeDevices ?? '–', accent: '#4ade80' },
    { label: 'Residents',       value: stats?.residents     ?? '–', accent: '#a78bfa' },
    { label: 'Unread Messages', value: stats?.unreadMessages ?? '–', accent: '#fbbf24' },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ label, value, accent }, i) => (
        <motion.div
          key={label}
          className="rounded-[1.5rem] border px-5 py-4 flex flex-col gap-1.5 relative overflow-hidden"
          style={{
            background: `${accent}0a`,
            borderColor: `${accent}28`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 8px 32px ${accent}10`,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full blur-xl" style={{ background: `${accent}18` }} />
          <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: `${accent}88` }}>{label}</p>
          <p className="text-3xl font-black tabular-nums leading-none" style={{ color: accent }}>{value}</p>
          <div className="h-px w-8 rounded-full mt-1" style={{ background: `${accent}40` }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Climate Card (live DHT11 temperature + humidity) ─────── */
function ClimateCard() {
  const { temperature, humidity, lastDhtRead } = useDht();
  const hasReading = temperature != null && humidity != null;

  const tempColor =
    !hasReading ? '#94a3b8' :
    temperature <= 19 ? '#60a5fa' :
    temperature <= 26 ? '#4ade80' :
    temperature <= 30 ? '#f59e0b' : '#ef4444';

  const humColor =
    !hasReading ? '#94a3b8' :
    humidity < 30 ? '#f59e0b' :
    humidity <= 60 ? '#22d3ee' : '#3b82f6';

  const lastSeenLabel = (() => {
    if (!lastDhtRead) return 'waiting for sensor…';
    const ageSec = Math.max(0, Math.round((Date.now() - new Date(lastDhtRead).getTime()) / 1000));
    if (ageSec < 5)    return 'live · now';
    if (ageSec < 60)   return `live · ${ageSec}s ago`;
    if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
    return `${Math.round(ageSec / 3600)}h ago`;
  })();

  return (
    <div
      className="rounded-[2rem] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
      }}
    >
      {/* Temperature */}
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${tempColor}14, ${tempColor}06)`,
          border: `1px solid ${tempColor}33`,
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${tempColor}22`,
            border: `1px solid ${tempColor}55`,
            boxShadow: `0 0 14px ${tempColor}44`,
          }}
        >
          <Thermometer size={22} style={{ color: tempColor }} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${tempColor}cc` }}>
            Temperature
          </p>
          <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color: tempColor }}>
            {hasReading ? temperature.toFixed(1) : '--'}
            <span className="text-sm font-bold opacity-60 ml-1">°C</span>
          </p>
          <p className="text-[9px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lastSeenLabel}
          </p>
        </div>
      </div>

      {/* Humidity */}
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${humColor}14, ${humColor}06)`,
          border: `1px solid ${humColor}33`,
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${humColor}22`,
            border: `1px solid ${humColor}55`,
            boxShadow: `0 0 14px ${humColor}44`,
          }}
        >
          <Droplets size={22} style={{ color: humColor }} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${humColor}cc` }}>
            Humidity
          </p>
          <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color: humColor }}>
            {hasReading ? humidity.toFixed(0) : '--'}
            <span className="text-sm font-bold opacity-60 ml-1">%</span>
          </p>
          <p className="text-[9px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {hasReading
              ? humidity < 30 ? 'dry'
                : humidity <= 60 ? 'comfortable'
                : 'humid'
              : 'waiting for sensor…'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Gas Sensor PPM Gauge Card ───────────────────────────── */
function GasSensorCard() {
  const { gasLevel, threshold, emergencyMode, gasValveOpen } = useGasMonitor();
  const isLeak   = emergencyMode;
  const pct      = Math.min(100, Math.round((gasLevel / Math.max(threshold, 1)) * 100));
  const accent   = isLeak ? '#ef4444' : '#4ade80';
  const bgAccent = isLeak ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.06)';
  const border   = isLeak ? 'rgba(239,68,68,0.35)' : 'rgba(74,222,128,0.25)';

  return (
    <div
      className="rounded-[2rem] p-5 flex items-center gap-5 transition-all duration-500"
      style={{
        background: bgAccent,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(24px)',
        boxShadow: isLeak
          ? '0 0 32px rgba(239,68,68,0.18), 0 20px 40px rgba(0,0,0,0.3)'
          : '0 20px 40px rgba(0,0,0,0.25)',
        animation: isLeak ? 'warm-pulse 0.8s ease-in-out infinite' : undefined,
      }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isLeak ? 'rgba(239,68,68,0.18)' : 'rgba(74,222,128,0.12)',
          border: `1px solid ${border}`,
          boxShadow: `0 0 16px ${accent}44`,
        }}
      >
        <Flame size={22} style={{ color: accent }} strokeWidth={2.5} />
      </div>

      {/* Data */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${accent}cc` }}>
              Kitchen Gas Sensor
            </p>
            <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color: accent }}>
              {gasLevel} <span className="text-sm font-bold opacity-60">ppm</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {/* Status badge */}
            <span
              className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
              style={{
                background: isLeak ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.15)',
                border: `1px solid ${border}`,
                color: accent,
              }}
            >
              {isLeak ? '⚠ GAS LEAK' : '✓ Secure'}
            </span>
            {/* Valve state */}
            <span
              className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
              style={{
                background: gasValveOpen ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
                border: `1px solid ${gasValveOpen ? 'rgba(239,68,68,0.25)' : 'rgba(74,222,128,0.2)'}`,
                color: gasValveOpen ? '#fca5a5' : '#86efac',
              }}
            >
              Valve: {gasValveOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        {/* Gauge bar */}
        <div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isLeak
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : 'linear-gradient(90deg, #16a34a, #4ade80)',
                boxShadow: `0 0 8px ${accent}88`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>0 ppm</span>
            <span className="text-[9px] font-bold" style={{ color: isLeak ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
              Threshold: {threshold} ppm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shimmer skeleton for device cards during refresh ── */
function DeviceSkeleton() {
  return (
    <div
      className="relative flex flex-col gap-5 rounded-[2rem] border p-6 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.07)',
        minHeight: 190,
      }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
          animation: 'shimmer-sweep 1.6s ease-in-out infinite',
        }}
      />
      {/* Icon placeholder */}
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-6 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>
      {/* Name + room placeholder */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-2.5 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      {/* Status placeholder */}
      <div className="mt-auto flex items-center justify-between">
        <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-2 w-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ADD DEVICE MODAL — Glassmorphic, Sentence-style, Aura vibe
══════════════════════════════════════════════════════════════ */
const DEVICE_TYPES = [
  { value: 'light',   label: 'Light',          emoji: '💡', accent: '#fde68a' },
  { value: 'door',    label: 'Door / Lock',     emoji: '🚪', accent: '#60a5fa' },
  { value: 'ac',      label: 'AC / Climate',    emoji: '❄️', accent: '#7dd3fc' },
  { value: 'tv',      label: 'TV / Media',      emoji: '📺', accent: '#a78bfa' },
  { value: 'camera',  label: 'Camera',          emoji: '📷', accent: '#4ade80' },
  { value: 'machine', label: 'Washing Machine', emoji: '🌀', accent: '#f97316' },
  { value: 'sensor',  label: 'Sensor',          emoji: '🌡️', accent: '#f87171' },
  { value: 'window',  label: 'Window / Blinds', emoji: '🪟', accent: '#7dd3fc' },
];

const ROOM_OPTIONS = [
  { value: 'living_room', label: 'Living Room', emoji: '🛋️' },
  { value: 'bedroom',     label: 'Bedroom',     emoji: '🛏️' },
  { value: 'kitchen',     label: 'Kitchen',     emoji: '🍳' },
  { value: 'bathroom',    label: 'Bathroom',    emoji: '🚿' },
  { value: 'garage',      label: 'Garage',      emoji: '🚗' },
  { value: 'utility',     label: 'Utility',     emoji: '🔧' },
];

const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#E3C598',
};

function AddDeviceModal({ onClose, onAdd, houseCode }) {
  const [name, setName]           = useState('');
  const [type, setType]           = useState('');
  const [room, setRoom]           = useState('living_room');
  const [customTopic, setCustomTopic] = useState('');
  const [typeOpen, setTypeOpen]   = useState(false);
  const [roomOpen, setRoomOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  const selectedType = DEVICE_TYPES.find(t => t.value === type);
  const selectedRoom = ROOM_OPTIONS.find(r => r.value === room);
  const accent       = selectedType?.accent ?? C.gold;
  const canSave      = name.trim() && type;

  // Auto-generate MQTT topic; user can override via customTopic
  const autoTopic = `${String(houseCode || 'HOME').toLowerCase()}/${type || 'device'}/${name.trim().toLowerCase().replace(/\s+/g, '-') || 'new'}`;
  const topic = customTopic.trim() || autoTopic;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      await onAdd({ name: name.trim(), type, room, topic });
      setSuccess(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add device');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,20,0.88)', backdropFilter: 'blur(30px)' }}
      onClick={e => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(14,18,36,0.99) 0%, rgba(8,12,26,0.99) 100%)',
          border: `1px solid ${accent}30`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px ${accent}10, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}1a 0%, transparent 70%)`, transform: 'translate(35%,-35%)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}>
              {selectedType?.emoji ?? '📦'}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: C.text }}>Add Device</h2>
              <p className="text-[11px] font-semibold" style={{ color: C.muted }}>Auto-linked to House {houseCode || 'M1725'}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="px-7 pt-5 pb-2 space-y-5">

          {/* Device Name */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>Device Name</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Bedroom Fan"
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${name ? accent + '45' : 'rgba(255,255,255,0.10)'}`,
                color: C.text,
                borderRadius: '1rem',
                padding: '0.7rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Device Type */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>Device Type</p>
            <div className="relative">
              <button type="button" onClick={() => { setTypeOpen(o => !o); setRoomOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                style={{
                  background: selectedType ? `${selectedType.accent}12` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedType ? selectedType.accent + '40' : 'rgba(255,255,255,0.10)'}`,
                  color: selectedType ? selectedType.accent : C.muted,
                  fontWeight: 700,
                }}>
                <span className="text-lg">{selectedType?.emoji ?? '📦'}</span>
                <span className="flex-1 text-sm">{selectedType?.label ?? 'Select type…'}</span>
                <ChevronDown size={14} className="opacity-60" style={{ transform: typeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {typeOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 rounded-2xl overflow-hidden py-1 w-full"
                  style={{ background: 'rgba(8,12,26,0.98)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(30px)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  {DEVICE_TYPES.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => { setType(opt.value); setTypeOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-left transition-all hover:bg-white/[0.05]"
                      style={{ color: opt.value === type ? opt.accent : C.muted }}>
                      <span>{opt.emoji}</span><span>{opt.label}</span>
                      {opt.value === type && <CheckCircle2 size={12} className="ml-auto" style={{ color: opt.accent }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>Room</p>
            <div className="relative">
              <button type="button" onClick={() => { setRoomOpen(o => !o); setTypeOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: C.text,
                  fontWeight: 700,
                }}>
                <span className="text-lg">{selectedRoom?.emoji ?? '🏠'}</span>
                <span className="flex-1 text-sm">{selectedRoom?.label ?? 'Select room…'}</span>
                <ChevronDown size={14} className="opacity-60" style={{ transform: roomOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {roomOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 rounded-2xl overflow-hidden py-1 w-full"
                  style={{ background: 'rgba(8,12,26,0.98)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(30px)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  {ROOM_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => { setRoom(opt.value); setRoomOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-left transition-all hover:bg-white/[0.05]"
                      style={{ color: opt.value === room ? C.gold : C.muted }}>
                      <span>{opt.emoji}</span><span>{opt.label}</span>
                      {opt.value === room && <CheckCircle2 size={12} className="ml-auto" style={{ color: C.gold }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom MQTT Topic */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>MQTT Topic <span style={{ color: C.muted, textTransform: 'none', fontSize: '9px' }}>(leave blank for auto)</span></p>
            <input
              type="text"
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              placeholder={autoTopic}
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${customTopic ? accent + '45' : 'rgba(255,255,255,0.10)'}`,
                color: C.text,
                borderRadius: '1rem',
                padding: '0.7rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            {name && type && (
              <p className="text-[10px] mt-1.5 px-1 font-mono font-bold" style={{ color: accent }}>
                command/{topic}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-bold px-3 py-2 rounded-xl" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)' }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12 }}>
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-75 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: success ? 'linear-gradient(135deg,#4ade80,#22c55e)' : canSave ? `linear-gradient(135deg,${accent},${accent}bb)` : 'rgba(255,255,255,0.08)',
              color: canSave ? '#08100D' : C.dimmed,
              boxShadow: canSave ? `0 8px 24px ${accent}45` : 'none',
              minWidth: 140,
            }}>
            {success ? (
              <><CheckCircle2 size={15} /> Added!</>
            ) : saving ? (
              <><span style={{ animation: 'spin 1s linear infinite', display:'inline-block' }}>⚙️</span> Saving…</>
            ) : (
              <><Plus size={15} strokeWidth={3} /> Add Device</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROOM_KEYS = ['bathroom', 'utility', 'bedroom', 'kitchen', 'living_room', 'garage', 'entrance'];
const ROOM_LABELS = {
  bathroom: 'Bathroom',
  utility: 'Utility',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  living_room: 'Living Room',
  garage: 'Garage',
  entrance: 'Entrance',
};

const normalizeRoom = (room) => {
  const lowered = String(room || '').trim().toLowerCase();
  if (!lowered) return '';
  if (ROOM_KEYS.includes(lowered)) return lowered;
  if (lowered === 'living room' || lowered === 'studio') return 'living_room';
  if (lowered === 'kitchenette') return 'kitchen';
  if (lowered.startsWith('room:')) return normalizeRoom(lowered.slice(5));
  if (lowered.startsWith('room-')) return normalizeRoom(lowered.slice(5));
  return lowered;
};

const normalizeActionKey = (value) => String(value || '').trim().toLowerCase();

const Dashboard = ({ accessMode = 'admin' }) => {
  const { user, myPermissionRequests, hasApprovedPermission, requestPermission, isSuperAdmin } = useContext(AuthContext);
  const isResidentView = accessMode === 'resident';
  const [now, setNow] = useState(() => new Date());
  const [selectedControlDeviceId, setSelectedControlDeviceId] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [busyRequestKey, setBusyRequestKey] = useState('');

  const {
    floorPlanState,
    toggleDevice: toggleFloorDevice,
    setLightingMode,
    toggleLockdown,
    toggleAway,
    updateDeviceState,
    addDevice: addFloorDevice,
    isRefreshing,
    isAdmin: isFloorPlanAdmin,
  } = useFloorPlanState();

  const isAdmin = isFloorPlanAdmin && !isResidentView;

  const canControlModes = useMemo(() => {
    if (!isResidentView) return true;
    return hasApprovedPermission('global:controls') || hasApprovedPermission('modes:controls');
  }, [hasApprovedPermission, isResidentView]);

  const canControlRoom = useCallback((room) => {
    if (!isResidentView) return true;

    const normalizedRoom = normalizeRoom(room);
    const assignedRoom = normalizeRoom(user?.assignedRoom || '');
    if (!normalizedRoom) return false;
    if (normalizedRoom === assignedRoom) return true;

    return (
      hasApprovedPermission(`room:${normalizedRoom}`, normalizedRoom)
      || hasApprovedPermission(normalizedRoom, normalizedRoom)
    );
  }, [hasApprovedPermission, isResidentView, user?.assignedRoom]);

  const canControlDevice = useCallback((device) => {
    if (!isResidentView) return true;
    if (!device?._id) return false;

    if (hasApprovedPermission('global:controls') || hasApprovedPermission('modes:controls')) {
      return true;
    }

    const room = normalizeRoom(device.room);
    if (canControlRoom(room)) {
      return true;
    }

    return hasApprovedPermission(`device:${String(device._id).toLowerCase()}`, room);
  }, [canControlRoom, hasApprovedPermission, isResidentView]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const liveDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [now]);

  const deviceStats = useMemo(() => {
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices : [];
    const lights = devices.filter((device) => {
      const type = String(device?.type || '').toLowerCase();
      return type === 'light' || type === 'lamp';
    });
    const doors    = devices.filter((device) => String(device?.type || '').toLowerCase() === 'door');
    const windows  = devices.filter((device) => ['window','blind','blinds'].includes(String(device?.type || '').toLowerCase()));

    return {
      total:       devices.length,
      active:      devices.filter((device) => device?.state === 'ON').length,
      lightsOn:    lights.filter((light) => light.state === 'ON').length,
      doorsOpen:   doors.filter((door) => door.state === 'ON').length,
      windowsOpen: windows.filter((w) => w.state === 'ON').length,
    };
  }, [floorPlanState.devices]);

  const controlPanelDevices = useMemo(() => {
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices : [];
    return devices
      .map((device) => {
      const type = String(device?.type || '').toLowerCase();
      const isWindowDev = ['window','blind','blinds'].includes(type);
      const mappedType = type === 'light' || type === 'lamp'
        ? 'light'
        : type === 'door'
          ? 'security'
          : type === 'camera'
            ? 'camera'
          : type === 'tv'
            ? 'media'
          : isWindowDev
            ? 'window'
            : 'appliance';

      return {
        ...device,
        type: mappedType,
        status: device.state === 'ON' ? 'on' : 'off',
        value: mappedType === 'light' ? Number(device.brightness || 0) : device.value,
        // Pass openPct through for window cards
        openPct: isWindowDev ? Number(device.openPct ?? (device.state === 'ON' ? 100 : 0)) : undefined,
        locked: mappedType === 'security' ? device.state !== 'ON' : undefined,
        accessLocked: !canControlDevice(device),
        lastSeen: 'Live',
      };
      });
  }, [canControlDevice, floorPlanState.devices]);

  const cameraDevices = useMemo(() => {
    return (Array.isArray(floorPlanState.devices) ? floorPlanState.devices : []).filter((device) => {
      const type = String(device?.type || '').toLowerCase();
      return type === 'camera';
    });
  }, [floorPlanState.devices]);

  const selectedControlDevice = useMemo(() => {
    if (!selectedControlDeviceId) return null;
    return controlPanelDevices.find((device) => device._id === selectedControlDeviceId) || null;
  }, [controlPanelDevices, selectedControlDeviceId]);

  const handleAddDevice = async (deviceData) => {
    try {
      /* addDevice now does optimistic update + silent re-fetch internally */
      await addFloorDevice(deviceData);
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  };

  const handleToggleDevice = async (device) => {
    if (!device?._id || !canControlDevice(device)) return;
    try {
      await toggleFloorDevice(device._id);
    } catch (error) {
      console.error('Error toggling device:', error);
      throw error;
    }
  };

  const handleAdvancedUpdate = async (device, patch) => {
    if (!device || !device._id || !canControlDevice(device)) return;

    const payload = {};

    if (patch.status === 'on' || patch.status === 'off') {
      payload.state = patch.status === 'on' ? 'ON' : 'OFF';
    }

    if (patch.locked !== undefined) {
      payload.state = patch.locked ? 'OFF' : 'ON';
    }

    if (patch.brightness !== undefined) {
      payload.brightness = Number(patch.brightness);
    }

    if (patch.value !== undefined && device.type === 'light') {
      payload.brightness = Number(patch.value);
    }

    if (typeof patch.color === 'string') {
      payload.color = patch.color;
    }

    if (typeof patch.effect === 'string') {
      payload.effect = patch.effect;
    }

    if (Object.keys(payload).length === 0) return;
    await updateDeviceState(device._id, payload);
  };

  const requestStatusByFeature = useMemo(() => {
    const latestByKey = new Map();
    const requests = Array.isArray(myPermissionRequests) ? myPermissionRequests : [];

    requests.forEach((request) => {
      const key = `${normalizeActionKey(request.actionKey)}|${normalizeRoom(request.room)}`;
      const previous = latestByKey.get(key);
      if (!previous || new Date(request.createdAt) > new Date(previous.createdAt)) {
        latestByKey.set(key, request);
      }
    });

    return latestByKey;
  }, [myPermissionRequests]);

  const getRequestStatus = useCallback((actionKey, room = '') => {
    const key = `${normalizeActionKey(actionKey)}|${normalizeRoom(room)}`;
    const request = requestStatusByFeature.get(key);
    return request?.status || 'none';
  }, [requestStatusByFeature]);

  const lockedFeatures = useMemo(() => {
    if (!isResidentView) return [];

    const features = [];
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices : [];

    if (!canControlModes) {
      features.push({
        id: 'feature:global-controls',
        kind: 'feature',
        label: 'Global home controls (modes/away/lockdown)',
        actionKey: 'global:controls',
        room: '',
      });
    }

    const rooms = new Set(devices.map((device) => normalizeRoom(device.room)).filter(Boolean));
    [...rooms].forEach((room) => {
      if (!canControlRoom(room)) {
        features.push({
          id: `room:${room}`,
          kind: 'room',
          label: `Room: ${ROOM_LABELS[room] || room}`,
          actionKey: `room:${room}`,
          room,
        });
      }
    });

    devices.forEach((device) => {
      if (!canControlDevice(device)) {
        features.push({
          id: `device:${device._id}`,
          kind: 'device',
          label: `Device: ${device.name}`,
          actionKey: `device:${String(device._id).toLowerCase()}`,
          room: normalizeRoom(device.room),
        });
      }
    });

    return features;
  }, [canControlDevice, canControlModes, canControlRoom, floorPlanState.devices, isResidentView]);

  const handleRequestAccess = async (feature) => {
    if (!feature?.actionKey) return;

    const status = getRequestStatus(feature.actionKey, feature.room);
    if (status === 'pending') return;

    setBusyRequestKey(feature.id);
    const result = await requestPermission({
      actionKey: feature.actionKey,
      actionLabel: feature.label,
      room: feature.room || '',
    });
    setBusyRequestKey('');

  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden p-4 md:p-8"
      style={{ background: 'linear-gradient(155deg, #07080E 0%, #0D1420 48%, #090A13 100%)' }}>
      <div className="pointer-events-none absolute -left-32 -top-16 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-[450px] w-[450px] rounded-full bg-violet-600/8 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 bottom-40 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/5 blur-3xl" />

      {showAddDevice && (
        <AddDeviceModal
          onClose={() => setShowAddDevice(false)}
          onAdd={handleAddDevice}
          houseCode={user?.houseCode || 'M1725'}
        />
      )}

      <div className="relative z-10">
      {selectedControlDevice ? (
        <SmartDeviceOverlay
          device={selectedControlDevice}
          onClose={() => setSelectedControlDeviceId(null)}
          onUpdate={(patch) => handleAdvancedUpdate(selectedControlDevice, patch).catch(() => {})}
        />
      ) : null}

      {/* Greeting Panel */}
      <motion.div
        className="relative mb-8 overflow-hidden rounded-[2rem] p-7"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient glow spots */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-sky-500/8 blur-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/7 blur-xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black select-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.22) 0%, rgba(167,139,250,0.16) 100%)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  boxShadow: '0 0 28px rgba(96,165,250,0.18)',
                  color: '#fff',
                }}
              >
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2"
                style={{ background: '#4ade80', borderColor: '#07080E', boxShadow: '0 0 10px rgba(74,222,128,0.7)' }}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(148,163,184,0.65)' }}>
                {isResidentView ? 'Resident' : isSuperAdmin ? '⚡ Super Admin' : 'Admin'} · Smart Home
              </p>
              <h1
                className="mt-0.5 text-3xl font-black md:text-4xl"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {greeting()}, {(user?.name || 'User').split(' ')[0]}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.9)' }} />
                  {liveDate}
                </span>
                {user?.houseCode && (
                  <button
                    onClick={() => navigator.clipboard.writeText(user.houseCode).then(() => alert(`House code "${user.houseCode}" copied! Share it with your residents.`))}
                    title="Click to copy house code"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all hover:scale-105 cursor-pointer"
                    style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.32)', color: '#fbbf24' }}
                  >
                    🏠 {user.houseCode} · Copy
                  </button>
                )}
                {user?.houseCode && isAdmin && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/auth/resident/register?house=${user.houseCode}`;
                      navigator.clipboard.writeText(url).then(() => alert('Invite link copied! Share it with residents.'));
                    }}
                    title="Copy resident invite link"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all hover:scale-105 cursor-pointer"
                    style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.28)', color: '#4ade80' }}
                  >
                    <Link2 size={10} /> Invite Link
                  </button>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddDevice(true)}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                boxShadow: '0 8px 28px rgba(56,189,248,0.28)',
                color: '#020617',
              }}
            >
              <Plus size={17} strokeWidth={3} />
              Add Device
            </button>
          )}
        </div>
      </motion.div>

      {/* Live Stats Row */}
      {isAdmin && (
        <LiveStatsBar />
      )}

      {/* Main Floor Plan */}
      <FloorPlan
        state={floorPlanState}
        canControl={true}
        isAdmin={isAdmin}
        canManageModes={isAdmin || canControlModes}
        canControlModes={canControlModes}
        canControlDevice={canControlDevice}
        onToggleDevice={handleToggleDevice}
        onSetLightingMode={setLightingMode}
        onToggleLockdown={toggleLockdown}
        onToggleAway={toggleAway}
        onAddDevice={handleAddDevice}
      />

      {isResidentView ? (
        <section className="mt-10 space-y-4">
          <div
            className="relative overflow-hidden rounded-[2rem] p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(74,222,128,0.18)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(74,222,128,0.65)' }}>Resident Access</p>
                <h2
                  className="mt-0.5 text-xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Request Access
                </h2>
                <p className="mt-1 text-sm text-zinc-400">View all rooms in real-time. Locked controls require admin approval.</p>
              </div>
              <span
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)' }}
              >
                Locked: {lockedFeatures.length}
              </span>
            </div>
          </div>

          {lockedFeatures.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {lockedFeatures.map((feature) => {
                const status = getRequestStatus(feature.actionKey, feature.room);
                const isPending = status === 'pending';
                const isApproved = status === 'approved';
                const isDenied = status === 'denied';

                return (
                  <article key={feature.id} className="premium-panel-soft border border-white/10 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{feature.label}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-400">{feature.kind}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-200">
                        <Lock size={11} />
                        Locked
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isPending || busyRequestKey === feature.id}
                      onClick={() => handleRequestAccess(feature)}
                      className="control-button pressable mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-100 disabled:opacity-55"
                    >
                      <Send size={14} />
                      {busyRequestKey === feature.id ? 'Sending...' : isPending ? 'Pending' : 'Request Access'}
                    </button>

                  </article>
                );
              })}
            </div>
          ) : (
            <div className="premium-panel p-5 text-sm font-semibold text-emerald-100">
              You currently have access to all visible controls in this dashboard.
            </div>
          )}

          <div className="premium-panel-soft border border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">Request Status</p>
            <div className="mt-3 space-y-2">
              {(Array.isArray(myPermissionRequests) ? myPermissionRequests : []).slice(0, 8).map((request) => (
                <div key={request._id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="truncate text-xs font-semibold text-zinc-100">{request.actionLabel}</p>
                  <span
                    className={`ml-3 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${request.status === 'approved' ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : request.status === 'denied' ? 'border-rose-300/40 bg-rose-400/15 text-rose-100' : 'border-zinc-300/30 bg-zinc-200/10 text-zinc-100'}`}
                  >
                    {request.status}
                  </span>
                </div>
              ))}
              {(Array.isArray(myPermissionRequests) ? myPermissionRequests : []).length === 0 ? (
                <p className="text-xs text-zinc-400">No access requests yet.</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Home Control Panel */}
      <motion.section
        className="mt-10 space-y-5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="relative overflow-hidden rounded-[2rem] p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-500/6 blur-2xl pointer-events-none" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(148,163,184,0.55)' }}>Live Sync</p>
              <h2
                className="mt-0.5 text-xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Home Control Panel
              </h2>
              <p className="mt-1 text-xs text-zinc-400">Device controls synchronized with the floor plan.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { icon: Zap,        label: 'Devices', value: deviceStats.total,       color: '#60a5fa' },
                { icon: Zap,        label: 'Active',  value: deviceStats.active,      color: '#4ade80' },
                { icon: Lightbulb,  label: 'Lights',  value: deviceStats.lightsOn,    color: '#fbbf24' },
                { icon: DoorOpen,   label: 'Doors',   value: deviceStats.doorsOpen,   color: '#f97316' },
                { icon: AppWindow,  label: 'Windows', value: deviceStats.windowsOpen, color: '#7dd3fc' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 min-w-[64px]"
                  style={{ background: `${color}0d`, border: `1px solid ${color}28` }}
                >
                  <Icon size={13} style={{ color }} />
                  <p className="mt-1 text-lg font-black tabular-nums leading-none" style={{ color }}>{value}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: `${color}99` }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Climate Card (live DHT11) ───────────────────────── */}
        <ClimateCard />

        {/* ── Gas Sensor PPM Gauge Card (Safety Priority) ───── */}
        <GasSensorCard />

        {isRefreshing ? (
          /* ┌─ Shimmer skeletons while re-fetching after Add Device ─┐ */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: Math.max(controlPanelDevices.length, 3) }).map((_, i) => (
              <DeviceSkeleton key={i} />
            ))}
          </div>
        ) : controlPanelDevices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {controlPanelDevices.map((device) => {
              const essentialType = device.type === 'security' || device.type === 'camera';
              const disabledByAway = floorPlanState.awayMode && !essentialType;
              const locked = !!device.accessLocked;

              return (
                <div key={device._id} className={disabledByAway || locked ? 'opacity-65 saturate-75' : ''}>
                  {disabledByAway ? (
                    <div className="mb-2 rounded-lg border border-amber-300/35 bg-amber-400/12 px-2 py-1 text-[10px] font-semibold text-amber-100 transition-all duration-300">
                      Disabled in Away Mode
                    </div>
                  ) : null}
                  {locked ? (
                    <div className="mb-2 rounded-lg border border-rose-300/35 bg-rose-400/12 px-2 py-1 text-[10px] font-semibold text-rose-100 transition-all duration-300">
                      Locked: request access to control this device
                    </div>
                  ) : null}
                  <DeviceCard
                    device={device}
                    isLocked={locked}
                    onToggle={() => {
                      if (disabledByAway || locked) return;
                      handleToggleDevice(device);
                    }}
                  />
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      setSelectedControlDeviceId(device._id);
                    }}
                    className="control-button pressable mt-2 w-full px-3 py-2 text-xs font-bold text-zinc-100 disabled:opacity-55"
                  >
                    {locked ? 'Advanced Controls Locked' : 'Advanced Controls'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-[2rem] p-6 text-sm text-zinc-400"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            No devices are currently available.
          </div>
        )}
      </motion.section>

      {/* Camera Monitoring */}
      <motion.section
        className="mt-10 mb-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/security" className="group block">
          <div
            className="relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(255,255,255,0.025) 60%)',
              border: '1px solid rgba(74,222,128,0.18)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            {/* Glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-400/8 blur-2xl" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 0 24px rgba(74,222,128,0.2)' }}
                >
                  <Camera size={22} style={{ color: '#4ade80' }} />
                  {/* Live pulse dot */}
                  <span
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2"
                    style={{ background: '#4ade80', borderColor: '#07080E', boxShadow: '0 0 8px rgba(74,222,128,0.9)', animation: 'warm-pulse 1.5s ease-in-out infinite' }}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(74,222,128,0.65)' }}>Live Feed</p>
                  <h2
                    className="mt-0.5 text-xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Camera Monitoring
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-400">Open live camera feeds, alerts, and detailed monitoring.</p>
                </div>
              </div>
              <div
                className="shrink-0 flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-black transition-all duration-300 group-hover:translate-x-1"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
              >
                Open <ChevronRight size={15} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Cameras',  value: cameraDevices.length || 4, color: '#4ade80' },
                { label: 'Mode',     value: floorPlanState.lockdownMode ? 'LOCKDOWN' : floorPlanState.awayMode ? 'AWAY' : 'NORMAL', color: floorPlanState.lockdownMode ? '#f87171' : floorPlanState.awayMode ? '#fbbf24' : '#94a3b8' },
                { label: 'Sync',     value: 'LIVE',  color: '#4ade80' },
                { label: 'Status',   value: 'READY', color: '#60a5fa' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl px-3 py-2 text-center"
                  style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${color}88` }}>{label}</p>
                  <p className="mt-0.5 text-xs font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;
