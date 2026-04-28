import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Zap, ShieldCheck, PlusCircle,
  RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle,
  Flame, BarChart3, Copy, Trash2, Clock
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { connectPermissionsSocket } from '../realtime/permissionsSocket';
import { WEEKLY_USAGE } from '../data/energy';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META = {
  Safe:      { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', Icon: ShieldCheck  },
  Warning:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', Icon: AlertTriangle },
  Emergency: { color: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.45)', Icon: Flame        },
};

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(167,139,250,0.18)',
  backdropFilter: 'blur(18px)',
};

const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : '—');

// ─── Mini bar chart for energy ───────────────────────────────────────────────
const EnergyBarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.kwh));
  return (
    <div className="flex items-end gap-1 h-20 w-full mt-2">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.kwh / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-md transition-all duration-300"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)',
                opacity: 0.85,
              }}
            />
            <span className="text-[9px] text-zinc-400">{d.day}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
              <div
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap"
                style={{ background: 'rgba(139,92,246,0.85)', border: '1px solid rgba(167,139,250,0.5)' }}
              >
                {d.kwh} kWh
              </div>
              <div className="w-2 h-1 overflow-hidden">
                <div className="w-2 h-2 rotate-45 mx-auto -mt-1" style={{ background: 'rgba(139,92,246,0.85)' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Unit Row ────────────────────────────────────────────────────────────────
const UnitRow = ({ unit, onStatusChange, onDelete }) => {
  const meta = STATUS_META[unit.status] || STATUS_META.Safe;
  const { Icon: StatusIcon } = meta;
  const [copying, setCopying] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(unit.unitCode);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
    >
      {/* Status icon */}
      <StatusIcon size={18} style={{ color: meta.color, flexShrink: 0 }} />

      {/* Unit code */}
      <span
        className="font-mono text-sm font-bold tracking-widest"
        style={{ color: '#e9d5ff', minWidth: '5ch' }}
      >
        {unit.unitCode}
      </span>

      {/* Owner */}
      <span className="flex-1 truncate text-sm text-zinc-300">
        {unit.ownerName || 'Unclaimed'}
      </span>

      {/* Claimed badge */}
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
        style={{
          background: unit.claimed ? 'rgba(74,222,128,0.12)' : 'rgba(156,163,175,0.12)',
          border:     unit.claimed ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(156,163,175,0.25)',
          color:      unit.claimed ? '#4ade80' : '#9ca3af',
        }}
      >
        {unit.claimed ? 'Claimed' : 'Unclaimed'}
      </span>

      {/* Status selector */}
      <select
        value={unit.status}
        onChange={(e) => onStatusChange(unit._id, e.target.value)}
        className="rounded-lg border px-2 py-1 text-xs font-semibold outline-none"
        style={{
          background: 'rgba(0,0,0,0.35)',
          borderColor: 'rgba(167,139,250,0.25)',
          color: meta.color,
          cursor: 'pointer',
        }}
      >
        {Object.keys(STATUS_META).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Last updated */}
      <span className="flex items-center gap-1 text-[10px] text-zinc-500 whitespace-nowrap">
        <Clock size={10} />
        {new Date(unit.lastUpdated).toLocaleDateString()}
      </span>

      {/* Copy code */}
      <button
        onClick={copyCode}
        title="Copy unit code"
        className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
      >
        {copying
          ? <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
          : <Copy size={14} style={{ color: 'rgba(196,181,253,0.7)' }} />}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(unit._id)}
        title="Remove unit"
        className="rounded-lg p-1.5 transition-colors hover:bg-rose-500/10"
      >
        <Trash2 size={14} style={{ color: 'rgba(248,113,113,0.7)' }} />
      </button>
    </motion.div>
  );
};

// ─── Gas Alert Toast ─────────────────────────────────────────────────────────
const GasAlertToast = ({ alerts, onDismiss }) => (
  <div className="fixed top-24 right-6 z-50 flex flex-col gap-2" style={{ maxWidth: '320px' }}>
    <AnimatePresence>
      {alerts.map((a) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: 60, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.92 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-3 rounded-2xl px-4 py-3 shadow-[0_12px_40px_rgba(239,68,68,0.30)]"
          style={{
            background: 'rgba(20,5,5,0.88)',
            border: '1px solid rgba(239,68,68,0.55)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Flame size={18} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-100">⚠ Gas Leak — Unit {a.houseCode}</p>
            <p className="text-xs text-rose-300/80 mt-0.5">
              {a.gasLevel} ppm detected · {new Date(a.ts).toLocaleTimeString()}
            </p>
          </div>
          <button onClick={() => onDismiss(a.id)} className="text-rose-400/60 hover:text-rose-300 text-lg leading-none">
            ×
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AgencyDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [units, setUnits] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [gasAlerts, setGasAlerts] = useState([]);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const alertIdRef = useRef(0);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [unitsRes, analyticsRes] = await Promise.all([
        api.get('/agency/units'),
        api.get('/agency/analytics'),
      ]);
      setUnits(unitsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('[agency] fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Real-time Socket.io ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectPermissionsSocket(token);
    if (!socket) return;

    const handleConnect = () => setSocketStatus('connected');
    const handleDisconnect = () => setSocketStatus('disconnected');

    const handleGasAlert = (payload) => {
      const id = ++alertIdRef.current;
      setGasAlerts(prev => [
        { id, ...payload },
        ...prev.slice(0, 4), // keep at most 5
      ]);
      // Update the unit's status in the list
      setUnits(prev =>
        prev.map(u =>
          u.unitCode === payload.houseCode ? { ...u, status: 'Emergency', lastUpdated: new Date() } : u,
        ),
      );
      // Auto-dismiss after 12s
      setTimeout(() => setGasAlerts(prev => prev.filter(a => a.id !== id)), 12000);
    };

    const handleUnitUpdated = (unit) => {
      setUnits(prev => prev.map(u => u._id === unit._id ? unit : u));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('agency:gas-alert', handleGasAlert);
    socket.on('agency:unit-updated', handleUnitUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('agency:gas-alert', handleGasAlert);
      socket.off('agency:unit-updated', handleUnitUpdated);
    };
  }, [token]);

  // ── Generate house code ─────────────────────────────────────────────────────
  const generateHouseCode = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/agency/units/generate');
      setUnits(prev => [data, ...prev]);
      setAnalytics(prev => prev
        ? { ...prev, total: prev.total + 1, unclaimed: prev.unclaimed + 1 }
        : prev);
    } catch (err) {
      console.error('[agency] generate failed', err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (id, status) => {
    setUnits(prev => prev.map(u => u._id === id ? { ...u, status, lastUpdated: new Date() } : u));
    try {
      await api.patch(`/agency/units/${id}`, { status });
      await fetchAll(); // refresh analytics
    } catch (err) {
      console.error('[agency] status update failed', err);
    }
  };

  // ── Delete unit ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setUnits(prev => prev.filter(u => u._id !== id));
    try {
      await api.delete(`/agency/units/${id}`);
      await fetchAll();
    } catch (err) {
      console.error('[agency] delete failed', err);
    }
  };

  // ── Total energy (all units combined simulated) ────────────────────────────
  const totalKwh = WEEKLY_USAGE.reduce((s, d) => s + d.kwh, 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  const statCards = analytics
    ? [
        { label: 'Total Units',  value: analytics.total,     color: '#c4b5fd' },
        { label: 'Safe',         value: analytics.safe,      color: '#4ade80' },
        { label: 'Warning',      value: analytics.warning,   color: '#fbbf24' },
        { label: 'Emergency',    value: analytics.emergency, color: '#f87171' },
        { label: 'Claimed',      value: analytics.claimed,   color: '#38bdf8' },
        { label: 'Unclaimed',    value: analytics.unclaimed, color: '#94a3b8' },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Gas alert toasts */}
      <GasAlertToast alerts={gasAlerts} onDismiss={(id) => setGasAlerts(prev => prev.filter(a => a.id !== id))} />

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(109,40,217,0.25))',
              border: '1px solid rgba(167,139,250,0.40)',
              boxShadow: '0 0 30px rgba(139,92,246,0.30)',
            }}
          >
            <Building2 size={26} style={{ color: '#c4b5fd' }} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Agency Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(196,181,253,0.65)' }}>
              Aura Residence Network — Welcome, {user?.name}
            </p>
          </div>
        </div>

        {/* Socket status pill */}
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              background: socketStatus === 'connected' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
              border: socketStatus === 'connected' ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(248,113,113,0.35)',
              color: socketStatus === 'connected' ? '#4ade80' : '#f87171',
            }}
          >
            {socketStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
            {socketStatus === 'connected' ? 'Live' : 'Offline'}
          </span>

          <button
            onClick={fetchAll}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(167,139,250,0.25)' }}
            title="Refresh"
          >
            <RefreshCw size={15} style={{ color: '#c4b5fd' }} />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map(({ label, value, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl py-5 px-3 text-center"
              style={CARD_STYLE}
            >
              <span className="text-3xl font-black" style={{ color }}>{value}</span>
              <span className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400">{label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Two-column: Energy chart + Generate code ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Energy Analytics Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-3xl p-6"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(167,139,250,0.30)' }}
            >
              <BarChart3 size={18} style={{ color: '#c4b5fd' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Energy Usage</h2>
              <p className="text-[11px] text-zinc-400">Entire Residence — Weekly kWh</p>
            </div>
            <div className="ml-auto text-right">
              <span className="text-xl font-black" style={{ color: '#c4b5fd' }}>{fmt(totalKwh)}</span>
              <p className="text-[10px] text-zinc-500">kWh this week</p>
            </div>
          </div>

          <EnergyBarChart data={WEEKLY_USAGE} />

          {/* Legend row */}
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Peak: <strong style={{ color: '#c4b5fd' }}>
                {WEEKLY_USAGE.reduce((a, b) => a.kwh > b.kwh ? a : b).day}
              </strong>{' '}
              ({WEEKLY_USAGE.reduce((a, b) => a.kwh > b.kwh ? a : b).kwh} kWh)
            </span>
            <span>
              Avg: <strong style={{ color: '#c4b5fd' }}>
                {fmt(totalKwh / WEEKLY_USAGE.length)}
              </strong> kWh/day
            </span>
          </div>
        </motion.div>

        {/* Generate House Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-3xl p-6 flex flex-col"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(167,139,250,0.30)' }}
            >
              <Zap size={18} style={{ color: '#c4b5fd' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Unit Code Generator</h2>
              <p className="text-[11px] text-zinc-400">Create a new Unclaimed Unit</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed mb-6 flex-1">
            Generate a unique house code and add it to the network as an{' '}
            <span style={{ color: '#c4b5fd' }} className="font-semibold">Unclaimed Unit</span>.
            Share it with a homeowner so they can register and link their smart home system.
          </p>

          <button
            id="agency-generate-code"
            onClick={generateHouseCode}
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background: generating
                ? 'rgba(139,92,246,0.25)'
                : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: '1px solid rgba(167,139,250,0.40)',
              color: '#fff',
              boxShadow: generating ? 'none' : '0 0 28px rgba(139,92,246,0.40)',
            }}
          >
            {generating ? (
              <><RefreshCw size={16} className="animate-spin" /> Generating…</>
            ) : (
              <><PlusCircle size={16} /> Generate New House Code</>
            )}
          </button>

          {/* Recently generated */}
          {units.filter(u => !u.claimed).length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">Latest unclaimed</p>
              <div className="flex flex-wrap gap-2">
                {units.filter(u => !u.claimed).slice(0, 5).map(u => (
                  <span
                    key={u._id}
                    className="rounded-lg font-mono text-xs font-bold px-2.5 py-1 tracking-widest"
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(167,139,250,0.30)',
                      color: '#c4b5fd',
                    }}
                  >
                    {u.unitCode}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Units list ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20 }}
        className="rounded-3xl p-6"
        style={CARD_STYLE}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Building2 size={20} style={{ color: '#c4b5fd' }} />
            <h2 className="font-bold text-white text-lg">All Units</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(167,139,250,0.30)', color: '#c4b5fd' }}
            >
              {units.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={40} style={{ color: 'rgba(167,139,250,0.30)' }} className="mb-4" />
            <p className="text-zinc-400 text-sm">No units registered yet.</p>
            <p className="text-zinc-500 text-xs mt-1">Use the generator above to create your first unit.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {units.map(unit => (
                <UnitRow
                  key={unit._id}
                  unit={unit}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AgencyDashboard;
