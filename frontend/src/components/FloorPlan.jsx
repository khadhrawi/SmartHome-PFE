import { useMemo } from 'react';
import { Lightbulb, Lock, Plus, Settings, Tv, WashingMachine } from 'lucide-react';
import floorPlanAsset from '../assets/floorplan.svg';

const LIGHTING_MODES = ['Cinematic', 'Dinner', 'Morning', 'Sleep'];

const REQUIRED_CONTROLS = [
  { id: 'bathroom-light', room: 'bathroom', type: 'light', label: 'Bathroom Light' },
  { id: 'utility-light', room: 'utility', type: 'light', label: 'Utility Light' },
  { id: 'utility-machine', room: 'utility', type: 'machine', label: 'Utility Machine' },
  { id: 'bedroom-light', room: 'bedroom', type: 'light', label: 'Bedroom Light' },
  { id: 'kitchen-light', room: 'kitchen', type: 'light', label: 'Kitchen Light' },
  { id: 'living-light', room: 'living_room', type: 'light', label: 'Living Room Main Light' },
  { id: 'living-tv', room: 'living_room', type: 'tv', label: 'Living Room TV' },
  { id: 'garage-light', room: 'garage', type: 'light', label: 'Garage Light' },
  { id: 'garage-door', room: 'garage', type: 'door', label: 'Garage Door' },
  { id: 'main-door', room: 'entrance', type: 'door', label: 'Main Entrance Door' },
];

const ROOM_LABEL_POSITIONS = {
  bathroom: { x: 13, y: 12 },
  utility: { x: 28, y: 12 },
  bedroom: { x: 16, y: 52 },
  kitchen: { x: 50, y: 13 },
  living_room: { x: 48, y: 49 },
  garage: { x: 81, y: 36 },
  entrance: { x: 43, y: 71 },
};

const REQUIRED_POSITIONS = {
  'bathroom-light': { x: 13, y: 18 },
  'utility-light': { x: 29, y: 18 },
  'utility-machine': { x: 31, y: 23 },
  'bedroom-light': { x: 18, y: 58 },
  'kitchen-light': { x: 51, y: 21 },
  'living-light': { x: 49, y: 45 },
  'living-tv': { x: 55, y: 49 },
  'garage-light': { x: 81, y: 26 },
  'garage-door': { x: 93, y: 46 },
  'main-door': { x: 45, y: 70 },
};

const normalizeType = (type) => {
  const lowered = String(type || '').trim().toLowerCase();
  if (['lamp', 'light'].includes(lowered)) return 'light';
  if (['lock', 'door', 'security'].includes(lowered)) return 'door';
  if (['tv', 'television'].includes(lowered)) return 'tv';
  if (['ac', 'climate'].includes(lowered)) return 'ac';
  if (['machine', 'washer', 'washing_machine', 'washing-machine'].includes(lowered)) return 'machine';
  return lowered || 'other';
};

const normalizeRoom = (room) => {
  const lowered = String(room || '').trim().toLowerCase();
  if (!lowered) return 'living_room';
  if (lowered === 'living room' || lowered === 'studio') return 'living_room';
  if (lowered === 'kitchenette') return 'kitchen';
  if (['bathroom', 'utility', 'bedroom', 'kitchen', 'living_room', 'garage', 'entrance'].includes(lowered)) {
    return lowered;
  }
  return 'living_room';
};

const roomForDevice = (device) => {
  if (!device || typeof device !== 'object') return 'living_room';
  const room = normalizeRoom(device.room);
  const type = normalizeType(device.type);
  const loweredName = String(device.name || '').toLowerCase();

  if (type === 'door' && /(main|entrance|front)/i.test(loweredName)) return 'entrance';
  if (room === 'entrance') return 'entrance';
  return room;
};

const isDeviceOn = (device) => {
  if (!device || typeof device !== 'object') return false;
  const type = normalizeType(device.type);
  if (type === 'light') {
    return device.state === 'ON' && Number(device.brightness || 0) > 0;
  }
  return device.state === 'ON';
};

const getStateLabel = (device) => {
  if (!device || typeof device !== 'object') return 'OFFLINE';
  const type = normalizeType(device.type);
  const on = isDeviceOn(device);
  if (type === 'door') return on ? 'OPEN' : 'CLOSED';
  if (type === 'tv') return on ? 'ON' : 'OFF';
  if (type === 'machine') return on ? 'ACTIVE' : 'IDLE';
  if (type === 'light') return on ? `ON · ${Math.round(Number(device.brightness || 0))}%` : 'OFF';
  return on ? 'ON' : 'OFF';
};

const dotVisual = (device, awayMode) => {
  const type = normalizeType(device.type);
  const on = isDeviceOn(device);

  if (awayMode) {
    return {
      bubble: 'bg-slate-500/45 border-slate-300/30 shadow-none',
      icon: 'text-slate-100',
      pulse: 'bg-slate-300/30',
    };
  }

  if (type === 'light') {
    return on
      ? {
          bubble: 'bg-lime-300/85 border-lime-100/75 shadow-[0_0_18px_rgba(190,242,100,0.75)]',
          icon: 'text-zinc-900',
          pulse: 'bg-lime-200/85',
        }
      : {
          bubble: 'bg-zinc-700/75 border-zinc-400/45 shadow-none',
          icon: 'text-zinc-200',
          pulse: 'bg-zinc-300/20',
        };
  }

  if (type === 'door') {
    return on
      ? {
          bubble: 'bg-emerald-300/85 border-emerald-100/80 shadow-[0_0_18px_rgba(52,211,153,0.7)]',
          icon: 'text-zinc-900',
          pulse: 'bg-emerald-200/85',
        }
      : {
          bubble: 'bg-rose-500/75 border-rose-200/65 shadow-none',
          icon: 'text-rose-50',
          pulse: 'bg-rose-200/45',
        };
  }

  if (type === 'tv') {
    return on
      ? {
          bubble: 'bg-cyan-300/88 border-cyan-100/80 shadow-[0_0_18px_rgba(34,211,238,0.75)]',
          icon: 'text-cyan-950',
          pulse: 'bg-cyan-100/85',
        }
      : {
          bubble: 'bg-zinc-700/75 border-zinc-400/45 shadow-none',
          icon: 'text-zinc-200',
          pulse: 'bg-zinc-300/20',
        };
  }

  if (type === 'machine') {
    return on
      ? {
          bubble: 'bg-violet-300/88 border-violet-100/80 shadow-[0_0_18px_rgba(196,181,253,0.75)]',
          icon: 'text-violet-950',
          pulse: 'bg-violet-100/90',
        }
      : {
          bubble: 'bg-zinc-700/75 border-zinc-400/45 shadow-none',
          icon: 'text-zinc-200',
          pulse: 'bg-zinc-300/20',
        };
  }

  return {
    bubble: 'bg-zinc-600/70 border-zinc-300/35 shadow-none',
    icon: 'text-zinc-100',
    pulse: 'bg-zinc-200/20',
  };
};

const iconForType = (type) => {
  const normalized = normalizeType(type);
  if (normalized === 'light') return Lightbulb;
  if (normalized === 'tv') return Tv;
  if (normalized === 'door') return Lock;
  if (normalized === 'machine') return WashingMachine;
  return Settings;
};

const matchesRequiredSlot = (slot, device) => {
  const type = normalizeType(device.type);
  const room = roomForDevice(device);
  const loweredName = String(device.name || '').toLowerCase();

  if (slot.id === 'garage-door') return type === 'door' && /garage/.test(loweredName);
  if (slot.id === 'main-door') return type === 'door' && /(main|entrance|front)/.test(loweredName);
  if (slot.id === 'living-tv') return type === 'tv' && room === 'living_room';
  if (slot.id === 'utility-machine') return type === 'machine' && room === 'utility';
  if (slot.type === 'light') return type === 'light' && room === slot.room;

  return type === slot.type && room === slot.room;
};

const OverlayMarker = ({
  slot,
  device,
  canControl,
  isResidentView,
  canAccessRoom,
  awayMode,
  lockdownMode,
  onToggle,
  onCreateMissing,
  onRequestAccess,
  isAdmin,
}) => {
  const missing = !device;
  const type = normalizeType(device?.type || slot.type);
  const Icon = iconForType(type);
  const visual = dotVisual(device || { type, state: 'OFF', brightness: 0 }, awayMode);
  const position = REQUIRED_POSITIONS[slot.id] || { x: 50, y: 50 };
  const deviceRoom = roomForDevice(device || { room: slot.room, type: slot.type, name: slot.label });
  const restricted = isResidentView && !canAccessRoom(deviceRoom);
  const isTv = type === 'tv';
  const isDoor = type === 'door';
  const isLight = type === 'light';
  const isLockdownDoor = isDoor && lockdownMode;
  const lightColor = String(device?.color || '#d4af37');

  return (
    <div
      className="group absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isTv ? 6 : 5,
      }}
    >
      {restricted ? (
        <button
          type="button"
          onClick={() => onRequestAccess?.(slot, device)}
          className="relative rounded-lg border-2 border-slate-300/35 bg-slate-500/20 px-3 py-2 text-[10px] font-black tracking-wide text-slate-100 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
          title={`${slot.label}: No Access`}
        >
          <span className="block text-center">Request Access</span>
        </button>
      ) : isTv ? (
        <button
          type="button"
          disabled={missing || !canControl || awayMode}
          onClick={() => !missing && onToggle(device)}
          className={`relative h-12 w-20 rounded-lg border-2 px-2 transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
            isDeviceOn(device)
              ? 'border-cyan-100/80 bg-cyan-300/65 shadow-[0_0_20px_rgba(34,211,238,0.65)]'
              : 'border-zinc-400/45 bg-zinc-800/70'
          } ${missing ? 'cursor-default opacity-65' : 'cursor-pointer'} disabled:cursor-not-allowed disabled:opacity-55`}
          title={missing ? `${slot.label}: not configured` : `${slot.label}: ${getStateLabel(device)}`}
        >
          <span className="absolute inset-0 m-1 rounded bg-black/55" />
          <span className="relative z-10 text-[10px] font-black text-white">TV</span>
          {isDeviceOn(device) ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.95)]" /> : null}
        </button>
      ) : isDoor ? (
        <button
          type="button"
          disabled={missing || !canControl || awayMode}
          onClick={() => !missing && onToggle(device)}
          className={`rounded-md border-2 px-3 py-1 text-[10px] font-black tracking-wide transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
            isLockdownDoor
              ? 'border-rose-200/70 bg-rose-500/78 text-rose-50 shadow-[0_0_16px_rgba(244,63,94,0.55)]'
              : isDeviceOn(device)
              ? 'border-emerald-100/80 bg-emerald-300/80 text-emerald-950 shadow-[0_0_16px_rgba(16,185,129,0.65)]'
              : 'border-rose-200/70 bg-rose-500/72 text-rose-50'
          } ${missing ? 'cursor-default opacity-65' : 'cursor-pointer'} disabled:cursor-not-allowed disabled:opacity-55`}
          title={missing ? `${slot.label}: not configured` : `${slot.label}: ${isLockdownDoor ? 'LOCKED' : getStateLabel(device)}`}
        >
          {missing ? 'NOT SET' : isLockdownDoor ? 'LOCKED' : getStateLabel(device)}
        </button>
      ) : (
        <button
          type="button"
          disabled={missing || !canControl || awayMode}
          onClick={() => !missing && onToggle(device)}
          className={`group relative h-9 w-9 rounded-full border-2 transition-all duration-300 ease-out hover:scale-110 active:scale-95 ${visual.bubble} ${missing ? 'opacity-65' : ''} disabled:cursor-not-allowed disabled:opacity-55`}
          style={isLight && isDeviceOn(device) ? {
            background: lightColor,
            borderColor: '#f5f5f5',
            boxShadow: `0 0 18px ${lightColor}, 0 0 32px ${lightColor}55`,
            transition: 'all 0.25s ease',
          } : undefined}
          title={missing ? `${slot.label}: not configured` : `${slot.label}: ${getStateLabel(device)}`}
        >
          {isDeviceOn(device) ? (
            <span className={`absolute inset-0 rounded-full blur-md ${visual.pulse}`} />
          ) : null}
          <span className="relative z-10 flex h-full w-full items-center justify-center">
            <Icon size={15} className={visual.icon} />
          </span>
        </button>
      )}

      <div className="pointer-events-none mt-1 text-center">
        <p className="text-[10px] font-bold text-zinc-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{slot.label}</p>
        <p className="text-[9px] text-zinc-300/90">
          {restricted
            ? 'No Access'
            : missing
              ? (isAdmin ? 'Add required device' : 'Missing')
              : isLockdownDoor
                ? 'LOCKED'
                : getStateLabel(device)}
        </p>
      </div>

      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg border border-white/20 bg-black/70 px-2 py-1 text-[10px] font-semibold text-zinc-100 opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:opacity-100">
        {slot.label} · {restricted ? 'No Access' : missing ? 'Not configured' : isLockdownDoor ? 'LOCKED' : getStateLabel(device)}
      </div>

      {missing && isAdmin ? (
        <button
          type="button"
          onClick={() => onCreateMissing(slot)}
          className="mx-auto mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300/55 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100"
        >
          <Plus size={10} /> Add
        </button>
      ) : null}
    </div>
  );
};

const FloorPlan = ({
  state,
  canControl,
  isAdmin,
  isResidentView = false,
  canAccessRoom = () => true,
  onToggleDevice,
  onSetLightingMode,
  onToggleLockdown,
  onToggleAway,
  onAddDevice,
  onRequestAccess,
  canManageModes = true,
}) => {
  const devices = useMemo(() => {
    return (state.devices || [])
      .filter((device) => device && typeof device === 'object')
      .map((device) => {
        return {
          ...device,
          room: normalizeRoom(device.room),
          type: normalizeType(device.type),
        };
      });
  }, [state.devices]);

  const slotBinding = useMemo(() => {
    const used = new Set();
    const map = {};

    REQUIRED_CONTROLS.forEach((slot) => {
      const device = devices.find((candidate) => {
        if (used.has(candidate._id)) return false;
        return matchesRequiredSlot(slot, candidate);
      });

      if (device) {
        used.add(device._id);
        map[slot.id] = device;
      } else {
        map[slot.id] = null;
      }
    });

    return { map, used };
  }, [devices]);

  const handleDeviceToggle = async (device) => {
    if (!canControl || state.awayMode) return;
    try {
      await onToggleDevice(device._id);
    } catch {
      // Real-time sync will reconcile if backend update fails
    }
  };

  const createRequiredControl = async (slot) => {
    if (!isAdmin) return;
    try {
      const topic = `auto/${slot.room}/${slot.id}/${Date.now()}`;
      const room = slot.room === 'entrance' ? 'living_room' : slot.room;
      await onAddDevice({
        name: slot.label,
        type: slot.type,
        room,
        topic,
      });
    } catch {
      // Error handling
    }
  };

  return (
    <section className="h-full w-full">
      {/* Header Controls */}
      <div className="premium-panel interactive-lift mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100/80">Smart Home</p>
          <h2 className="mt-1 text-lg font-black text-white">Interactive Floor Plan</h2>
        </div>

        {canManageModes ? (
          <div className="flex flex-wrap items-center gap-2">
            {LIGHTING_MODES.map((modeName) => {
              const active = state.lightingMode === modeName;
              return (
                <button
                  key={modeName}
                  type="button"
                  onClick={() => canControl && onSetLightingMode(active ? null : modeName)}
                  className="control-button pressable px-3 py-1.5 text-xs font-bold"
                  style={{
                    borderColor: active ? 'rgba(252,211,77,0.75)' : 'rgba(255,255,255,0.2)',
                    background: active ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#fde68a' : '#e5e7eb',
                    cursor: canControl ? 'pointer' : 'not-allowed',
                    opacity: canControl ? 1 : 0.55,
                  }}
                >
                  {modeName}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => canControl && onToggleLockdown?.()}
              className="control-button pressable px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: state.lockdownMode ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.2)',
                background: state.lockdownMode ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.06)',
                color: state.lockdownMode ? '#fecaca' : '#e5e7eb',
                cursor: canControl ? 'pointer' : 'not-allowed',
                opacity: canControl ? 1 : 0.55,
              }}
            >
              {state.lockdownMode ? 'Unlock House' : 'Lockdown'}
            </button>

            <button
              type="button"
              onClick={() => canControl && onToggleAway?.()}
              className="control-button pressable px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: state.awayMode ? 'rgba(96,165,250,0.72)' : 'rgba(255,255,255,0.2)',
                background: state.awayMode ? 'rgba(96,165,250,0.16)' : 'rgba(255,255,255,0.06)',
                color: state.awayMode ? '#dbeafe' : '#e5e7eb',
                cursor: canControl ? 'pointer' : 'not-allowed',
                opacity: canControl ? 1 : 0.55,
              }}
            >
              {state.awayMode ? 'Disable Away' : 'Away Mode'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Floor Plan Container */}
      <div className="premium-panel relative h-[600px] w-full overflow-hidden rounded-3xl">
        {/* Background Floor Plan */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={floorPlanAsset}
            alt="House floor plan"
            className="h-full w-full object-cover opacity-55 saturate-125 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(2,6,23,0.74),rgba(17,24,39,0.42),rgba(10,14,24,0.7))]" />
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-yellow-200/10 blur-3xl" />
        </div>

        {/* Room Labels */}
        <div className="pointer-events-none absolute inset-0 z-[1]">
          {Object.entries(ROOM_LABEL_POSITIONS).map(([room, pos]) => (
            <span
              key={`room-label-${room}`}
              className="absolute rounded-full border border-white/35 bg-black/50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-zinc-100 shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {room.replace('_', ' ').toUpperCase()}
            </span>
          ))}
        </div>

        {/* Interactive Overlay Markers */}
        <div className="absolute inset-0 z-[2]">
          {REQUIRED_CONTROLS.map((slot) => (
            <OverlayMarker
              key={`overlay-${slot.id}`}
              slot={slot}
              device={slotBinding.map[slot.id]}
              canControl={canControl}
              awayMode={state.awayMode}
                lockdownMode={state.lockdownMode}
              onToggle={handleDeviceToggle}
              onCreateMissing={createRequiredControl}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-xs text-zinc-300/70">
        All devices are displayed and controlled directly on the interactive floor plan overlay.
      </div>
    </section>
  );
};

export default FloorPlan;
