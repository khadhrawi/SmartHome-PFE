import React, { useMemo, useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Lightbulb, Lock, Plus, Settings, Tv, WashingMachine, Sun, Moon, Utensils, Film } from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────────────── */
const LIGHTING_MODES = ['Cinematic', 'Dinner', 'Morning', 'Sleep'];

// Per-scene visual config — colours match CSS variables in index.css
const SCENE_CONFIG = {
  Morning:   { color: '#fff8c8', glowRgb: '255,248,200', label: 'Morning',   icon: Sun,      fill: 'rgba(255,248,200,0.12)', border: 'rgba(255,248,200,0.7)' },
  Dinner:    { color: '#ffaa50', glowRgb: '255,170,80',  label: 'Dinner',    icon: Utensils, fill: 'rgba(255,170,80,0.12)',  border: 'rgba(255,170,80,0.7)'  },
  Cinematic: { color: '#6482dc', glowRgb: '100,130,220', label: 'Cinematic', icon: Film,     fill: 'rgba(100,130,220,0.12)', border: 'rgba(100,130,220,0.7)' },
  Sleep:     { color: '#a050f0', glowRgb: '160,80,240',  label: 'Sleep',     icon: Moon,     fill: 'rgba(160,80,240,0.12)',  border: 'rgba(160,80,240,0.7)'  },
};

const REQUIRED_CONTROLS = [
  { id: 'bathroom-light',  room: 'bathroom',    type: 'light',   label: 'Bathroom Light' },
  { id: 'utility-light',   room: 'utility',     type: 'light',   label: 'Utility Light' },
  { id: 'utility-machine', room: 'utility',     type: 'machine', label: 'Washing Machine' },
  { id: 'bedroom-light',   room: 'bedroom',     type: 'light',   label: 'Bedroom Light' },
  { id: 'kitchen-light',   room: 'kitchen',     type: 'light',   label: 'Kitchen Light' },
  { id: 'living-light',    room: 'living_room', type: 'light',   label: 'Living Room Light' },
  { id: 'living-tv',       room: 'living_room', type: 'tv',      label: 'Living Room TV' },
  { id: 'garage-light',    room: 'garage',      type: 'light',   label: 'Garage Light' },
  { id: 'garage-door',     room: 'garage',      type: 'door',    label: 'Garage Door' },
  { id: 'main-door',       room: 'entrance',    type: 'door',    label: 'Main Door' },
];

/* ─── Isometric geometry ──────────────────────────────────────────── */
const S = 58; // px per unit
const C30 = Math.cos(Math.PI / 6);
const S30 = Math.sin(Math.PI / 6);

/** Convert 3-D grid coord → SVG 2-D coord */
function iso(x, y, z = 0) {
  return [(x - y) * S * C30, (x + y) * S * S30 - z * S];
}

/** Create an SVG points string from 3-D vertices */
function pts(...verts) {
  return verts.map(([x, y, z]) => iso(x, y, z).join(',')).join(' ');
}

/* ViewBox constants (pre-computed for the layout below) */
const VBX = -215, VBY = -55, VBW = 550, VBH = 355;

/** Map an SVG coordinate to % of the viewBox (for HTML overlay positioning) */
function svgPct(sx, sy) {
  return [((sx - VBX) / VBW) * 100, ((sy - VBY) / VBH) * 100];
}

/** Compute screen-% centre of a room's floor at z=0 */
function roomCentre(rx, ry, w, d) {
  const [sx, sy] = iso(rx + w / 2, ry + d / 2, 0);
  return svgPct(sx, sy);
}

/* ─── Room definitions ───────────────────────────────────────────── */
// { id, label, rx, ry, w, d, h }  — all in grid units (1 unit = S px)
const ROOMS = [
  { id: 'bathroom',    label: 'Bathroom',    rx: 0,   ry: 0,   w: 1.1, d: 1.5, h: 0.68 },
  { id: 'utility',     label: 'Utility',     rx: 1.1, ry: 0,   w: 1.1, d: 1.5, h: 0.68 },
  { id: 'kitchen',     label: 'Kitchen',     rx: 2.2, ry: 0,   w: 1.8, d: 1.5, h: 0.68 },
  { id: 'bedroom',     label: 'Bedroom',     rx: 0,   ry: 1.5, w: 2.2, d: 1.7, h: 0.68 },
  { id: 'living_room', label: 'Living Room', rx: 2.2, ry: 1.5, w: 1.8, d: 1.7, h: 0.68 },
  { id: 'garage',      label: 'Garage',      rx: 4.0, ry: 0,   w: 1.6, d: 3.5, h: 0.88 },
  { id: 'entrance',    label: 'Entrance',    rx: 0,   ry: 3.2, w: 4.0, d: 0.7, h: 0.50 },
];

// Which slot id provides the main light for each room (for glow)
const ROOM_LIGHT_SLOT = {
  bathroom: 'bathroom-light', utility: 'utility-light', kitchen: 'kitchen-light',
  bedroom: 'bedroom-light', living_room: 'living-light', garage: 'garage-light',
  entrance: 'main-door',
};

// Overlay positions for each slot (% of container relative to SVG viewBox)
// Computed via iso() + svgPct() for each device's 3-D position
const SLOT_POS = {
  'bathroom-light':  svgPct(...iso(0.55, 0.65, 0)),
  'utility-light':   svgPct(...iso(1.65, 0.60, 0)),
  'utility-machine': svgPct(...iso(1.75, 1.00, 0)),
  'bedroom-light':   svgPct(...iso(1.10, 2.10, 0)),
  'kitchen-light':   svgPct(...iso(3.10, 0.65, 0)),
  'living-light':    svgPct(...iso(3.10, 2.10, 0)),
  'living-tv':       svgPct(...iso(3.60, 2.50, 0)),
  'garage-light':    svgPct(...iso(4.80, 1.00, 0)),
  'garage-door':     svgPct(...iso(5.45, 2.50, 0)),
  'main-door':       svgPct(...iso(2.00, 3.55, 0)),
};

/* ─── Utility helpers (device state) ─────────────────────────────── */
const normalizeType = t => {
  const l = String(t || '').trim().toLowerCase();
  if (['lamp','light'].includes(l)) return 'light';
  if (['lock','door','security'].includes(l)) return 'door';
  if (['tv','television'].includes(l)) return 'tv';
  if (['ac','climate'].includes(l)) return 'ac';
  if (['machine','washer','washing_machine','washing-machine'].includes(l)) return 'machine';
  return l || 'other';
};

const normalizeRoom = room => {
  const l = String(room || '').trim().toLowerCase();
  if (!l) return 'living_room';
  if (l === 'living room' || l === 'studio') return 'living_room';
  if (l === 'kitchenette') return 'kitchen';
  if (['bathroom','utility','bedroom','kitchen','living_room','garage','entrance'].includes(l)) return l;
  return 'living_room';
};

const roomForDevice = device => {
  if (!device || typeof device !== 'object') return 'living_room';
  const room = normalizeRoom(device.room);
  const type = normalizeType(device.type);
  const name = String(device.name || '').toLowerCase();
  if (type === 'door' && /(main|entrance|front)/i.test(name)) return 'entrance';
  if (room === 'entrance') return 'entrance';
  return room;
};

const isDeviceOn = device => {
  if (!device || typeof device !== 'object') return false;
  const type = normalizeType(device.type);
  if (type === 'light') return device.state === 'ON' && Number(device.brightness || 0) > 0;
  return device.state === 'ON';
};

const getStateLabel = device => {
  if (!device || typeof device !== 'object') return 'OFFLINE';
  const type = normalizeType(device.type);
  const on = isDeviceOn(device);
  if (type === 'door') return on ? 'OPEN' : 'LOCKED';
  if (type === 'tv') return on ? 'ON' : 'OFF';
  if (type === 'machine') return on ? 'ACTIVE' : 'IDLE';
  if (type === 'light') return on ? `${Math.round(Number(device.brightness || 0))}%` : 'OFF';
  return on ? 'ON' : 'OFF';
};

const matchesRequiredSlot = (slot, device) => {
  const type = normalizeType(device.type);
  const room = roomForDevice(device);
  const name = String(device.name || '').toLowerCase();
  if (slot.id === 'garage-door') return type === 'door' && /garage/.test(name);
  if (slot.id === 'main-door')   return type === 'door' && /(main|entrance|front)/.test(name);
  if (slot.id === 'living-tv')   return type === 'tv'   && room === 'living_room';
  if (slot.id === 'utility-machine') return type === 'machine' && room === 'utility';
  if (slot.type === 'light') return type === 'light' && room === slot.room;
  return type === slot.type && room === slot.room;
};

/* ─── Scene Toast ──────────────────────────────────────────────────── */
const SceneToast = ({ mode }) => {
  const [visible, setVisible] = useState(false);
  const prev = useRef(null);

  useEffect(() => {
    if (mode && mode !== prev.current) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2800);
      prev.current = mode;
      return () => clearTimeout(t);
    }
    if (!mode) prev.current = null;
  }, [mode]);

  const cfg = mode ? SCENE_CONFIG[mode] : null;
  if (!cfg || !visible) return null;
  const Icon = cfg.icon;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-bold backdrop-blur-xl"
      style={{
        borderColor: cfg.border,
        background: `rgba(5,10,25,0.85)`,
        color: cfg.color,
        boxShadow: `0 0 24px rgba(${cfg.glowRgb},0.4), 0 4px 16px rgba(0,0,0,0.6)`,
        animation: 'sceneToastIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <Icon size={15} />
      <span>✦ {cfg.label} Scene Activated</span>
    </div>
  );
};

/* ─── Isometric SVG scene ─────────────────────────────────────────── */
const IsometricScene = ({ rooms, litRooms, selectedRoom, lightingMode }) => {
  // Draw back-to-front (painter's algorithm, sort by rx+ry ascending)
  const sorted = [...rooms].sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));
  const sceneCfg = lightingMode ? SCENE_CONFIG[lightingMode] : null;

  return (
    <svg
      viewBox={`${VBX} ${VBY} ${VBW} ${VBH}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {/* Lit-room glow filter — colour driven by scene */}
        <filter id="litGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Subtle selection glow */}
        <filter id="selGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <style>{`
          @keyframes scanDown {
            0%   { transform: translateY(-120%); opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { transform: translateY(120%); opacity: 0; }
          }
          .iso-scan { animation: scanDown 8s linear infinite; }
          @keyframes sceneToastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.94); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
          }
        `}</style>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="50%"  stopColor="rgba(96,165,250,0.12)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {sorted.map(({ id, rx, ry, w, d, h }) => {
        const lit = litRooms.has(id);
        const sel = selectedRoom === id;
        const dim = selectedRoom && !sel;

        // Scene-aware or default glow colours
        const glowColor   = lit && sceneCfg ? sceneCfg.color          : 'rgba(212,175,55,1)';
        const glowFill    = lit && sceneCfg ? sceneCfg.fill           : 'rgba(212,175,55,0.22)';
        const glowBorder  = lit && sceneCfg ? sceneCfg.border         : 'rgba(212,175,55,0.5)';
        const glowRgb     = lit && sceneCfg ? sceneCfg.glowRgb        : '212,175,55';

        const floorFill = lit
          ? (sceneCfg ? sceneCfg.fill : 'rgba(212,175,55,0.14)')
          : sel  ? 'rgba(96,165,250,0.10)'
          : dim  ? 'rgba(8,14,32,0.7)'
          :        'rgba(12,20,42,0.85)';

        const swFill = dim ? 'rgba(8,12,26,0.75)' : 'rgba(16,24,52,0.92)';
        const ewFill = dim ? 'rgba(6,10,22,0.75)'  : 'rgba(10,18,40,0.95)';

        const edgeCol = lit
          ? glowBorder
          : sel ? 'rgba(147,197,253,0.6)'
          :       'rgba(100,130,190,0.18)';

        const floorPts = pts([rx,ry,0],[rx+w,ry,0],[rx+w,ry+d,0],[rx,ry+d,0]);
        const southPts = pts([rx,ry+d,h],[rx+w,ry+d,h],[rx+w,ry+d,0],[rx,ry+d,0]);
        const eastPts  = pts([rx+w,ry,h],[rx+w,ry+d,h],[rx+w,ry+d,0],[rx+w,ry,0]);

        const [swx1,swy1]=iso(rx,ry+d,h);   const [swx2,swy2]=iso(rx+w,ry+d,h);
        const [ewx1,ewy1]=iso(rx+w,ry,h);   const [ewx2,ewy2]=iso(rx+w,ry+d,h);

        return (
          <g key={id} style={{ transition: 'all 0.5s ease' }} opacity={dim ? 0.35 : 1}>
            <polygon points={floorPts} fill={floorFill} stroke={edgeCol} strokeWidth="0.4" />
            {/* Scene-coloured glow overlay for lit rooms */}
            {lit && (
              <polygon
                points={floorPts}
                fill={glowFill}
                stroke={glowBorder}
                strokeWidth="0.7"
                filter="url(#litGlow)"
                style={{ filter: `drop-shadow(0 0 6px rgba(${glowRgb},0.7))` }}
              />
            )}
            <polygon points={southPts} fill={swFill} stroke={edgeCol} strokeWidth="0.3" />
            <polygon points={eastPts}  fill={ewFill} stroke={edgeCol} strokeWidth="0.3" />
            {/* Top edges */}
            <line x1={swx1} y1={swy1} x2={swx2} y2={swy2}
              stroke={lit ? glowBorder : edgeCol} strokeWidth={lit ? '0.9' : '0.5'} />
            <line x1={ewx1} y1={ewy1} x2={ewx2} y2={ewy2}
              stroke={lit ? glowBorder : edgeCol} strokeWidth={lit ? '0.9' : '0.5'} />
          </g>
        );
      })}

      {/* Scanning holographic line */}
      <g className="iso-scan">
        <polygon
          points={pts([0,0,0],[5.6,0,0],[5.6,3.9,0],[0,3.9,0])}
          fill="url(#scanGrad)"
          opacity="0.7"
        />
      </g>

      {/* Outer boundary glow */}
      <polygon
        points={pts([0,0,0],[4,0,0],[4,3.2,0],[0,3.2,0])}
        fill="none"
        stroke="rgba(100,130,200,0.08)"
        strokeWidth="1.5"
        filter="url(#selGlow)"
      />
    </svg>
  );
};

/* ─── Device overlay marker ───────────────────────────────────────── */
const DeviceMarker = ({ slot, device, canControl, awayMode, lockdownMode, onToggle, onCreateMissing, isAdmin, dimmed, isLockedByPermission = false }) => {
  const missing = !device;
  const type = normalizeType(device?.type || slot.type);
  const on = isDeviceOn(device);
  const isLight = type === 'light';
  const isDoor  = type === 'door';
  const isTv    = type === 'tv';
  const isMachine = type === 'machine';
  const isLocked = isDoor && (lockdownMode || !on);
  const readOnly = isLockedByPermission;
  const lightColor = String(device?.color || '#d4af37');

  const [px, py] = SLOT_POS[slot.id] || [50, 50];

  const handleClick = () => {
    if (!missing && canControl && !awayMode && !readOnly) onToggle(device);
  };

  // ── Light: glowing circular button
  if (isLight) {
    const glowColor = on ? (device?.color || '#d4af37') : null;
    return (
      <div
        className="group absolute"
        style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)', zIndex: 5, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.4s' }}
      >
        <button
          type="button"
          disabled={missing || !canControl || awayMode || readOnly}
          onClick={handleClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: on ? 'rgba(255,255,255,0.7)' : 'rgba(100,120,160,0.5)',
            background: on ? glowColor : 'rgba(10,18,40,0.8)',
            boxShadow: on ? `0 0 14px ${glowColor}, 0 0 28px ${glowColor}55` : '0 0 6px rgba(0,0,0,0.6)',
          }}
          title={slot.label}
        >
          {on && <span className="absolute inset-0 rounded-full blur-sm" style={{ background: `${glowColor}55` }} />}
          <Lightbulb size={14} className={`relative z-10 ${on ? 'text-zinc-900' : 'text-zinc-400'}`} />
        </button>
        {/* Floating label */}
        <p className="mt-1 text-center text-[8px] font-bold tracking-wider text-zinc-300/60">{slot.label}</p>
        {readOnly ? (
          <p className="mt-0.5 text-center text-[8px] font-black tracking-widest text-rose-200/85">LOCKED</p>
        ) : null}
        {/* Tooltip */}
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[9px] font-semibold text-zinc-100 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          {missing ? 'Not configured' : getStateLabel(device)}
        </div>
        {missing && isAdmin && (
          <button type="button" onClick={() => onCreateMissing(slot)}
            className="mx-auto mt-0.5 flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">
            <Plus size={8} /> Add
          </button>
        )}
      </div>
    );
  }

  // ── Door: glassmorphic badge with colored dot
  if (isDoor) {
    return (
      <div
        className="group absolute"
        style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)', zIndex: 5, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.4s' }}
      >
        <button
          type="button"
          disabled={missing || !canControl || awayMode || readOnly}
          onClick={handleClick}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: isLocked ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.3)',
            background: 'rgba(5,10,25,0.65)',
            color: isLocked ? 'rgba(252,165,165,0.85)' : 'rgba(110,231,183,0.85)',
          }}
          title={slot.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isLocked ? 'bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.9)]' : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]'}`} />
          <Lock size={9} />
          <span>{lockdownMode ? 'LOCKED' : missing ? 'N/A' : getStateLabel(device)}</span>
        </button>
        {missing && isAdmin && (
          <button type="button" onClick={() => onCreateMissing(slot)}
            className="mx-auto mt-0.5 flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">
            <Plus size={8} /> Add
          </button>
        )}
        {readOnly ? (
          <p className="mt-0.5 text-center text-[8px] font-black tracking-widest text-rose-200/85">LOCKED</p>
        ) : null}
      </div>
    );
  }

  // ── TV
  if (isTv) {
    return (
      <div
        className="group absolute"
        style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)', zIndex: 5, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.4s' }}
      >
        <button
          type="button"
          disabled={missing || !canControl || awayMode || readOnly}
          onClick={handleClick}
          className="flex h-8 w-14 items-center justify-center rounded-lg border-2 transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: on ? 'rgba(34,211,238,0.65)' : 'rgba(100,120,160,0.3)',
            background: 'rgba(5,12,30,0.8)',
            boxShadow: on ? '0 0 12px rgba(34,211,238,0.45)' : 'none',
          }}
          title={slot.label}
        >
          <Tv size={13} className={on ? 'text-cyan-300' : 'text-zinc-500'} />
          {on && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.95)]" />}
        </button>
        <p className="mt-1 text-center text-[8px] font-bold tracking-wider text-zinc-300/60">TV</p>
        {readOnly ? (
          <p className="mt-0.5 text-center text-[8px] font-black tracking-widest text-rose-200/85">LOCKED</p>
        ) : null}
      </div>
    );
  }

  // ── Machine / other
  return (
    <div
      className="group absolute"
      style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)', zIndex: 5, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.4s' }}
    >
      <button
        type="button"
        disabled={missing || !canControl || awayMode || readOnly}
        onClick={handleClick}
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: on ? 'rgba(196,181,253,0.7)' : 'rgba(100,120,160,0.35)',
          background: on ? 'rgba(109,40,217,0.45)' : 'rgba(10,18,40,0.8)',
          boxShadow: on ? '0 0 14px rgba(196,181,253,0.5)' : 'none',
        }}
        title={slot.label}
      >
        {isMachine ? <WashingMachine size={14} className={on ? 'text-violet-200' : 'text-zinc-500'} /> : <Settings size={14} className="text-zinc-400" />}
      </button>
      <p className="mt-1 text-center text-[8px] font-bold tracking-wider text-zinc-300/60">{slot.label}</p>
      {readOnly ? (
        <p className="mt-0.5 text-center text-[8px] font-black tracking-widest text-rose-200/85">LOCKED</p>
      ) : null}
      {missing && isAdmin && (
        <button type="button" onClick={() => onCreateMissing(slot)}
          className="mx-auto mt-0.5 flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">
          <Plus size={8} /> Add
        </button>
      )}
    </div>
  );
};

/* ─── Room label overlay ──────────────────────────────────────────── */
const RoomLabel = ({ room, selectedRoom, onSelect }) => {
  const { id, label, rx, ry, w, d } = room;
  const [px, py] = roomCentre(rx, ry, w, d);
  const isSelected = selectedRoom === id;
  const isDimmed   = selectedRoom && !isSelected;

  return (
    <button
      type="button"
      className="absolute rounded-full border px-2 py-0.5 text-[8px] font-black tracking-[0.15em] backdrop-blur-md transition-all duration-300 hover:scale-105"
      style={{
        left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)',
        borderColor: isSelected ? 'rgba(147,197,253,0.5)' : 'rgba(255,255,255,0.1)',
        background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.4)',
        color: isSelected ? '#93c5fd' : 'rgba(148,163,184,0.6)',
        opacity: isDimmed ? 0.2 : 1,
        boxShadow: isSelected ? '0 0 16px rgba(96,165,250,0.3)' : 'none',
        zIndex: 4,
      }}
      onClick={() => onSelect(id === selectedRoom ? null : id)}
    >
      {label.toUpperCase()}
    </button>
  );
};

/* ─── Main FloorPlan component ────────────────────────────────────── */
const FloorPlan = ({
  state, canControl, isAdmin, isResidentView = false,
  canAccessRoom = () => true, onToggleDevice, onSetLightingMode,
  onToggleLockdown, onToggleAway, onAddDevice, onRequestAccess, canManageModes = true, canControlModes = true,
  canControlDevice = () => true,
}) => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const devices = useMemo(() =>
    (state.devices || [])
      .filter(d => d && typeof d === 'object')
      .map(d => ({ ...d, room: normalizeRoom(d.room), type: normalizeType(d.type) })),
    [state.devices]
  );

  const slotBinding = useMemo(() => {
    const used = new Set();
    const map = {};
    REQUIRED_CONTROLS.forEach(slot => {
      const device = devices.find(c => !used.has(c._id) && matchesRequiredSlot(slot, c));
      if (device) { used.add(device._id); map[slot.id] = device; }
      else map[slot.id] = null;
    });
    return map;
  }, [devices]);

  // Which rooms have their light ON (for 3D glow)
  const litRooms = useMemo(() => {
    const s = new Set();
    Object.entries(ROOM_LIGHT_SLOT).forEach(([roomId, slotId]) => {
      const dev = slotBinding[slotId];
      if (isDeviceOn(dev)) s.add(roomId);
    });
    return s;
  }, [slotBinding]);

  const handleDeviceToggle = async device => {
    if (!canControl || state.awayMode || !canControlDevice(device)) return;
    try { await onToggleDevice(device); } catch {}
  };

  const createRequiredControl = async slot => {
    if (!isAdmin) return;
    try {
      const topic = `auto/${slot.room}/${slot.id}/${Date.now()}`;
      const room  = slot.room === 'entrance' ? 'living_room' : slot.room;
      await onAddDevice({ name: slot.label, type: slot.type, room, topic });
    } catch {}
  };

  return (
    <section className="h-full w-full">
      {/* Header Controls */}
      <div className="premium-panel interactive-lift mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100/70">Digital Twin</p>
          <h2 className="mt-1 text-lg font-black text-white">3D Isometric Home</h2>
        </div>
        {canManageModes && (
          <div className="flex flex-wrap items-center gap-2">
            {LIGHTING_MODES.map(mode => {
              const active = state.lightingMode === mode;
              const cfg = SCENE_CONFIG[mode] || {};
              const Icon = cfg.icon || Sun;
              return (
                <button key={mode} type="button"
                  onClick={() => canControlModes && onSetLightingMode(active ? null : mode)}
                  className="control-button pressable flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                  style={{
                    borderColor: active ? cfg.border       : 'rgba(255,255,255,0.15)',
                    background:  active ? cfg.fill         : 'rgba(255,255,255,0.05)',
                    color:       active ? cfg.color        : '#e5e7eb',
                    boxShadow:   active ? `0 0 16px rgba(${cfg.glowRgb},0.35)` : 'none',
                    cursor:      canControlModes ? 'pointer' : 'not-allowed',
                    opacity:     canControlModes ? 1 : 0.5,
                    transition:  'all 0.3s ease',
                  }}
                >
                  <Icon size={11} />
                  {mode}
                </button>
              );
            })}
            <button type="button"
              onClick={() => canControlModes && onToggleLockdown?.()}
              className="control-button pressable px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: state.lockdownMode ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.15)',
                background:  state.lockdownMode ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
                color:       state.lockdownMode ? '#fecaca' : '#e5e7eb',
                cursor: canControlModes ? 'pointer' : 'not-allowed', opacity: canControlModes ? 1 : 0.5,
              }}
            >{state.lockdownMode ? 'Unlock House' : 'Lockdown'}</button>
            <button type="button"
              onClick={() => canControlModes && onToggleAway?.()}
              className="control-button pressable px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: state.awayMode ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.15)',
                background:  state.awayMode ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                color:       state.awayMode ? '#dbeafe' : '#e5e7eb',
                cursor: canControlModes ? 'pointer' : 'not-allowed', opacity: canControlModes ? 1 : 0.5,
              }}
            >{state.awayMode ? 'Disable Away' : 'Away Mode'}</button>
          </div>
        )}
      </div>

      {/* ── 3D Isometric Canvas ── */}
      <div
        className="premium-panel relative w-full overflow-hidden rounded-3xl"
        style={{
          height: 620,
          background: 'radial-gradient(ellipse at 30% 30%, rgba(15,25,60,0.95) 0%, rgba(5,10,25,1) 70%)',
          boxShadow: 'inset 0 0 80px rgba(30,60,120,0.12)',
        }}
      >
        {/* Ambient corner glows */}
        <div className="pointer-events-none absolute -left-20 -top-10 h-56 w-56 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-indigo-800/10 blur-3xl" />

        {/* Scene change toast */}
        <SceneToast mode={state.lightingMode} />

        {/* Centered scene wrapper */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: '100%', height: '100%' }}>
            {/* 3D SVG scene */}
            <IsometricScene rooms={ROOMS} litRooms={litRooms} selectedRoom={selectedRoom} lightingMode={state.lightingMode} />

            {/* Room label overlays */}
            <div className="absolute inset-0" style={{ zIndex: 4 }}>
              {ROOMS.map(room => (
                <RoomLabel key={room.id} room={room} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />
              ))}
            </div>

            {/* Device control overlays */}
            <div className="absolute inset-0" style={{ zIndex: 5 }}>
              {REQUIRED_CONTROLS.map(slot => {
                const dimmed = selectedRoom && selectedRoom !== slot.room;
                const slotDevice = slotBinding[slot.id];
                const slotLockedByPermission = slotDevice ? !canControlDevice(slotDevice) : false;
                return (
                  <DeviceMarker
                    key={slot.id}
                    slot={slot}
                    device={slotDevice}
                    canControl={canControl}
                    awayMode={state.awayMode}
                    lockdownMode={state.lockdownMode}
                    onToggle={handleDeviceToggle}
                    onCreateMissing={createRequiredControl}
                    isAdmin={isAdmin}
                    dimmed={dimmed}
                    isLockedByPermission={slotLockedByPermission}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* HUD: legend bottom-left */}
        <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-4" style={{ zIndex: 10 }}>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(212,175,55,0.9)]" />
            <span className="text-[9px] font-bold tracking-widest text-zinc-400">LIGHT ON</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
            <span className="text-[9px] font-bold tracking-widest text-zinc-400">LOCKED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="text-[9px] font-bold tracking-widest text-zinc-400">OPEN</span>
          </div>
          {selectedRoom && (
            <button
              type="button"
              onClick={() => setSelectedRoom(null)}
              className="pointer-events-auto rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-md"
            >
              ✕ CLEAR SELECTION
            </button>
          )}
        </div>

        {/* HUD: status top-right */}
        <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-1" style={{ zIndex: 10 }}>
          {state.lockdownMode && (
            <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-rose-300 backdrop-blur-md">
              ⚠ LOCKDOWN
            </span>
          )}
          {state.awayMode && (
            <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-blue-300 backdrop-blur-md">
              ✈ AWAY MODE
            </span>
          )}
          {state.lightingMode && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/12 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-amber-200 backdrop-blur-md">
              ✦ {state.lightingMode.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* ═══ PENDING PLACEMENT TRAY ═══
          Devices that were just added and have no assigned floor-plan slot
          show here so they're never "lost" in the database.
      ═══════════════════════════════════════ */}
      {(() => {
        const allDevices = Array.isArray(state?.devices) ? state.devices : [];
        /* A device is "pending" if it was flagged by addDevice, OR its position
           is the default (50,50) and it doesn't match any REQUIRED_CONTROLS slot. */
        const slottedIds = new Set(
          REQUIRED_CONTROLS.flatMap(slot => {
            const match = allDevices.find(d => matchesRequiredSlot(slot, d));
            return match ? [match._id] : [];
          })
        );
        const pending = allDevices.filter(d =>
          d._pending ||
          (!slottedIds.has(d._id) &&
            Number(d.position?.x ?? 50) === 50 &&
            Number(d.position?.y ?? 50) === 50)
        );
        if (pending.length === 0) return null;

        return (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(227,197,152,0.10)',
                  border: '1px solid rgba(227,197,152,0.30)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E3C598', boxShadow: '0 0 6px #E3C598', animation: 'warm-pulse 2s ease-in-out infinite' }} />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#E3C598' }}>
                  Pending Placement
                </span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(248,249,250,0.35)' }}>
                {pending.length} device{pending.length !== 1 ? 's' : ''} added — assign a room via the map
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {pending.map(device => {
                const typeIcon = normalizeType(device.type);
                const on = isDeviceOn(device);
                return (
                  <div
                    key={device._id}
                    className="relative flex flex-col gap-2 rounded-2xl p-3"
                    style={{
                      background: device._pending
                        ? 'rgba(227,197,152,0.06)'
                        : 'rgba(255,255,255,0.03)',
                      border: '1.5px dashed rgba(227,197,152,0.30)',
                      backdropFilter: 'blur(14px)',
                    }}
                  >
                    {/* Shimmer if still temp */}
                    {device._pending && (
                      <div
                        className="absolute inset-0 -translate-x-full rounded-2xl overflow-hidden"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(227,197,152,0.06) 50%, transparent 100%)',
                          animation: 'shimmer-sweep 1.8s ease-in-out infinite',
                        }}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-base">
                        {typeIcon === 'light'   ? '💡'
                        : typeIcon === 'door'  ? '🚪'
                        : typeIcon === 'tv'    ? '📺'
                        : typeIcon === 'ac'    ? '❄️'
                        : typeIcon === 'machine' ? '🌀'
                        : '📦'}
                      </span>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(227,197,152,0.12)',
                          border: '1px solid rgba(227,197,152,0.25)',
                          color: '#E3C598',
                        }}
                      >
                        {device._pending ? 'Saving…' : 'Unplaced'}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-black truncate" style={{ color: '#F8F9FA' }}>
                        {device.name || 'New Device'}
                      </p>
                      <p className="text-[9px] font-medium capitalize" style={{ color: 'rgba(248,249,250,0.40)' }}>
                        {device.room?.replace('_', ' ') || 'No room'} · {device.type || '–'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <p className="mt-3 text-xs text-zinc-300/50">
        Click a room label to focus. Lit rooms glow gold when devices are active.
      </p>
    </section>
  );
};

export default FloorPlan;
