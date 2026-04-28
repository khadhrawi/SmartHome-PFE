/**
 * useGasMonitor
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to the Socket.IO server and listens for:
 *   'house:gas-emergency'  — live gas readings + emergency flag
 *   'dashboard:gas-update' — same payload, triggers header badge
 *
 * Returns:
 *   gasLevel      – current ppm reading
 *   threshold     – configured alarm threshold
 *   emergencyMode – true = gas alarm active
 *   gasValveOpen  – current valve state
 *   clearEmergency() – admin-only: calls API to manually clear alarm
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { connectDashboardSocket } from '../realtime/dashboardSocket';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

export function useGasMonitor() {
  const { user, token } = useContext(AuthContext);

  const [gasState, setGasState] = useState({
    gasLevel:      0,
    threshold:     400,
    emergencyMode: false,
    gasValveOpen:  true,
  });

  /* ── Connect socket + subscribe ─────────────────────────────────────── */
  useEffect(() => {
    if (!token) return;

    const socket = connectDashboardSocket(token);
    if (!socket) return;

    const handleGasEvent = (payload) => {
      setGasState({
        gasLevel:      Number(payload?.gasLevel      ?? 0),
        threshold:     Number(payload?.threshold     ?? 400),
        emergencyMode: Boolean(payload?.emergencyMode),
        gasValveOpen:  payload?.gasValveOpen !== false,
      });
    };

    socket.on('house:gas-emergency',  handleGasEvent);
    socket.on('dashboard:gas-update', handleGasEvent);

    return () => {
      socket.off('house:gas-emergency',  handleGasEvent);
      socket.off('dashboard:gas-update', handleGasEvent);
    };
  }, [token]);

  /* ── Fetch initial state on mount ──────────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    axios.get('/api/gas/state', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      setGasState({
        gasLevel:      Number(data.gasLevel      ?? 0),
        threshold:     Number(data.gasThreshold  ?? 400),
        emergencyMode: Boolean(data.emergencyMode),
        gasValveOpen:  data.gasValveOpen !== false,
      });
    }).catch(() => { /* silently ignore if gas route not yet seeded */ });
  }, [token]);

  /* ── Admin: clear emergency ─────────────────────────────────────────── */
  const clearEmergency = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      await axios.post('/api/gas/clear-emergency', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGasState(prev => ({ ...prev, emergencyMode: false }));
    } catch (err) {
      console.error('[GasMonitor] clearEmergency failed:', err.message);
    }
  }, [token, user?.role]);

  return { ...gasState, clearEmergency };
}
