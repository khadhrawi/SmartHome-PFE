import { useState, useMemo } from 'react';
import {
  Filter, Lightbulb, Thermometer, Shield, Tv, Zap,
  LayoutGrid,
} from 'lucide-react';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import DeviceCard from '../components/DeviceCard';
import { DEVICE_REGISTRY, ROOM_ORDER, CATEGORIES, ROOM_META } from '../data/devices';

/* ── Design tokens ──────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.25)',
  gold:   '#E3C598',
};

/* ── Category pill config (icon + accent) ───────────────────── */
const CAT_CONFIG = {
  All:       { Icon: LayoutGrid,  accent: '#E3C598' },
  Lighting:  { Icon: Lightbulb,   accent: '#f5c842' },
  Climate:   { Icon: Thermometer, accent: '#f97316' },
  Security:  { Icon: Shield,      accent: '#60a5fa' },
  Media:     { Icon: Tv,          accent: '#a78bfa' },
  Appliance: { Icon: Zap,         accent: '#3E5F4F' },
};

/* ── Room status snippet ────────────────────────────────────── */
function getRoomSnippet(devicesInRoom) {
  if (devicesInRoom.length === 0) return { label: 'Empty', color: C.dimmed };
  const secDev = devicesInRoom.filter(d => d.type === 'security');
  const active = devicesInRoom.filter(
    d => d.status === 'on' || d.status === 'online' || d.state === 'ON',
  );
  if (secDev.length > 0 && secDev.every(d => d.locked)) {
    return { label: '🔒 Secured', color: '#93c5fd' };
  }
  if (active.length === 0) return { label: 'Standby', color: C.dimmed };
  if (active.length === devicesInRoom.length) return { label: '✦ All on', color: '#4ade80' };
  return { label: `${active.length} Active`, color: C.gold };
}

/* ════════════════════════════════════════════════════════════
   DEVICES PAGE
═══════════════════════════════════════════════════════════════ */
const Devices = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [devices, setDevices] = useState(DEVICE_REGISTRY);
  const [selectedDevice, setSelectedDevice] = useState(null);

  /* 1. Filter globally by category */
  const filteredDevices = useMemo(() => {
    if (activeFilter === 'All') return devices;
    return devices.filter(
      d => d.category.toLowerCase() === activeFilter.toLowerCase(),
    );
  }, [devices, activeFilter]);

  /* 2. Group by room, preserving ROOM_ORDER */
  const devicesByRoom = useMemo(() => {
    const grouped = {};
    ROOM_ORDER.forEach(r => (grouped[r] = []));
    filteredDevices.forEach(d => {
      if (grouped[d.room]) grouped[d.room].push(d);
      else grouped[d.room] = [d];
    });
    return grouped;
  }, [filteredDevices]);

  /* 3. Count total devices per category for badges */
  const catCounts = useMemo(() => {
    const counts = { All: devices.length };
    CATEGORIES.slice(1).forEach(cat => {
      counts[cat] = devices.filter(
        d => d.category.toLowerCase() === cat.toLowerCase(),
      ).length;
    });
    return counts;
  }, [devices]);

  /* Overlay patch handler */
  const handleUpdate = patch => {
    setDevices(prev =>
      prev.map(d => (d.id === selectedDevice.id ? { ...d, ...patch } : d)),
    );
    setSelectedDevice(prev => ({ ...prev, ...patch }));
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* ── Overlay ─────────────────────────────────────────── */}
      {selectedDevice && (
        <SmartDeviceOverlay
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* ── Page header ─────────────────────────────────────── */}
      <div>
        <h2
          className="text-3xl font-black tracking-tight"
          style={{ color: C.text }}
        >
          Home Devices
        </h2>
        <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
          {devices.length} devices across {ROOM_ORDER.length} rooms &mdash; filter, explore and control.
        </p>
      </div>

      {/* ── Category Pill Menu ───────────────────────────────── */}
      <div
        className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2"
        role="tablist"
        aria-label="Category filter"
      >
        {/* Filter icon */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Filter size={14} style={{ color: C.dimmed }} />
        </div>

        {CATEGORIES.map(cat => {
          const isActive = activeFilter === cat;
          const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.All;
          const { Icon, accent } = cfg;
          const count = catCounts[cat] ?? 0;

          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(cat)}
              className="relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0 group"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${accent}22, ${accent}0e)`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? accent : C.muted,
                boxShadow: isActive ? `0 0 18px ${accent}22` : 'none',
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
              {cat}
              {/* Count badge */}
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? `${accent}25` : 'rgba(255,255,255,0.07)',
                  color: isActive ? accent : C.dimmed,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Room-Based Rendering ────────────────────────────── */}
      <div className="space-y-10">
        {ROOM_ORDER.map(roomName => {
          const roomDevices = devicesByRoom[roomName];
          if (!roomDevices || roomDevices.length === 0) return null;

          const meta = ROOM_META[roomName] ?? { emoji: '🏠', accent: C.gold };
          const snippet = getRoomSnippet(roomDevices);

          return (
            <div key={roomName} className="room-section space-y-5">

              {/* Room Header */}
              <div
                className="flex items-center justify-between px-5 py-4 rounded-3xl"
                style={{
                  background: `linear-gradient(135deg, ${meta.accent}0c 0%, rgba(255,255,255,0.025) 100%)`,
                  border: `1px solid ${meta.accent}22`,
                  backdropFilter: 'blur(25px)',
                  WebkitBackdropFilter: 'blur(25px)',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                {/* Left: emoji + names */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      background: `${meta.accent}15`,
                      border: `1px solid ${meta.accent}30`,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <div>
                    <h3
                      className="text-lg font-black tracking-tight"
                      style={{ color: C.text }}
                    >
                      {roomName}
                    </h3>
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                      style={{ color: C.dimmed }}
                    >
                      {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Right: temp chip + status snippet */}
                <div className="flex items-center gap-2">
                  {meta.temp != null && (
                    <div
                      className="hidden sm:flex items-center px-3 py-1.5 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="text-[11px] font-bold" style={{ color: C.muted }}>
                        {meta.temp}°C
                      </span>
                    </div>
                  )}
                  <div
                    className="px-3.5 py-1.5 rounded-xl"
                    style={{
                      background: `${meta.accent}12`,
                      border: `1px solid ${meta.accent}30`,
                    }}
                  >
                    <span
                      className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                      style={{ color: snippet.color }}
                    >
                      {snippet.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-1">
                {roomDevices.map(d => {
                  const isOn =
                    d.type === 'security'
                      ? d.locked
                      : d.status === 'on' || d.status === 'online';
                  const adapter = { ...d, _id: d.id, state: isOn ? 'ON' : 'OFF' };
                  return (
                    <DeviceCard
                      key={d.id}
                      device={adapter}
                      onToggle={() => setSelectedDevice(d)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Global empty state */}
        {filteredDevices.length === 0 && (
          <div
            className="py-24 flex flex-col items-center gap-5 text-center rounded-[2rem] border border-dashed"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Filter size={28} style={{ color: C.text }} />
            </div>
            <div>
              <p className="text-lg font-black" style={{ color: C.muted }}>
                No {activeFilter} devices found
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: C.dimmed }}>
                None of your rooms have a {activeFilter.toLowerCase()} device.
              </p>
            </div>
            <button
              onClick={() => setActiveFilter('All')}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.07)', color: C.text }}
            >
              Show all devices
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Devices;
