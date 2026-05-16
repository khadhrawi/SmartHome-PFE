import { useContext, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, CheckCircle, XCircle, User, Home, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.30)', Icon: Clock },
  approved: { label: 'Approved', color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)', Icon: CheckCircle },
  denied:   { label: 'Denied',   color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', Icon: XCircle },
};

const FILTERS = ['all', 'pending', 'approved', 'denied'];

const RequestCard = ({ request, onDecide, busyId }) => {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const { Icon: StatusIcon } = s;
  const isPending = request.status === 'pending';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Card header */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.22)' }}>
          <User size={16} style={{ color: '#7dd3fc' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-sm truncate">
              {request.requester?.name || 'Unknown User'}
            </p>
            {request.room && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                <Home size={9} /> {request.room}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{request.actionLabel}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
            <StatusIcon size={9} />
            {s.label}
          </span>
          {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Email</p>
                  <p className="text-xs text-zinc-300 truncate">{request.requester?.email || '—'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Requested</p>
                  <p className="text-xs text-zinc-300">{new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {request.reason && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Reason</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{request.reason}</p>
                </div>
              )}

              {/* Action buttons */}
              {isPending && (
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={!!busyId}
                    onClick={() => onDecide(request._id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-all disabled:opacity-50"
                    style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ade80' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.12)'}
                  >
                    {busyId === request._id + 'approved' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                    Approve
                  </button>
                  <button
                    disabled={!!busyId}
                    onClick={() => onDecide(request._id, 'denied')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-all disabled:opacity-50"
                    style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.20)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.10)'}
                  >
                    {busyId === request._id + 'denied' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={14} />}
                    Deny
                  </button>
                </div>
              )}

              {!isPending && (
                <p className="text-xs text-zinc-600 text-center pt-1">
                  This request has been {request.status}.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

const AdminRequests = () => {
  const { fetchAdminRequests, reviewPermissionRequest, adminPermissionRequests } = useContext(AuthContext);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchAdminRequests(); }, []);

  const safeRequests = Array.isArray(adminPermissionRequests) ? adminPermissionRequests : [];

  const filtered = useMemo(() =>
    filter === 'all' ? safeRequests : safeRequests.filter(r => r.status === filter),
    [safeRequests, filter]
  );

  const pending = safeRequests.filter(r => r.status === 'pending').length;

  const decide = async (requestId, decision) => {
    setBusyId(requestId + decision);
    await reviewPermissionRequest({ requestId, decision });
    setBusyId('');
  };

  return (
    <div className="space-y-6 pb-10 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 mb-1">Admin</p>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            Permission Requests
            {pending > 0 && (
              <span className="rounded-full px-3 py-0.5 text-sm font-black"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                {pending} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage resident access requests for rooms and features.</p>
        </div>

        {/* Stats chips */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, { label, color, bg, border }]) => {
            const count = safeRequests.filter(r => r.status === key).length;
            return (
              <div key={key} className="rounded-xl px-3 py-2 text-center min-w-[60px]"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <p className="text-lg font-black" style={{ color }}>{count}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${color}99` }}>{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
            style={filter === f
              ? { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }
            }>
            {f === 'all' ? `All (${safeRequests.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${safeRequests.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-20 text-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
                <Shield size={24} style={{ color: '#7dd3fc' }} />
              </div>
              <div>
                <p className="text-zinc-300 font-bold">No {filter === 'all' ? '' : filter} requests</p>
                <p className="text-zinc-600 text-sm mt-1">Resident permission requests will appear here.</p>
              </div>
            </motion.div>
          ) : (
            filtered.map(req => (
              <RequestCard key={req._id} request={req} onDecide={decide} busyId={busyId} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminRequests;
