import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Camera, ChevronRight, Plus, X, CheckCircle2, ChevronDown, Lock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FloorPlan from '../components/FloorPlan';
import DeviceCard from '../components/DeviceCard';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import { useFloorPlanState } from '../hooks/useFloorPlanState';

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
  const [name, setName]       = useState('');
  const [type, setType]       = useState('');
  const [room, setRoom]       = useState('living_room');
  const [typeOpen, setTypeOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const selectedType = DEVICE_TYPES.find(t => t.value === type);
  const selectedRoom = ROOM_OPTIONS.find(r => r.value === room);
  const accent       = selectedType?.accent ?? C.gold;
  const canSave      = name.trim() && type;

  // Auto-generate MQTT topic from name + house code
  const topic = `${String(houseCode || 'HOME').toLowerCase()}/${type || 'device'}/${name.trim().toLowerCase().replace(/\s+/g, '-') || 'new'}`;

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

          {/* Topic preview */}
          {name && type && (
            <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: C.dimmed }}>MQTT Topic</p>
              <p className="text-[11px] font-mono font-bold" style={{ color: accent }}>{topic}</p>
            </div>
          )}

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
  const { user, myPermissionRequests, hasApprovedPermission, requestPermission } = useContext(AuthContext);
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
    const doors = devices.filter((device) => String(device?.type || '').toLowerCase() === 'door');

    return {
      total: devices.length,
      active: devices.filter((device) => device?.state === 'ON').length,
      lightsOn: lights.filter((light) => light.state === 'ON').length,
      doorsOpen: doors.filter((door) => door.state === 'ON').length,
    };
  }, [floorPlanState.devices]);

  const controlPanelDevices = useMemo(() => {
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices : [];
    return devices
      .map((device) => {
      const type = String(device?.type || '').toLowerCase();
      const mappedType = type === 'light' || type === 'lamp'
        ? 'light'
        : type === 'door'
          ? 'security'
          : type === 'camera'
            ? 'camera'
          : type === 'tv'
            ? 'media'
            : 'appliance';

      return {
        ...device,
        type: mappedType,
        status: device.state === 'ON' ? 'on' : 'off',
        value: mappedType === 'light' ? Number(device.brightness || 0) : device.value,
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
    <div className="ui-depth-bg relative min-h-screen w-full overflow-hidden p-4 md:p-6">
      <div className="pointer-events-none absolute -left-24 top-14 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-violet-400/12 blur-3xl" />

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
      <div className="premium-panel interactive-lift mb-8 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100/75">Dashboard</p>
            <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">{greeting()}, {user?.name || 'User'}</h1>
            <p className="mt-1 text-sm text-zinc-300/75">
              {isResidentView ? 'Resident access mode' : 'Admin control mode'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="state-chip px-3 py-1 text-zinc-200">{liveDate}</span>
              {user?.houseCode ? (
                <span className="state-chip light-state-on border-amber-200/45 bg-amber-300/20 px-3 py-1 font-bold text-amber-100">
                  House Code: {user.houseCode}
                </span>
              ) : null}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddDevice(true)}
              className="control-button pressable inline-flex items-center gap-2 bg-sky-300/90 px-4 py-2 font-bold text-slate-900"
            >
              <Plus size={18} />
              Add Device
            </button>
          )}
        </div>
      </div>

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
          <div className="premium-panel interactive-lift p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/80">Resident Access</p>
                <h2 className="mt-1 text-xl font-black text-white">Request Access</h2>
                <p className="mt-1 text-sm text-zinc-300/80">You can view all rooms and devices in real-time. Locked controls require explicit admin approval.</p>
              </div>
              <span className="state-chip px-3 py-1 text-xs text-zinc-200">
                Locked Features: {lockedFeatures.length}
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

      {/* Restored Home Control Panel */}
      <section className="mt-10 space-y-5">
        <div className="premium-panel interactive-lift p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Home Control Panel</h2>
              <p className="text-sm text-zinc-300/75">Live device controls and home status synchronized with the floor plan overlay.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Devices: {deviceStats.total}</div>
              <div className="premium-panel-soft interactive-lift state-chip-active px-3 py-2 text-zinc-100">Active: {deviceStats.active}</div>
              <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Lights On: {deviceStats.lightsOn}</div>
              <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Doors Open: {deviceStats.doorsOpen}</div>
            </div>
          </div>
        </div>

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
          <div className="premium-panel p-6 text-sm text-zinc-300/80">
            No devices are currently available.
          </div>
        )}
      </section>

      {/* Away Mode Camera Monitoring Panel (bottom only, collapsible) */}
      <section className="mt-10">
        <Link
          to="/security"
          className="premium-panel interactive-lift group block p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="premium-panel-soft light-state-on rounded-xl p-2.5 text-zinc-100">
                <Camera size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Camera Monitoring</h2>
                <p className="text-sm text-zinc-300/75">
                  Open the live camera dashboard with feeds, alerts, and detailed monitoring.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 text-sm font-bold text-zinc-100 transition-all duration-300 group-hover:translate-x-1 group-hover:text-sky-200">
              Open
              <ChevronRight size={16} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Cameras: {cameraDevices.length || 4}</div>
            <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Mode: {!!floorPlanState.lockdownMode ? 'LOCKDOWN' : !!floorPlanState.awayMode ? 'AWAY' : 'NORMAL'}</div>
            <div className="premium-panel-soft interactive-lift state-chip-active px-3 py-2 text-zinc-100">Sync: LIVE</div>
            <div className="premium-panel-soft interactive-lift px-3 py-2 text-zinc-100">Status: READY</div>
          </div>
        </Link>
      </section>
      </div>
    </div>
  );
};

export default Dashboard;
