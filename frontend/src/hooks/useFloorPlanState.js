import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { connectDashboardSocket, disconnectDashboardSocket } from '../realtime/dashboardSocket';

const defaultState = {
  lightingMode: null,
  lockdownMode: false,
  awayMode: false,
  devices: [],
};

// Mirrors backend MODE_ROOM_BRIGHTNESS — used for instant optimistic UI
const MODE_ROOM_BRIGHTNESS = {
  Cinematic: { living_room: 10, kitchen: 10, bedroom: 8,   bathroom: 14, utility: 14, garage: 18 },
  Dinner:    { living_room: 75, kitchen: 75, bedroom: 35,  bathroom: 55, utility: 55, garage: 70 },
  Morning:   { living_room: 100, kitchen: 100, bedroom: 100, bathroom: 100, utility: 100, garage: 95 },
  Sleep:     { living_room: 25, kitchen: 22, bedroom: 3,   bathroom: 18, utility: 18, garage: 10 },
};

const ROOM_KEYS = ['bathroom', 'utility', 'bedroom', 'kitchen', 'living_room', 'garage'];

const normalizeRoom = (room) => {
  const lowered = String(room || '').trim().toLowerCase();
  if (!lowered) return 'living_room';
  if (ROOM_KEYS.includes(lowered)) return lowered;
  if (lowered === 'kitchenette') return 'kitchen';
  if (lowered === 'living room') return 'living_room';
  if (lowered === 'studio') return 'living_room';
  return 'living_room';
};

const normalizeDevices = (devices = []) => {
  return devices.map((device) => ({
    ...device,
    type: String(device.type || '').toLowerCase(),
    room: normalizeRoom(device.room),
    state: device.state === 'ON' ? 'ON' : 'OFF',
    brightness: Number(device.brightness ?? (device.state === 'ON' ? 100 : 0)),
    color: String(device.color || '#ffc87a'),
    position: {
      x: Number(device.position?.x ?? 50),
      y: Number(device.position?.y ?? 50),
    },
  }));
};

export const useFloorPlanState = () => {
  const { token, user } = useContext(AuthContext);
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const isAdmin = user?.role === 'admin';
  /* Strict house-code filter exposed for debugging */
  const houseCode = String(user?.houseCode || '').trim().toUpperCase();

  const fetchState = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data } = await api.get('/floorplan/state');
      setState({
        lightingMode: data.lightingMode || null,
        lockdownMode: !!data.lockdownMode,
        awayMode: !!data.awayMode,
        devices: normalizeDevices(data.devices || []),
      });
      setSyncError('');
    } catch (error) {
      setSyncError(error.response?.data?.message || 'Failed to synchronize floor plan');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectDashboardSocket(token);
    if (!socket) return undefined;

    const handleStateUpdate = (payload) => {
      setState({
        lightingMode: payload?.lightingMode || null,
        lockdownMode: !!payload?.lockdownMode,
        awayMode: !!payload?.awayMode,
        devices: normalizeDevices(payload?.devices || []),
      });
    };

    socket.on('dashboard:state-updated', handleStateUpdate);

    return () => {
      socket.off('dashboard:state-updated', handleStateUpdate);
      disconnectDashboardSocket();
    };
  }, [token]);

  const toggleDevice = useCallback(async (id) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((device) => {
        if (device._id !== id) return device;
        const nextOn = device.state !== 'ON';
        return {
          ...device,
          state: nextOn ? 'ON' : 'OFF',
          brightness: nextOn ? Math.max(device.brightness || 0, 10) : 0,
        };
      }),
    }));

    await api.put(`/floorplan/devices/${id}/toggle`);
  }, []);

  const updateModes = useCallback(async (nextModes) => {
    const optimistic = {
      lightingMode: nextModes.lightingMode !== undefined ? (nextModes.lightingMode || null) : state.lightingMode,
      lockdownMode: nextModes.lockdownMode !== undefined ? !!nextModes.lockdownMode : state.lockdownMode,
      awayMode: nextModes.awayMode !== undefined ? !!nextModes.awayMode : state.awayMode,
    };

    setState((prev) => ({ ...prev, ...optimistic }));
    await api.put('/floorplan/modes', nextModes);
  }, [state.lightingMode, state.lockdownMode, state.awayMode]);

  const setLightingMode = useCallback(async (modeName) => {
    // ── Optimistic update: set mode flag + immediately apply brightness ──
    const roomBrightness = modeName ? (MODE_ROOM_BRIGHTNESS[modeName] || {}) : null;

    setState((prev) => ({
      ...prev,
      lightingMode: modeName || null,
      devices: prev.devices.map((device) => {
        const type = String(device.type || '').toLowerCase();
        const isLight = type === 'light' || type === 'lamp';
        if (!isLight || !roomBrightness) return device;
        const brightness = Number(roomBrightness[device.room] ?? 45);
        return {
          ...device,
          brightness,
          state: brightness > 0 ? 'ON' : 'OFF',
        };
      }),
    }));

    // ── Persist to backend (bulk write happens server-side) ──
    await api.put('/floorplan/modes', { lightingMode: modeName });
  }, []);

  const toggleLockdown = useCallback(async () => {
    await updateModes({ lockdownMode: !state.lockdownMode });
  }, [state.lockdownMode, updateModes]);

  const toggleAway = useCallback(async () => {
    await updateModes({ awayMode: !state.awayMode });
  }, [state.awayMode, updateModes]);

  const updateDevicePosition = useCallback(async (id, position) => {
    if (!isAdmin) return;

    const nextPos = {
      x: Math.max(0, Math.min(100, Number(position?.x ?? 50))),
      y: Math.max(0, Math.min(100, Number(position?.y ?? 50))),
    };

    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((device) =>
        device._id === id ? { ...device, position: nextPos } : device,
      ),
    }));

    await api.put(`/floorplan/devices/${id}/position`, nextPos);
  }, [isAdmin]);

  const updateDeviceTopic = useCallback(async (id, topic) => {
    if (!isAdmin) return;
    await api.put(`/floorplan/devices/${id}/topic`, { topic });
  }, [isAdmin]);

  const updateDeviceState = useCallback(async (id, nextState = {}) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((device) => {
        if (device._id !== id) return device;

        const optimistic = { ...device };

        if (nextState.state === 'ON' || nextState.state === 'OFF') {
          optimistic.state = nextState.state;
        }

        if (nextState.brightness !== undefined) {
          const brightness = Math.max(0, Math.min(100, Number(nextState.brightness || 0)));
          optimistic.brightness = brightness;
          optimistic.state = brightness > 0 ? 'ON' : 'OFF';
        }

        if (typeof nextState.color === 'string' && nextState.color.trim()) {
          optimistic.color = nextState.color.trim();
        }

        return optimistic;
      }),
    }));

    await api.put(`/floorplan/devices/${id}/state`, nextState);
  }, []);

  const addDevice = useCallback(async (payload) => {
    if (!isAdmin) return;

    const normalizedRoom = normalizeRoom(payload?.room);

    /* ── 1. Optimistic insert so UI updates instantly ── */
    const tempId = `temp_${Date.now()}`;
    const optimistic = normalizeDevices([{
      _id: tempId,
      name: payload.name || 'New Device',
      type: payload.type || 'other',
      room: normalizedRoom,
      topic: payload.topic || '',
      state: 'OFF',
      brightness: 0,
      color: '#ffc87a',
      /* Flag as pending-placement — no real position yet */
      position: { x: 50, y: 50 },
      _pending: true,
    }])[0];

    setState(prev => ({ ...prev, devices: [...prev.devices, optimistic] }));

    /* ── 2. Persist to backend (houseCode stamped server-side from JWT) ── */
    await api.post('/floorplan/devices', { ...payload, room: normalizedRoom });

    /* ── 3. Re-fetch so real _id + server position replace the temp entry ── */
    await fetchState({ silent: true });
  }, [isAdmin, fetchState]);

  const updateDeviceMeta = useCallback(async (id, nextMeta) => {
    if (!isAdmin) return;

    const normalizedMeta = {
      ...(nextMeta?.name ? { name: String(nextMeta.name).trim() } : {}),
      ...(nextMeta?.type ? { type: String(nextMeta.type).toLowerCase() } : {}),
      ...(nextMeta?.room !== undefined ? { room: normalizeRoom(nextMeta.room) } : {}),
    };

    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((device) =>
        device._id === id
          ? {
              ...device,
              ...normalizedMeta,
              ...(normalizedMeta.room ? { room: normalizedMeta.room } : {}),
            }
          : device,
      ),
    }));

    await api.put(`/floorplan/devices/${id}/meta`, normalizedMeta);
  }, [isAdmin]);

  const deleteDevice = useCallback(async (id) => {
    if (!isAdmin) return;
    await api.delete(`/floorplan/devices/${id}`);
  }, [isAdmin]);

  const computedDevices = useMemo(() => {
    if (!state.awayMode) return state.devices;
    return state.devices.map((device) => {
      if (device.type === 'light' || device.type === 'lamp') {
        return { ...device, state: 'OFF', brightness: 0 };
      }
      return device;
    });
  }, [state.devices, state.awayMode]);

  return {
    loading,
    isRefreshing,
    syncError,
    isAdmin,
    houseCode,
    floorPlanState: {
      ...state,
      devices: computedDevices,
    },
    refreshFloorPlan: fetchState,
    toggleDevice,
    setLightingMode,
    toggleLockdown,
    toggleAway,
    updateDevicePosition,
    updateDeviceTopic,
    updateDeviceState,
    updateDeviceMeta,
    addDevice,
    deleteDevice,
  };
};
