import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, Home, Users, Building2,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Trash2,
  UserX, Shield, RefreshCw, Plus
} from 'lucide-react';
import api from '../api/axios';

/* ── Confirm Modal ── */
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <motion.div
      className="w-full max-w-sm rounded-3xl border border-red-400/25 bg-zinc-900 p-6 shadow-2xl"
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 mx-auto">
        <AlertTriangle size={22} className="text-red-400" />
      </div>
      <p className="text-center text-sm font-semibold text-white mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-white/10 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancel</button>
        <button onClick={onConfirm} className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-black text-white hover:bg-red-400">Remove</button>
      </div>
    </motion.div>
  </div>
);

/* ── Status colors for requests ── */
const S = {
  pending:  { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.28)',  text: '#fbbf24', label: 'Pending' },
  approved: { bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.22)',  text: '#4ade80', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.22)',   text: '#f87171', label: 'Rejected' },
  consumed: { bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.18)', text: '#94a3b8', label: 'Registered' },
};

/* ── Request Card ── */
const RequestCard = ({ req, onApprove, onReject, busy }) => {
  const [expanded, setExpanded] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const s = S[req.status] || S.pending;

  return (
    <motion.div layout className="rounded-2xl border p-4" style={{ background: s.bg, borderColor: s.border }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">{req.name}</p>
          <p className="truncate text-xs text-zinc-400">{req.email}</p>
          {req.phone && <p className="text-xs text-zinc-500">{req.phone}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: s.border, color: s.text }}>{s.label}</span>
          <button onClick={() => setExpanded(p => !p)} className="text-zinc-400 hover:text-white">{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div className="mt-3 space-y-3 text-sm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {req.note && <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-300">{req.note}</p>}
            <p className="text-xs text-zinc-500">Submitted: {new Date(req.createdAt).toLocaleString()}</p>

            {req.status === 'approved' && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2">
                <p className="text-xs font-bold text-emerald-300">Access code emailed to applicant.</p>
                <p className="mt-0.5 text-xs text-zinc-400">Code: <span className="font-mono text-emerald-200">{req.accessCode}</span></p>
              </div>
            )}

            {req.status === 'pending' && (
              showRejectBox ? (
                <div className="space-y-2">
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason (optional)" rows={2}
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"/>
                  <div className="flex gap-2">
                    <button onClick={() => onReject(req._id, rejectNote)} disabled={busy === req._id}
                      className="flex items-center gap-1 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 disabled:opacity-50">
                      {busy === req._id ? <Loader2 size={12} className="animate-spin"/> : <XCircle size={12}/>} Confirm Reject
                    </button>
                    <button onClick={() => setShowRejectBox(false)} className="px-2 text-xs text-zinc-400 hover:text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => onApprove(req._id)} disabled={busy === req._id}
                    className="flex items-center gap-1 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50">
                    {busy === req._id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Approve
                  </button>
                  <button onClick={() => setShowRejectBox(true)}
                    className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20">
                    <XCircle size={12}/> Reject
                  </button>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── House Owner Card ── */
const OwnerCard = ({ owner, onKickOwner, onKickResident }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div layout className="rounded-2xl border border-white/8 bg-white/4 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-400/15 flex items-center justify-center">
            <Home size={16} className="text-sky-300"/>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{owner.name}</p>
            <p className="text-xs text-zinc-400 truncate">{owner.email}</p>
            {owner.houseCode && <p className="font-mono text-[10px] text-amber-300 mt-0.5">House: {owner.houseCode}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-zinc-500">{owner.residents?.length || 0} resident{owner.residents?.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setExpanded(p => !p)} className="text-zinc-400 hover:text-white">{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>
          <button onClick={() => onKickOwner(owner)}
            className="flex items-center gap-1 rounded-xl bg-red-500/15 px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/25 transition">
            <UserX size={13}/> Kick
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div className="mt-3 space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {owner.residents?.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2 text-center">No residents in this house.</p>
            ) : (
              owner.residents.map(r => (
                <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{r.email}</p>
                  </div>
                  <button onClick={() => onKickResident(r)}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-red-500/10 px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20">
                    <UserX size={12}/> Kick
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Main Dashboard ── */
const AgencyDashboard = () => {
  const [tab, setTab]           = useState('requests');
  const [requests, setRequests] = useState([]);
  const [reqFilter, setReqFilter] = useState('pending');
  const [owners, setOwners]     = useState([]);
  const [houses, setHouses]     = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [addingHouse, setAddingHouse] = useState(false);
  const [busy, setBusy]         = useState(null);
  const [error, setError]       = useState('');
  const [confirm, setConfirm]   = useState(null);

  const loadRequests = async () => {
    setLoadingReq(true);
    try {
      const { data } = await api.get(`/owner-requests?status=${reqFilter}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load requests.'); }
    finally { setLoadingReq(false); }
  };

  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      const { data } = await api.get('/agency/house-owners');
      setOwners(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load house owners.'); }
    finally { setLoadingOwners(false); }
  };

  const loadHouses = async () => {
    setLoadingHouses(true);
    try {
      const { data } = await api.get('/agency/units');
      setHouses(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load houses.'); }
    finally { setLoadingHouses(false); }
  };

  const handleAddHouse = async () => {
    setAddingHouse(true);
    try {
      const { data } = await api.post('/agency/units/generate');
      setHouses(prev => [data, ...prev]);
    } catch (err) { setError(err.response?.data?.message || 'Failed to generate house.'); }
    finally { setAddingHouse(false); }
  };

  const handleDeleteHouse = (house) => {
    setConfirm({
      message: `Delete house ${house.unitCode}${house.claimed ? ` (owned by ${house.ownerName})` : ' (unclaimed)'}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/agency/units/${house._id}`);
          setHouses(prev => prev.filter(h => h._id !== house._id));
        } catch (err) { setError(err.response?.data?.message || 'Failed to delete house.'); }
      },
    });
  };

  useEffect(() => { loadRequests(); }, [reqFilter]);
  useEffect(() => { loadOwners(); loadHouses(); }, []);

  const handleApprove = async (id) => {
    setBusy(id);
    try {
      const { data } = await api.patch(`/owner-requests/${id}/approve`);
      setRequests(prev => prev.map(r => r._id === id ? data.request : r));
    } catch (err) { setError(err.response?.data?.message || 'Failed to approve.'); }
    finally { setBusy(null); }
  };

  const handleReject = async (id, note) => {
    setBusy(id);
    try {
      const { data } = await api.patch(`/owner-requests/${id}/reject`, { reviewNote: note });
      setRequests(prev => prev.map(r => r._id === id ? data.request : r));
    } catch (err) { setError(err.response?.data?.message || 'Failed to reject.'); }
    finally { setBusy(null); }
  };

  const handleKickOwner = (owner) => {
    setConfirm({
      message: `Remove house owner "${owner.name}" and all their ${owner.residents?.length || 0} resident(s)? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/agency/house-owners/${owner._id}`);
          setOwners(prev => prev.filter(o => o._id !== owner._id));
        } catch (err) { setError(err.response?.data?.message || 'Failed to remove.'); }
      },
    });
  };

  const handleKickResident = (resident) => {
    setConfirm({
      message: `Remove resident "${resident.name}" from their house?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/agency/residents/${resident._id}`);
          setOwners(prev => prev.map(o => ({ ...o, residents: o.residents.filter(r => r._id !== resident._id) })));
        } catch (err) { setError(err.response?.data?.message || 'Failed to remove.'); }
      },
    });
  };

  const totalResidents = owners.reduce((s, o) => s + (o.residents?.length || 0), 0);
  const pendingCount   = requests.filter(r => r.status === 'pending').length;

  const tabs = [
    { id: 'requests', label: 'Owner Requests',  badge: pendingCount },
    { id: 'users',    label: 'Houses & Users',  badge: owners.length },
    { id: 'houses',   label: 'Manage Houses',   badge: houses.length },
  ];

  return (
    <div className="relative min-h-screen w-full p-4 md:p-8" style={{ background: 'linear-gradient(155deg, #07080E 0%, #0D1420 48%, #090A13 100%)' }}>
      <div className="pointer-events-none absolute -left-32 -top-16 h-[500px] w-[500px] rounded-full bg-amber-500/8 blur-3xl"/>
      <div className="pointer-events-none absolute right-0 top-20 h-[450px] w-[450px] rounded-full bg-blue-600/6 blur-3xl"/>
      <div className="pointer-events-none absolute left-1/2 bottom-40 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/5 blur-3xl"/>

      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      <div className="relative z-10 mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <motion.div
          className="relative overflow-hidden rounded-[2rem] p-7"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-amber-500/8 blur-2xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/6 blur-xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(167,139,250,0.16) 100%)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  boxShadow: '0 0 28px rgba(251,191,36,0.18)',
                }}
              >
                <Shield size={26} style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(251,191,36,0.65)' }}>Platform Admin</p>
                <h1
                  className="mt-0.5 text-3xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Agency Dashboard
                </h1>
                <p className="mt-1 text-xs text-zinc-400">Full control over house owners, residents, and access requests.</p>
              </div>
            </div>
            <button
              onClick={() => { loadRequests(); loadOwners(); }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}
            >
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'House Owners',    value: owners.length,                              icon: Home,     color: '#4ade80' },
            { label: 'Total Residents', value: totalResidents,                             icon: Users,    color: '#60a5fa' },
            { label: 'Pending',         value: pendingCount,                               icon: Clock,    color: '#fbbf24' },
            { label: 'Active Houses',   value: owners.filter(o => o.houseCode).length,     icon: Building2, color: '#a78bfa' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              className="relative overflow-hidden rounded-[1.5rem] p-5"
              style={{
                background: `${color}0a`,
                border: `1px solid ${color}28`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 8px 32px ${color}10`,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 rounded-full blur-xl" style={{ background: `${color}18` }} />
              <div
                className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: `${color}18`, border: `1px solid ${color}30`, boxShadow: `0 0 16px ${color}20` }}
              >
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: `${color}88` }}>{label}</p>
              <p className="mt-1 text-3xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
            </motion.div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div className="flex items-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-300"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AlertTriangle size={15}/> {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-200"><XCircle size={14}/></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-2xl p-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
              style={{
                background: tab === t.id ? 'rgba(251,191,36,0.12)' : 'transparent',
                border: tab === t.id ? '1px solid rgba(251,191,36,0.28)' : '1px solid transparent',
                color: tab === t.id ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                boxShadow: tab === t.id ? '0 4px 16px rgba(251,191,36,0.12)' : 'none',
              }}
            >
              {t.label}
              {t.badge > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-black"
                  style={{
                    background: tab === t.id ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                    color: tab === t.id ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Owner Requests */}
        {tab === 'requests' && (
          <motion.div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2
                className="text-lg font-black"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                House Owner Requests
              </h2>
              <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {['pending','approved','rejected','consumed'].map(s => (
                  <button key={s} onClick={() => setReqFilter(s)}
                    className="rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all"
                    style={{
                      background: reqFilter === s ? '#fbbf24' : 'transparent',
                      color: reqFilter === s ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                    }}>
                    {s === 'consumed' ? 'Registered' : s}
                  </button>
                ))}
              </div>
            </div>
            {loadingReq ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500"/></div>
            ) : requests.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No {reqFilter} requests.</p>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <RequestCard key={req._id} req={req} onApprove={handleApprove} onReject={handleReject} busy={busy}/>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Houses & Users */}
        {tab === 'users' && (
          <motion.div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-lg font-black"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Houses &amp; Users
              </h2>
              <p className="text-xs text-zinc-500">{owners.length} owner{owners.length !== 1 ? 's' : ''} · {totalResidents} resident{totalResidents !== 1 ? 's' : ''}</p>
            </div>
            {loadingOwners ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500"/></div>
            ) : owners.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No house owners yet.</p>
            ) : (
              <div className="space-y-3">
                {owners.map(owner => (
                  <OwnerCard key={owner._id} owner={owner} onKickOwner={handleKickOwner} onKickResident={handleKickResident}/>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Tab: Manage Houses */}
        {tab === 'houses' && (
          <motion.div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  className="text-lg font-black"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Manage Houses
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">{houses.length} total · {houses.filter(h => h.claimed).length} claimed · {houses.filter(h => !h.claimed).length} unclaimed</p>
              </div>
              <button
                onClick={handleAddHouse}
                disabled={addingHouse}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all hover:scale-105 disabled:opacity-60"
                style={{ background: '#fbbf24', color: '#0a0a0a', boxShadow: '0 6px 20px rgba(251,191,36,0.3)' }}
              >
                {addingHouse ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
                {addingHouse ? 'Generating…' : 'Add House'}
              </button>
            </div>

            {loadingHouses ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500"/></div>
            ) : houses.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No houses yet. Click "Add House" to generate one.</p>
            ) : (
              <div className="space-y-2">
                {houses.map(h => (
                  <motion.div key={h._id} layout
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${h.claimed ? 'bg-emerald-400/15' : 'bg-zinc-400/10'}`}>
                        <Home size={15} className={h.claimed ? 'text-emerald-300' : 'text-zinc-400'}/>
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-black text-white text-sm">{h.unitCode}</p>
                        <p className="text-xs text-zinc-400 truncate">{h.claimed ? `Owner: ${h.ownerName}` : 'Unclaimed'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${h.claimed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-zinc-400/10 text-zinc-400'}`}>
                        {h.claimed ? 'Claimed' : 'Free'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${h.status === 'Safe' ? 'bg-blue-400/12 text-blue-300' : h.status === 'Warning' ? 'bg-amber-400/15 text-amber-300' : 'bg-red-400/15 text-red-300'}`}>
                        {h.status}
                      </span>
                      <button
                        onClick={() => handleDeleteHouse(h)}
                        className="flex items-center gap-1 rounded-xl bg-red-500/12 px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/25 transition"
                      >
                        <Trash2 size={12}/> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default AgencyDashboard;
