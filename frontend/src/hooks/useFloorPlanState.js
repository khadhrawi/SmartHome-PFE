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
  const [syncError, setSyncError] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchState = useCallback(async () => {
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
    await updateModes({ lightingMode: modeName });
  }, [updateModes]);

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
    await api.post('/floorplan/devices', {
      ...payload,
      room: normalizeRoom(payload?.room),
    });
  }, [isAdmin]);

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
    syncError,
    isAdmin,
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
