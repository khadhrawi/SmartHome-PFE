import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Wifi, WifiOff, Home, Clock, RefreshCw,
  Shield, Radio, MessageSquare, ChevronDown, ChevronUp, Loader2, Send
} from 'lucide-react';
import api from '../api/axios';

/* ── helpers ── */
const STATUS_META = {
  unread:      { label: 'Unread',      color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)' },
  read:        { label: 'Read',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)' },
  in_progress: { label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)' },
  resolved:    { label: 'Resolved',    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)' },
};

const StatusDot = ({ online }) => (
  <span className="relative flex h-2.5 w-2.5">
    {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#4ade80' }} />}
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: online ? '#4ade80' : '#ef4444' }} />
  </span>
);

/* ── House card ── */
const HouseCard = ({ h, index }) => {
  const online  = h.online;
  const lastSeen = h.lastActivity
    ? new Date(h.lastActivity).toLocaleString()
    : h.createdAt ? new Date(h.createdAt).toLocaleString() : '—';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300"
      style={{
        background: online ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.03)',
        borderColor: online ? 'rgba(74,222,128,0.22)' : 'rgba(255,255,255,0.08)',
        boxShadow: online ? '0 0 30px rgba(74,222,128,0.06)' : 'none',
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: online ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${online ? 'rgba(74,222,128,0.28)' : 'rgba(255,255,255,0.10)'}` }}>
            <Home size={18} style={{ color: online ? '#4ade80' : '#71717a' }} />
          </div>
          <div>
            <p className="font-black text-white text-base">House {h.houseNumber}</p>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">{h.houseCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: online ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.10)', border: `1px solid ${online ? 'rgba(74,222,128,0.28)' : 'rgba(239,68,68,0.28)'}` }}>
          <StatusDot online={online} />
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: online ? '#4ade80' : '#f87171' }}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Clock size={12} className="text-zinc-500 flex-shrink-0" />
        <span className="text-xs text-zinc-400">Last activity: <span className="text-zinc-200 font-semibold">{lastSeen}</span></span>
      </div>
    </motion.div>
  );
};

/* ── Request card (interactive) ── */
const RequestCard = ({ msg, index, conciergeCode, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [localMsg, setLocalMsg] = useState(msg);
  const [reply, setReply]       = useState(msg.adminReply || '');
  const [status, setStatus]     = useState(msg.status);
  const [sending, setSending]   = useState(false);

  const m = STATUS_META[localMsg.status] || STATUS_META.unread;

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.patch(
        `/concierge/messages/${localMsg._id}/reply?code=${encodeURIComponent(conciergeCode)}`,
        { reply, status }
      );
      setLocalMsg(data);
      onUpdate(data);
    } catch {}
    finally { setSending(false); }
  };

  const handleStatus = async (newStatus) => {
    setStatus(newStatus);
    try {
      const { data } = await api.patch(
        `/concierge/messages/${localMsg._id}/status?code=${encodeURIComponent(conciergeCode)}`,
        { status: newStatus }
      );
      setLocalMsg(data);
      onUpdate(data);
    } catch {}
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: expanded ? m.border : 'rgba(255,255,255,0.08)', background: expanded ? m.bg : 'rgba(255,255,255,0.03)' }}>

      <button className="w-full text-left px-5 py-4 flex items-center gap-4"
        onClick={() => { setExpanded(p => !p); if (localMsg.status === 'unread') handleStatus('read'); }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-white truncate">{localMsg.subject}</p>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>{m.label}</span>
            {localMsg.adminReply && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20">Replied</span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            From <span className="font-semibold text-zinc-200">{localMsg.senderName}</span>
            {' · '}{localMsg.senderEmail}
            {localMsg.houseCode && <span className="ml-2 font-mono text-amber-300">#{localMsg.houseCode}</span>}
            {' · '}{new Date(localMsg.createdAt).toLocaleString()}
          </p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-zinc-400 shrink-0" /> : <ChevronDown size={16} className="text-zinc-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div className="px-5 pb-5 space-y-4 border-t border-white/6"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>

            {/* Original message */}
            <div className="mt-4 rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Message</p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{localMsg.body}</p>
            </div>

            {/* Previous reply */}
            {localMsg.adminReply && (
              <div className="rounded-2xl bg-emerald-400/6 border border-emerald-400/25 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">
                  Reply from {localMsg.repliedByName || 'Concierge'} · {new Date(localMsg.repliedAt).toLocaleString()}
                </p>
                <p className="text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">{localMsg.adminReply}</p>
              </div>
            )}

            {/* Status selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-zinc-400 mr-1">Status:</p>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button key={key} onClick={() => handleStatus(key)}
                  className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition"
                  style={{
                    background: status === key ? meta.bg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${status === key ? meta.border : 'rgba(255,255,255,0.08)'}`,
                    color: status === key ? meta.color : '#94a3b8',
                  }}>
                  {meta.label}
                </button>
              ))}
            </div>

            {/* Reply box */}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {localMsg.adminReply ? 'Update Reply' : 'Write Reply'}
              </p>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
                placeholder="Type your reply to the resident…"
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400/40" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">{reply.length} characters</p>
                <button onClick={handleReply} disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-900 hover:bg-amber-300 disabled:opacity-50 transition">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Sending…' : localMsg.adminReply ? 'Update Reply' : 'Send Reply'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Main ── */
const ConciergeHub = () => {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('houses');
  const [houses, setHouses]     = useState([]);
  const [messages, setMessages] = useState([]);
  const [msgFilter, setMsgFilter] = useState('all');
  const [msgLoading, setMsgLoading] = useState(false);
  const [connected, setConnected]   = useState(false);
  const [lastPing, setLastPing]     = useState(null);
  const sseRef = useRef(null);

  const code = typeof window !== 'undefined' ? window.sessionStorage.getItem('conciergeCode') : null;

  const fetchHouses = async () => {
    try {
      const res = await api.get(`/concierge/houses?code=${encodeURIComponent(code)}`);
      setHouses(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const fetchMessages = async () => {
    setMsgLoading(true);
    try {
      const params = msgFilter !== 'all' ? `&status=${msgFilter}` : '';
      const res = await api.get(`/concierge/messages?code=${encodeURIComponent(code)}${params}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch {}
    finally { setMsgLoading(false); }
  };

  useEffect(() => {
    if (!code) { navigate('/about'); return; }
    fetchHouses();
    const es = new EventSource(`/api/concierge/stream?code=${encodeURIComponent(code)}`);
    sseRef.current = es;
    es.onopen  = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener('admin-connected',    (e) => { try { const p = JSON.parse(e.data); setLastPing(new Date()); setHouses(prev => prev.map(h => h.houseCode === p.houseCode ? { ...h, online: true  } : h)); } catch {} });
    es.addEventListener('admin-disconnected', (e) => { try { const p = JSON.parse(e.data); setLastPing(new Date()); setHouses(prev => prev.map(h => h.houseCode === p.houseCode ? { ...h, online: false } : h)); } catch {} });
    es.addEventListener('unit-updated',       (e) => { try { const u = JSON.parse(e.data); setLastPing(new Date()); setHouses(prev => prev.map(h => h.houseCode === u.houseCode ? { ...h, lastActivity: Date.now() } : h)); } catch {} });
    return () => { try { es.close(); } catch {} };
  }, [code, navigate]);

  useEffect(() => {
    if (tab === 'requests') fetchMessages();
  }, [tab, msgFilter]);

  const onlineCount  = houses.filter(h => h.online).length;
  const offlineCount = houses.length - onlineCount;
  const unreadCount  = messages.filter(m => m.status === 'unread').length;

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(155deg, #07080E 0%, #101624 48%, #090A13 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(80% 60% at 20% 10%, rgba(227,197,152,0.07), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(74,222,128,0.05), transparent 60%)' }} />

      <div className="relative z-10 mx-auto w-[min(94%,1100px)] px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#E3C598,#D4AF37)', boxShadow: '0 0 28px rgba(227,197,152,0.35)' }}>
              <Shield size={22} style={{ color: '#1a1008' }} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: '#E3C598' }}>Concierge Hub</p>
              <h1 className="text-3xl font-black text-white leading-none">Live Monitoring</h1>
              <p className="text-sm text-zinc-400 mt-1">Real-time status of all managed houses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: connected ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${connected ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              <Radio size={13} style={{ color: connected ? '#4ade80' : '#f87171' }} />
              <span className="text-[11px] font-bold" style={{ color: connected ? '#4ade80' : '#f87171' }}>
                {connected ? 'Stream Live' : 'Reconnecting…'}
              </span>
            </div>
            <button onClick={() => { fetchHouses(); if (tab === 'requests') fetchMessages(); }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => navigate('/about')}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Houses', value: houses.length,  color: '#E3C598', bg: 'rgba(227,197,152,0.08)', border: 'rgba(227,197,152,0.20)', icon: Home },
            { label: 'Online Now',   value: onlineCount,    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)',  icon: Wifi },
            { label: 'Offline',      value: offlineCount,   color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)',   icon: WifiOff },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
              </div>
              <p className="text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {lastPing && (
          <div className="flex items-center gap-2 mb-5 text-xs text-zinc-500">
            <Activity size={12} />
            <span>Last event: {lastPing.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'houses',   label: 'Houses',   icon: Home },
            { key: 'requests', label: 'Requests', icon: MessageSquare, badge: unreadCount },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
              style={tab === key
                ? { background: 'linear-gradient(135deg,#E3C598,#D4AF37)', color: '#1a1008' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#94a3b8' }}>
              <Icon size={14} />
              {label}
              {badge > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Houses tab */}
        {tab === 'houses' && (
          houses.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Home size={28} className="text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold">No houses registered yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {houses.map((h, i) => <HouseCard key={h.houseCode} h={h} index={i} />)}
              </AnimatePresence>
            </div>
          )
        )}

        {/* Requests tab */}
        {tab === 'requests' && (
          <div className="space-y-4">
            {/* Status stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const count = messages.filter(m => m.status === key).length;
                return (
                  <div key={key} className="rounded-2xl border p-4 cursor-pointer hover:bg-white/6 transition"
                    onClick={() => setMsgFilter(key === msgFilter ? 'all' : key)}
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: msgFilter === key ? meta.border : 'rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="text-2xl font-black text-white">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setMsgFilter(f.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${msgFilter === f.key ? 'bg-amber-400 text-zinc-900' : 'border border-white/10 bg-white/4 text-zinc-400 hover:text-white'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* List */}
            {msgLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-zinc-500" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <MessageSquare size={40} className="text-zinc-600" />
                <p className="text-zinc-400 font-semibold">No requests found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <RequestCard key={msg._id} msg={msg} index={i}
                    conciergeCode={code}
                    onUpdate={(updated) => setMessages(prev => prev.map(m => m._id === updated._id ? updated : m))}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConciergeHub;
