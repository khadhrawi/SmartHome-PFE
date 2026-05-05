import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, ChevronDown, ChevronUp, Send, Loader2,
  CheckCircle2, Clock, AlertCircle, Eye, RefreshCw, Filter
} from 'lucide-react';
import api from '../api/axios';

const STATUS_META = {
  unread:      { label: 'Unread',      color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)' },
  read:        { label: 'Read',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)' },
  in_progress: { label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)' },
  resolved:    { label: 'Resolved',    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)' },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.read;
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
      style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>
      {m.label}
    </span>
  );
};

const MessageCard = ({ msg, onReply, onStatusChange }) => {
  const [expanded, setExpanded]   = useState(false);
  const [reply, setReply]         = useState(msg.adminReply || '');
  const [status, setStatus]       = useState(msg.status);
  const [sending, setSending]     = useState(false);
  const [localMsg, setLocalMsg]   = useState(msg);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.patch(`/messages/${msg._id}/reply`, { reply, status });
      setLocalMsg(data);
      onReply(data);
    } catch (err) {
      console.error(err);
    } finally { setSending(false); }
  };

  const handleStatusOnly = async (newStatus) => {
    setStatus(newStatus);
    try {
      const { data } = await api.patch(`/messages/${msg._id}/status`, { status: newStatus });
      setLocalMsg(data);
      onStatusChange(data);
    } catch (err) { console.error(err); }
  };

  const m = STATUS_META[localMsg.status] || STATUS_META.read;

  return (
    <motion.div layout className="rounded-2xl border overflow-hidden"
      style={{ borderColor: expanded ? m.border : 'rgba(255,255,255,0.08)', background: expanded ? m.bg : 'rgba(255,255,255,0.03)' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    >
      {/* Header row */}
      <button className="w-full text-left px-5 py-4 flex items-center gap-4"
        onClick={() => {
          setExpanded(p => !p);
          if (localMsg.status === 'unread') handleStatusOnly('read');
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-white truncate">{localMsg.subject}</p>
            <StatusBadge status={localMsg.status} />
            {localMsg.adminReply && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20">Replied</span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            From <span className="font-semibold text-zinc-200">{localMsg.senderName}</span>
            {' '}·{' '}{localMsg.senderEmail}
            {localMsg.houseCode && <span className="ml-2 font-mono text-amber-300">#{localMsg.houseCode}</span>}
            {' '}·{' '}{new Date(localMsg.createdAt).toLocaleString()}
          </p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-zinc-400 shrink-0"/> : <ChevronDown size={16} className="text-zinc-400 shrink-0"/>}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div className="px-5 pb-5 space-y-4 border-t border-white/6"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          >
            {/* Original message */}
            <div className="mt-4 rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Message</p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{localMsg.body}</p>
            </div>

            {/* Previous reply if any */}
            {localMsg.adminReply && (
              <div className="rounded-2xl bg-emerald-400/6 border border-emerald-400/20 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Your Reply · {new Date(localMsg.repliedAt).toLocaleString()}</p>
                <p className="text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">{localMsg.adminReply}</p>
              </div>
            )}

            {/* Status selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-zinc-400 mr-1">Status:</p>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button key={key} onClick={() => handleStatusOnly(key)}
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
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{localMsg.adminReply ? 'Update Reply' : 'Write Reply'}</p>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={4}
                placeholder="Type your reply to the resident..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400/40"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">{reply.length} characters</p>
                <button onClick={handleReply} disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-900 hover:bg-amber-300 disabled:opacity-50 transition">
                  {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
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

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const { data } = await api.get(`/messages${params}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load messages.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleUpdate = (updated) => {
    setMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const filters = [
    { key: 'all',         label: 'All' },
    { key: 'unread',      label: 'Unread' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved',    label: 'Resolved' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">House Owner</p>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            Support Inbox
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-black text-white">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and reply to resident support requests.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = messages.filter(m => m.status === key).length;
          return (
            <div key={key} className="rounded-2xl border border-white/8 bg-white/4 p-4 cursor-pointer hover:bg-white/6 transition"
              onClick={() => setFilter(key)} style={{ borderColor: filter === key ? meta.border : undefined }}>
              <p className="text-xs font-semibold mb-1" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-2xl font-black text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${filter === f.key ? 'bg-amber-400 text-zinc-900' : 'border border-white/10 bg-white/4 text-zinc-400 hover:text-white'}`}>
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-zinc-500"/></div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <MessageSquare size={40} className="text-zinc-600"/>
          <p className="text-zinc-400 font-semibold">No messages yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <MessageCard key={msg._id} msg={msg} onReply={handleUpdate} onStatusChange={handleUpdate}/>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
