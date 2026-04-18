import { useContext, useEffect, useMemo, useState } from 'react';
import { Camera, ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FloorPlan from '../components/FloorPlan';
import DeviceCard from '../components/DeviceCard';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import { useFloorPlanState } from '../hooks/useFloorPlanState';

const ROOM_KEYS = ['bathroom', 'utility', 'bedroom', 'kitchen', 'living_room', 'garage', 'entrance'];

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

const Dashboard = ({ accessMode = 'admin' }) => {
  const { user, myPermissionRequests } = useContext(AuthContext);
  const navigate = useNavigate();
  const isResidentView = accessMode === 'resident';
  const [now, setNow] = useState(() => new Date());
  const [selectedControlDeviceId, setSelectedControlDeviceId] = useState(null);

  const {
    floorPlanState,
    toggleDevice: toggleFloorDevice,
    setLightingMode,
    toggleLockdown,
    toggleAway,
    updateDeviceState,
    addDevice: addFloorDevice,
    isAdmin: isFloorPlanAdmin,
  } = useFloorPlanState();

  const canControl = true;
  const isAdmin = isFloorPlanAdmin && !isResidentView;

  const residentRooms = useMemo(() => {
    if (!isResidentView) return new Set();

    const rooms = new Set();
    const addRoom = (value) => {
      const normalized = normalizeRoom(value);
      if (normalized) {
        rooms.add(normalized);
      }
    };

    addRoom(user?.assignedRoom || '');

    (Array.isArray(user?.permissions) ? user.permissions : []).forEach((permission) => {
      const normalized = String(permission || '').trim().toLowerCase();
      if (normalized.startsWith('room:')) {
        addRoom(normalized.slice(5));
      } else if (ROOM_KEYS.includes(normalized)) {
        addRoom(normalized);
      }
    });

    (Array.isArray(myPermissionRequests) ? myPermissionRequests : []).forEach((request) => {
      if (request.status === 'approved' && request.room) {
        addRoom(request.room);
      }
    });

    return rooms;
  }, [isResidentView, myPermissionRequests, user?.assignedRoom, user?.permissions]);

  const canAccessRoom = useMemo(() => {
    return (room) => {
      if (!isResidentView) return true;
      return residentRooms.has(normalizeRoom(room));
    };
  }, [isResidentView, residentRooms]);

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
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices.filter((device) => canAccessRoom(device.room)) : [];
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
  }, [canAccessRoom, floorPlanState.devices]);

  const controlPanelDevices = useMemo(() => {
    const devices = Array.isArray(floorPlanState.devices) ? floorPlanState.devices : [];
    return devices
      .filter((device) => canAccessRoom(device.room))
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
        lastSeen: 'Live',
      };
      });
  }, [canAccessRoom, floorPlanState.devices]);

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
      await addFloorDevice(deviceData);
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  };

  const handleToggleDevice = async (deviceId) => {
    if (!canControl) return;
    try {
      await toggleFloorDevice(deviceId);
    } catch (error) {
      console.error('Error toggling device:', error);
      throw error;
    }
  };

  const handleAdvancedUpdate = async (device, patch) => {
    if (!device || !device._id) return;

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

  return (
    <div className="ui-depth-bg relative min-h-screen w-full overflow-hidden p-4 md:p-6">
      <div className="pointer-events-none absolute -left-24 top-14 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-violet-400/12 blur-3xl" />

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
              onClick={() => navigate('/admin/add-device')}
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
        canControl={canControl}
        isAdmin={isAdmin}
        canManageModes={isAdmin}
        onToggleDevice={handleToggleDevice}
        onSetLightingMode={setLightingMode}
        onToggleLockdown={toggleLockdown}
        onToggleAway={toggleAway}
        onAddDevice={handleAddDevice}
      />

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

        {controlPanelDevices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {controlPanelDevices.map((device) => {
              const essentialType = device.type === 'security' || device.type === 'camera';
              const disabledByAway = floorPlanState.awayMode && !essentialType;

              return (
                <div key={device._id} className={disabledByAway ? 'opacity-55 saturate-50' : ''}>
                  {disabledByAway ? (
                    <div className="mb-2 rounded-lg border border-amber-300/35 bg-amber-400/12 px-2 py-1 text-[10px] font-semibold text-amber-100 transition-all duration-300">
                      Disabled in Away Mode
                    </div>
                  ) : null}
                  <DeviceCard
                    device={device}
                    onToggle={() => {
                      if (disabledByAway) return;
                      handleToggleDevice(device._id);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedControlDeviceId(device._id)}
                    className="control-button pressable mt-2 w-full px-3 py-2 text-xs font-bold text-zinc-100"
                  >
                    Advanced Controls
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
