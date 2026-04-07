import { useState, useMemo } from 'react';
import {
  LayoutGrid, Lightbulb, Thermometer, Shield, Tv, Zap,
  Filter, ArrowLeft, ChevronRight, Wifi,
} from 'lucide-react';
import DeviceCard from '../components/DeviceCard';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import { DEVICE_REGISTRY, ROOM_ORDER, ROOM_META } from '../data/devices';

/* ── Design tokens ──────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.25)',
  gold:   '#E3C598',
};

/* ── Category pill config ───────────────────────────────────── */
const CAT_CONFIG = {
  All:       { Icon: LayoutGrid,  accent: '#E3C598' },
  Lighting:  { Icon: Lightbulb,   accent: '#f5c842' },
  Climate:   { Icon: Thermometer, accent: '#f97316' },
  Security:  { Icon: Shield,      accent: '#60a5fa' },
  Media:     { Icon: Tv,          accent: '#a78bfa' },
  Appliance: { Icon: Zap,         accent: '#3E5F4F' },
};

/* ── Status snippet ─────────────────────────────────────────── */
function getRoomSnippet(devicesInRoom) {
  if (devicesInRoom.length === 0) return { label: 'No devices', color: C.dimmed };
  const secDev = devicesInRoom.filter(d => d.type === 'security');
  const active = devicesInRoom.filter(
    d => d.status === 'on' || d.status === 'online' || d.state === 'ON',
  );
  if (secDev.length > 0 && secDev.every(d => d.locked)) {
    return { label: '🔒 Secured', color: '#93c5fd' };
  }
  if (active.length === 0) return { label: 'All standby', color: C.dimmed };
  if (active.length === devicesInRoom.length) return { label: '✦ All on', color: '#4ade80' };
  return { label: `${active.length} of ${devicesInRoom.length} active`, color: C.gold };
}

/* ══════════════════════════════════════════════════════════════
   ROOM OVERVIEW CARD
══════════════════════════════════════════════════════════════ */
function RoomCard({ roomName, meta, devices, onClick }) {
  const snippet = getRoomSnippet(devices);
  const active = devices.filter(
    d => d.status === 'on' || d.status === 'online',
  ).length;

  /* Mini category breakdown */
  const categories = [...new Set(devices.map(d => d.category))];

  return (
    <div
      onClick={onClick}
      className="group relative rounded-[2rem] p-6 flex flex-col gap-4 cursor-pointer transition-all duration-500 hover:-translate-y-1.5 border overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${meta.accent}0e 0%, rgba(255,255,255,0.035) 100%)`,
        border: `1px solid ${meta.accent}22`,
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        boxShadow: `0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-60 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${meta.accent}18 0%, transparent 70%)`,
          transform: 'translate(30%,-30%)',
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between relative z-10">
        <div
          className="w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: `${meta.accent}18`,
            border: `1px solid ${meta.accent}35`,
          }}
        >
          {meta.emoji}
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
          style={{
            background: `${meta.accent}10`,
            border: `1px solid ${meta.accent}25`,
            color: meta.accent,
          }}
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </div>
      </div>

      {/* Room name + device count */}
      <div className="relative z-10">
        <h3 className="text-xl font-black tracking-tight" style={{ color: C.text }}>
          {roomName}
        </h3>
        <p className="text-[11px] font-semibold mt-0.5 uppercase tracking-widest" style={{ color: C.dimmed }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Temperature + status snippet */}
      <div className="flex items-center justify-between relative z-10">
        {meta.temp != null ? (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black" style={{ color: meta.accent }}>
              {meta.temp}
            </span>
            <span className="text-sm font-bold mt-1" style={{ color: C.muted }}>°C</span>
          </div>
        ) : (
          <div />
        )}

        <div
          className="px-3 py-1.5 rounded-xl"
          style={{
            background: `${meta.accent}12`,
            border: `1px solid ${meta.accent}28`,
          }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: snippet.color }}
          >
            {snippet.label}
          </span>
        </div>
      </div>

      {/* Category mini badges */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 relative z-10">
          {categories.slice(0, 4).map(cat => {
            const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.All;
            const CatIcon = cfg.Icon;
            return (
              <div
                key={cat}
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{
                  background: `${cfg.accent}0e`,
                  border: `1px solid ${cfg.accent}22`,
                }}
              >
                <CatIcon size={9} style={{ color: cfg.accent }} />
                <span className="text-[9px] font-bold" style={{ color: cfg.accent }}>
                  {cat}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Active count bar */}
      {devices.length > 0 && (
        <div className="relative z-10">
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(active / devices.length) * 100}%`,
                background: `linear-gradient(90deg, ${meta.accent}cc, ${meta.accent}88)`,
                boxShadow: `0 0 6px ${meta.accent}60`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOM DETAIL VIEW (spatially-aware + filterable)
══════════════════════════════════════════════════════════════ */
function RoomDetail({ roomName, meta, allDevices, onBack }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [devices, setDevices] = useState(allDevices);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const roomDevices = useMemo(
    () => devices.filter(d => d.room === roomName),
    [devices, roomName],
  );

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return roomDevices;
    return roomDevices.filter(
      d => d.category.toLowerCase() === activeFilter.toLowerCase(),
    );
  }, [roomDevices, activeFilter]);

  /* Categories present in this room  */
  const roomCategories = useMemo(() => {
    const cats = [...new Set(roomDevices.map(d => d.category))];
    return ['All', ...cats];
  }, [roomDevices]);

  const snippet = getRoomSnippet(roomDevices);

  return (
    <div className="space-y-8" style={{ color: C.text }}>

      {selectedDevice && (
        <SmartDeviceOverlay
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onUpdate={patch => {
            setDevices(prev =>
              prev.map(d => (d.id === selectedDevice.id ? { ...d, ...patch } : d)),
            );
            setSelectedDevice(prev => ({ ...prev, ...patch }));
          }}
        />
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold transition-all hover:opacity-80"
        style={{ color: meta.accent }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        All Rooms
      </button>

      {/* Room header banner */}
      <div
        className="rounded-[2rem] p-7 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}12 0%, rgba(255,255,255,0.03) 100%)`,
          border: `1px solid ${meta.accent}28`,
          backdropFilter: 'blur(25px)',
        }}
      >
        {/* Ambient */}
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${meta.accent}20 0%, transparent 70%)`,
            transform: 'translate(30%,-30%)',
          }}
        />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `${meta.accent}18`, border: `1px solid ${meta.accent}35` }}
            >
              {meta.emoji}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: C.text }}>
                {roomName}
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.dimmed }}>
                {roomDevices.length} connected device{roomDevices.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {meta.temp != null && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-base font-black" style={{ color: C.text }}>{meta.temp}°C</span>
              </div>
            )}
            <div
              className="px-4 py-2 rounded-2xl"
              style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}35` }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: snippet.color }}>
                {snippet.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category filter — only categories in this room */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Filter size={13} style={{ color: C.dimmed }} />
        </div>
        {roomCategories.map(cat => {
          const isActive = activeFilter === cat;
          const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.All;
          const { Icon, accent } = cfg;
          const count = cat === 'All' ? roomDevices.length
            : roomDevices.filter(d => d.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0"
              style={{
                background: isActive ? `${accent}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? accent + '50' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? accent : C.muted,
                boxShadow: isActive ? `0 0 14px ${accent}20` : 'none',
              }}
            >
              <Icon size={12} strokeWidth={2} />
              {cat}
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? `${accent}22` : 'rgba(255,255,255,0.06)',
                  color: isActive ? accent : C.dimmed,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Device grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(d => {
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
      ) : (
        <div
          className="py-20 flex flex-col items-center gap-4 text-center rounded-[2rem] border border-dashed"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="w-14 h-14 rounded-3xl flex items-center justify-center opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Wifi size={24} style={{ color: C.text }} />
          </div>
          <div>
            <p className="font-black" style={{ color: C.muted }}>No {activeFilter} devices here</p>
            <p className="text-sm mt-1" style={{ color: C.dimmed }}>
              This room has no {activeFilter.toLowerCase()} devices.
            </p>
          </div>
          <button
            onClick={() => setActiveFilter('All')}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.07)', color: C.text }}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOMS PAGE
══════════════════════════════════════════════════════════════ */
const Rooms = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  /* Group all devices by room for the overview */
  const devicesByRoom = useMemo(() => {
    const grouped = {};
    ROOM_ORDER.forEach(r => (grouped[r] = []));
    DEVICE_REGISTRY.forEach(d => {
      if (grouped[d.room]) grouped[d.room].push(d);
    });
    return grouped;
  }, []);

  const totalDevices = DEVICE_REGISTRY.length;
  const totalActive = DEVICE_REGISTRY.filter(
    d => d.status === 'on' || d.status === 'online',
  ).length;

  if (selectedRoom) {
    return (
      <div className="pb-28">
        <RoomDetail
          roomName={selectedRoom}
          meta={ROOM_META[selectedRoom] ?? { emoji: '🏠', accent: C.gold }}
          allDevices={DEVICE_REGISTRY}
          onBack={() => setSelectedRoom(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>
            Rooms
          </h2>
          <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
            {ROOM_ORDER.length} rooms &mdash; {totalActive} of {totalDevices} devices active.
          </p>
        </div>

        {/* Mini stats pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: '#4ade80',
              boxShadow: '0 0 6px #4ade80',
              animation: 'warm-pulse 2s ease-in-out infinite',
            }}
          />
          <span className="text-[11px] font-bold" style={{ color: C.muted }}>
            {totalActive} online
          </span>
        </div>
      </div>

      {/* ── Room Overview Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ROOM_ORDER.map(roomName => {
          const meta = ROOM_META[roomName] ?? { emoji: '🏠', accent: C.gold };
          const roomDevices = devicesByRoom[roomName] ?? [];

          return (
            <RoomCard
              key={roomName}
              roomName={roomName}
              meta={meta}
              devices={roomDevices}
              onClick={() => setSelectedRoom(roomName)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Rooms;
