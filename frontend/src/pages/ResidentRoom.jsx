import { useEffect, useState, useContext, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, Thermometer, Lock, Camera, Tv, Wind,
  Zap, Info, Loader2, RefreshCw, Home
} from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceIcon(type = '') {
  const t = type.toLowerCase();
  if (t.includes('light') || t.includes('lamp'))        return Lightbulb;
  if (t.includes('ac') || t.includes('climate') || t.includes('thermo')) return Thermometer;
  if (t.includes('lock') || t.includes('door'))         return Lock;
  if (t.includes('camera') || t.includes('cam'))        return Camera;
  if (t.includes('tv') || t.includes('media') || t.includes('screen')) return Tv;
  if (t.includes('fan') || t.includes('ventil'))        return Wind;
  return Zap;
}

function isLight(type = '') {
  const t = type.toLowerCase();
  return t.includes('light') || t.includes('lamp') || t.includes('bulb');
}

// ─── Device Card ──────────────────────────────────────────────────────────────

const DeviceCard = ({ device, onUpdate }) => {
  const [toggling, setToggling]     = useState(false);
  const [brightness, setBrightness] = useState(device.brightness ?? 100);
  const [sliderBusy, setSliderBusy] = useState(false);

  const Icon = getDeviceIcon(device.type);
  const isOn = device.status === 'on' || device.isOn === true;
  const isOnline = device.connectivity !== 'offline';
  const showBrightness = isLight(device.type);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const { data } = await api.patch(`/devices/${device._id}/command`, { command: 'toggle' });
      onUpdate(data);
    } catch (err) {
      console.error('Toggle failed', err);
    } finally {
      setToggling(false);
    }
  };

  const handleBrightness = async (val) => {
    setBrightness(val);
    setSliderBusy(true);
    try {
      const { data } = await api.patch(`/devices/${device._id}/command`, {
        command: 'setBrightness',
        value: val,
      });
      onUpdate(data);
    } catch (err) {
      console.error('Brightness failed', err);
    } finally {
      setSliderBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{
        background: isOn ? 'rgba(227,197,152,0.06)' : 'rgba(255,255,255,0.03)',
        borderColor: isOn ? 'rgba(227,197,152,0.25)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Top row: icon + status badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: isOn ? 'rgba(212,175,55,0.20)' : 'rgba(255,255,255,0.06)',
            border: isOn ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <Icon
            size={20}
            style={{ color: isOn ? '#D4AF37' : '#71717a' }}
          />
        </div>

        {/* Online / Offline badge */}
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
          style={
            isOnline
              ? { background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.28)', color: '#4ade80' }
              : { background: 'rgba(113,113,122,0.12)', border: '1px solid rgba(113,113,122,0.28)', color: '#71717a' }
          }
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Name + type */}
      <div className="min-w-0">
        <p className="font-bold text-white text-sm truncate">{device.name}</p>
        {device.type && (
          <p className="text-xs text-zinc-500 capitalize mt-0.5">{device.type}</p>
        )}
      </div>

      {/* Brightness slider */}
      {showBrightness && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Brightness</p>
            <p className="text-[11px] font-black text-amber-300">{brightness}%</p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={brightness}
            disabled={!isOn || sliderBusy}
            onChange={e => setBrightness(Number(e.target.value))}
            onMouseUp={e  => handleBrightness(Number(e.target.value))}
            onTouchEnd={e => handleBrightness(Number(e.target.changedTouches[0]?.clientX ?? brightness))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #D4AF37 ${brightness}%, rgba(255,255,255,0.10) ${brightness}%)`,
            }}
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        disabled={toggling || !isOnline}
        className="w-full rounded-xl py-2.5 text-sm font-black transition flex items-center justify-center gap-2 disabled:opacity-50"
        style={
          isOn
            ? { background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#71717a' }
        }
      >
        {toggling && <Loader2 size={13} className="animate-spin" />}
        {toggling ? 'Updating…' : isOn ? 'Turn Off' : 'Turn On'}
      </button>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ResidentRoom = () => {
  const { user } = useContext(AuthContext);
  const assignedRoom = user?.assignedRoom || 'My Room';

  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/devices');
      const all = Array.isArray(data) ? data : (data?.devices ?? []);
      // Filter client-side to only this resident's room
      const roomDevices = all.filter(
        d => d.room?.toLowerCase() === assignedRoom.toLowerCase()
      );
      setDevices(roomDevices);
    } catch {
      setError('Failed to load devices.');
    } finally {
      setLoading(false);
    }
  }, [assignedRoom]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleUpdate = (updated) => {
    setDevices(prev =>
      prev.map(d => (d._id === updated._id ? { ...d, ...updated } : d))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Your Room</p>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            {assignedRoom}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Control the devices in your assigned room.
          </p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: 'rgba(96,165,250,0.07)',
          border: '1px solid rgba(96,165,250,0.22)',
        }}
      >
        <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300 leading-relaxed">
          You can only control devices in your assigned room.{' '}
          Contact your house owner to request access to other areas.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-2xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Device grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
        </div>
      ) : devices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/4 border border-white/8">
            <Home size={32} className="text-zinc-500" />
          </div>
          <p className="text-zinc-400 font-semibold">No devices found in {assignedRoom}.</p>
          <p className="text-xs text-zinc-600 max-w-xs">
            Ask your house owner to add or assign devices to your room.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {devices.map(device => (
            <DeviceCard key={device._id} device={device} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResidentRoom;
