import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react';
import api from '../api/axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const STATUS_META = {
  unread:      { label: 'Sent',        color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.25)' },
  read:        { label: 'Seen',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)' },
  in_progress: { label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)' },
  resolved:    { label: 'Resolved',    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)' },
};

const SUBJECTS = [
  '🔧 Device / Hardware Issue',
  '🔒 Access & Permission Request',
  '📡 Connectivity Problem',
  '⚡ Energy / Billing Query',
  '🆕 Feature Request',
  '🔑 Account & Security',
  '💬 General Feedback',
  '🆘 Urgent Support',
];

const RequestCard = ({ msg }) => {
  const [expanded, setExpanded] = useState(false);
  const m = STATUS_META[msg.status] || STATUS_META.unread;
  const hasReply = !!msg.adminReply;

  return (
    <motion.div layout className="rounded-2xl border overflow-hidden"
      style={{ borderColor: hasReply ? 'rgba(74,222,128,0.30)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    >
      <button className="w-full text-left px-5 py-4 flex items-center gap-4" onClick={() => setExpanded(p => !p)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-white truncate">{msg.subject}</p>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>
              {m.label}
            </span>
            {hasReply && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 animate-pulse">
                New Reply
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">{new Date(msg.createdAt).toLocaleString()}</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-zinc-400 shrink-0"/> : <ChevronDown size={16} className="text-zinc-400 shrink-0"/>}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div className="px-5 pb-5 space-y-4 border-t border-white/6"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          >
            <div className="mt-4 rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Your Message</p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
            </div>

            {hasReply ? (
              <div className="rounded-2xl bg-emerald-400/6 border border-emerald-400/25 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">
                  Reply from {msg.repliedByName || 'Admin'} · {new Date(msg.repliedAt).toLocaleString()}
                </p>
                <p className="text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">{msg.adminReply}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/3 border border-white/8 p-4 text-center">
                <p className="text-xs text-zinc-500">No reply yet. Your admin will respond soon.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const NewRequestModal = ({ onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const handleSend = async () => {
    if (!subject || body.trim().length < 10) return setError('Please select a subject and write at least 10 characters.');
    setSending(true);
    try {
      const { data } = await api.post('/messages', { subject, body });
      onSent(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send.');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white">New Support Request</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Subject</p>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
              <option value="">Select a category…</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Message</p>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder="Describe your issue in detail…"
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400/40"/>
            <p className="text-xs text-zinc-500 mt-1 text-right">{body.length} chars</p>
          </div>

          {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancel</button>
            <button onClick={handleSend} disabled={sending}
              className="flex-1 rounded-2xl bg-amber-400 py-3 text-sm font-black text-zinc-900 hover:bg-amber-300 disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <Loader2 size={15} className="animate-spin"/> : null}
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const MyRequests = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);

  useEffect(() => {
    api.get('/messages/mine').then(({ data }) => setMessages(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, []);

  const handleSent = (msg) => setMessages(prev => [msg, ...prev]);

  const hasNewReplies = messages.some(m => m.adminReply && m.status !== 'resolved');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Resident</p>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            My Requests
            {hasNewReplies && <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-sm font-black text-white">New Reply</span>}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Track your support requests and admin replies.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm font-black text-zinc-900 hover:bg-amber-300 transition">
          <Plus size={16}/> New Request
        </button>
      </div>

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSent={handleSent}/>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-zinc-500"/></div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <MessageSquare size={44} className="text-zinc-600"/>
          <p className="text-zinc-400 font-semibold">No requests yet.</p>
          <button onClick={() => setShowNew(true)} className="rounded-2xl bg-amber-400/15 border border-amber-400/25 px-5 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-400/25">
            Send your first request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => <RequestCard key={msg._id} msg={msg}/>)}
        </div>
      )}
    </div>
  );
};

export default MyRequests;
