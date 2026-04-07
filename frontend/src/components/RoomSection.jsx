import { useMemo } from 'react';
import DeviceCard from './DeviceCard';
import SmartDeviceOverlay from './SmartDeviceOverlay';

const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.25)',
};

/* ── Status snippet logic ─────────────────────────────────── */
function getRoomSnippet(devicesInRoom) {
  if (devicesInRoom.length === 0) return { label: 'Empty', color: C.dimmed };

  const securityDevices = devicesInRoom.filter(d => d.type === 'security');
  const activeDevices = devicesInRoom.filter(
    d => d.status === 'on' || d.status === 'online' || d.state === 'ON'
  );

  if (securityDevices.length > 0 && securityDevices.every(d => d.locked)) {
    return { label: '🔒 Secured', color: '#93c5fd' };
  }
  if (activeDevices.length === 0) return { label: 'All standby', color: C.dimmed };
  if (activeDevices.length === devicesInRoom.length) return { label: '✦ All active', color: '#4ade80' };
  return { label: `${activeDevices.length} Active`, color: '#E3C598' };
}

/**
 * RoomSection
 *
 * Props:
 *   roomName   – string
 *   meta       – { emoji, accent, temp? }
 *   devices    – filtered device array for this room
 *   onSelect   – (device) => void  — opens overlay
 *   selected   – device | null — currently open device
 *   onClose    – () => void
 *   onUpdate   – (patch) => void
 *   setDevices – updater for parent state (for overlay patch)
 */
const RoomSection = ({
  roomName,
  meta,
  devices,
  onSelect,
  selected,
  onClose,
  onUpdate,
}) => {
  const snippet = useMemo(() => getRoomSnippet(devices), [devices]);

  if (devices.length === 0) return null;

  const { emoji, accent, temp } = meta;

  return (
    <div className="room-section space-y-5">

      {/* ── Room Header ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${accent}0a 0%, rgba(255,255,255,0.025) 100%)`,
          border: `1px solid ${accent}22`,
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Left: emoji icon + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}30`,
              boxShadow: `0 0 20px ${accent}12`,
            }}
          >
            {emoji}
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight" style={{ color: C.text }}>
              {roomName}
            </h3>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: C.dimmed }}>
              {devices.length} device{devices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right: temp + status snippet */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {temp != null && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-[11px] font-bold" style={{ color: C.muted }}>{temp}°C</span>
            </div>
          )}
          <div
            className="px-3.5 py-1.5 rounded-xl"
            style={{
              background: `${accent}12`,
              border: `1px solid ${accent}30`,
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

      {/* ── Device Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-1">
        {devices.map(d => {
          const isOn = d.type === 'security' ? d.locked : (d.status === 'on' || d.status === 'online');
          const adapter = {
            ...d,
            _id: d.id,
            state: isOn ? 'ON' : 'OFF',
          };
          return (
            <DeviceCard
              key={d.id}
              device={adapter}
              onToggle={() => onSelect(d)}
            />
          );
        })}
      </div>

      {/* Overlay (scoped per room so only the right one opens) */}
      {selected && (
        <SmartDeviceOverlay
          device={selected}
          onClose={onClose}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default RoomSection;
