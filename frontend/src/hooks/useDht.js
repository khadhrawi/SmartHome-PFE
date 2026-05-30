/**
 * useDht
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to 'house:dht-update' socket events and exposes live
 * temperature + humidity readings.
 *
 * Returns:
 *   temperature  (°C, null until first reading)
 *   humidity     (%, null until first reading)
 *   lastDhtRead  (ISO timestamp string, null until first reading)
 */

import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { connectDashboardSocket } from '../realtime/dashboardSocket';
import { AuthContext } from '../context/AuthContext';

export function useDht() {
  const { token } = useContext(AuthContext);
  const [dhtState, setDhtState] = useState({
    temperature: null,
    humidity:    null,
    lastDhtRead: null,
  });

  // Live socket updates
  useEffect(() => {
    if (!token) return;
    const socket = connectDashboardSocket(token);
    if (!socket) return;

    const handleDht = (payload) => {
      setDhtState({
        temperature: Number(payload?.temperature ?? null),
        humidity:    Number(payload?.humidity    ?? null),
        lastDhtRead: payload?.ts ? new Date(payload.ts).toISOString() : new Date().toISOString(),
      });
    };

    socket.on('house:dht-update', handleDht);
    return () => socket.off('house:dht-update', handleDht);
  }, [token]);

  // Initial state on mount (so the card isn't empty before first MQTT push)
  useEffect(() => {
    if (!token) return;
    axios.get('/api/dht/state', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      setDhtState({
        temperature: data.temperature != null ? Number(data.temperature) : null,
        humidity:    data.humidity    != null ? Number(data.humidity)    : null,
        lastDhtRead: data.lastDhtRead ?? null,
      });
    }).catch(() => { /* silent */ });
  }, [token]);

  return dhtState;
}
