import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, Lightbulb, Thermometer, Shield, Tv, Zap,
  LayoutGrid, RefreshCw, Trash2,
} from 'lucide-react';
import SmartDeviceOverlay from '../components/SmartDeviceOverlay';
import DeviceCard from '../components/DeviceCard';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';

const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.25)',
  gold:   '#E3C598',
};

const CATEGORIES = ['All', 'Lighting', 'Climate', 'Security', 'Media', 'Appliance'];

const CAT_CONFIG = {
  All:       { Icon: LayoutGrid,  accent: '#E3C598' },
  Lighting:  { Icon: Lightbulb,   accent: '#f5c842' },
  Climate:   { Icon: Thermometer, accent: '#f97316' },
  Security:  { Icon: Shield,      accent: '#60a5fa' },
  Media:     { Icon: Tv,          accent: '#a78bfa' },
  Appliance: { Icon: Zap,         accent: '#3E5F4F' },
};

const TYPE_TO_CATEGORY = {
  light: 'Lighting', lamp: 'Lighting',
  ac: 'Climate', climate: 'Climate',
  door: 'Security', lock: 'Security', camera: 'Security',
  tv: 'Media', television: 'Media',
  washer: 'Appliance', washing_machine: 'Appliance', machine: 'Appliance',
  window: 'Appliance', blind: 'Appliance', blinds: 'Appliance',
  sensor: 'Appliance', gas_sensor: 'Appliance',
};

const getCategory = (type) => TYPE_TO_CATEGORY[String(type || '').toLowerCase()] ?? 'Appliance';

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function DeviceSkeleton() {
  return (
    <div
      className="relative rounded-[1.5rem] border overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', minHeight: 160 }}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
          animation: 'shimmer-sweep 1.6s ease-in-out infinite',
        }}
      />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="h-11 w-11 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="h-5 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="h-2.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="h-8 w-full rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}

// ── Room status snippet ───────────────────────────────────────────────────────
function getRoomSnippet(devicesInRoom) {
  if (devicesInRoom.length === 0) return { label: 'Empty', color: C.dimmed };
  const active = devicesInRoom.filter(d => d.state === 'ON');
  if (active.length === 0) return { label: 'Standby', color: C.dimmed };
  if (active.length === devicesInRoom.length) return { label: '✦ All on', color: '#4ade80' };
  return { label: `${active.length} Active`, color: C.gold };
}

// ════════════════════════════════════════════════════════════════════════════
//  DEVICES PAGE
// ════════════════════════════════════════════════════════════════════════════
const Devices = () => {
  const [devices, setDevices]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null); // device to confirm-delete
  const [deleting, setDeleting]             = useState(false);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/devices');
      const list = Array.isArray(data) ? data : (data?.devices ?? []);
      setDevices(list.map(d => ({ ...d, category: getCategory(d.type) })));
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const filteredDevices = useMemo(() => {
    if (activeFilter === 'All') return devices;
    return devices.filter(d => d.category === activeFilter);
  }, [devices, activeFilter]);

  const devicesByRoom = useMemo(() => {
    const map = {};
    filteredDevices.forEach(d => {
      const room = d.room || 'Home';
      if (!map[room]) map[room] = [];
      map[room].push(d);
    });
    return map;
  }, [filteredDevices]);

  const catCounts = useMemo(() => {
    const counts = { All: devices.length };
    CATEGORIES.slice(1).forEach(cat => {
      counts[cat] = devices.filter(d => d.category === cat).length;
    });
    return counts;
  }, [devices]);

  const handleUpdate = patch => {
    setDevices(prev => prev.map(d => d._id === patch._id ? { ...d, ...patch, category: getCategory(patch.type || d.type) } : d));
    if (selectedDevice?._id === patch._id) setSelectedDevice(prev => ({ ...prev, ...patch }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/devices/${deleteTarget._id}`);
      setDevices(prev => prev.filter(d => d._id !== deleteTarget._id));
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const rooms = Object.keys(devicesByRoom).sort();

  return (
    <div className="space-y-8 pb-28" style={{ color: C.text }}>
      {/* Overlay */}
      {selectedDevice && (
        <SmartDeviceOverlay
          device={{ ...selectedDevice, state: selectedDevice.state === 'ON' ? 'ON' : 'OFF' }}
          onClose={() => setSelectedDevice(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete device?"
        message={`"${deleteTarget?.name}" will be permanently removed from your house.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>Home Devices</h2>
          <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
            {loading ? 'Loading devices…' : `${devices.length} devices across ${rooms.length} rooms`}
          </p>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Filter size={14} style={{ color: C.dimmed }} />
        </div>

        {CATEGORIES.map(cat => {
          const isActive = activeFilter === cat;
          const { Icon, accent } = CAT_CONFIG[cat] ?? CAT_CONFIG.All;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0"
              style={{
                background: isActive ? `linear-gradient(135deg, ${accent}22, ${accent}0e)` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? accent : C.muted,
                boxShadow: isActive ? `0 0 18px ${accent}22` : 'none',
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
              {cat}
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: isActive ? `${accent}25` : 'rgba(255,255,255,0.07)', color: isActive ? accent : C.dimmed }}>
                {catCounts[cat] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Skeleton grid */}
      {loading && (
        <div className="space-y-8">
          {[0, 1].map(r => (
            <div key={r} className="space-y-4">
              <div className="h-16 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <DeviceSkeleton key={i} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room-based device groups */}
      {!loading && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-10">
            {rooms.map(roomName => {
              const roomDevices = devicesByRoom[roomName];
              const snippet = getRoomSnippet(roomDevices);

              return (
                <motion.div
                  key={roomName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Room Header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 rounded-3xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(227,197,152,0.07) 0%, rgba(255,255,255,0.025) 100%)',
                      border: '1px solid rgba(227,197,152,0.18)',
                      backdropFilter: 'blur(25px)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                        style={{ background: 'rgba(227,197,152,0.12)', border: '1px solid rgba(227,197,152,0.28)' }}>
                        🏠
                      </div>
                      <div>
                        <h3 className="text-lg font-black" style={{ color: C.text }}>{roomName}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.dimmed }}>
                          {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', color: snippet.color }}>
                      {snippet.label}
                    </span>
                  </div>

                  {/* Device grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pl-1">
                    {roomDevices.map(device => (
                      <div key={device._id} className="relative group">
                        <DeviceCard
                          device={{ ...device, state: device.state === 'ON' ? 'ON' : 'OFF' }}
                          onToggle={() => setSelectedDevice(device)}
                        />
                        {/* Delete button — appears on hover */}
                        <button
                          onClick={() => setDeleteTarget(device)}
                          title="Delete device"
                          className="absolute top-2 right-2 w-7 h-7 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)' }}
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {/* Empty state */}
            {filteredDevices.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-24 flex flex-col items-center gap-5 text-center rounded-[2rem] border border-dashed"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center opacity-40"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Filter size={28} style={{ color: C.text }} />
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: C.muted }}>
                    No {activeFilter === 'All' ? '' : activeFilter} devices found
                  </p>
                  <p className="text-sm font-medium mt-1" style={{ color: C.dimmed }}>
                    {activeFilter !== 'All' ? 'Try a different category.' : 'Add your first device from the Dashboard.'}
                  </p>
                </div>
                {activeFilter !== 'All' && (
                  <button onClick={() => setActiveFilter('All')}
                    className="px-6 py-2.5 rounded-2xl text-sm font-bold hover:opacity-80 transition"
                    style={{ background: 'rgba(255,255,255,0.07)', color: C.text }}>
                    Show all devices
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Devices;
