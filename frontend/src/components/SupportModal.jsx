import { useState, useContext } from 'react';
import { X, Send, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const GOLD = '#E3C598';
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.50)',
  dimmed: 'rgba(248,249,250,0.28)',
  gold:   GOLD,
  goldDim:'rgba(227,197,152,0.55)',
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

/**
 * SupportModal — Glassmorphic Support Concierge modal.
 * Sends a message to POST /api/messages, saved in MongoDB.
 */
const SupportModal = ({ onClose }) => {
  const { user } = useContext(AuthContext);

  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [subOpen, setSubOpen]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const canSend = subject.trim() && body.trim().length >= 10;

  const handleSend = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post('/messages', { subject: subject.trim(), body: body.trim() });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,20,0.90)', backdropFilter: 'blur(32px)' }}
      onClick={e => e.target === e.currentTarget && !sending && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(14,18,36,0.99) 0%, rgba(8,12,26,0.99) 100%)',
          border: `1px solid rgba(227,197,152,0.22)`,
          boxShadow: '0 40px 100px rgba(0,0,0,0.80), 0 0 0 1px rgba(227,197,152,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Ambient gold glow — top right */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(227,197,152,0.12) 0%, transparent 70%)',
            transform: 'translate(35%,-35%)',
          }}
        />

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-7 pt-6 pb-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(227,197,152,0.12)',
                border: '1px solid rgba(227,197,152,0.28)',
                boxShadow: '0 0 20px rgba(227,197,152,0.15)',
              }}
            >
              <Mail size={20} style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: C.text }}>
                Support Concierge
              </h2>
              <p className="text-[11px] font-semibold" style={{ color: C.muted }}>
                Hi {user?.name || 'there'} — how can we help?
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={sending}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: C.muted,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Form ── */}
        <div className="px-7 pt-5 pb-2 space-y-5">

          {/* Sender Info pill */}
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#E3C598,#D4AF37)', color: '#1a1008' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: C.text }}>{user?.name}</p>
              <p className="text-[11px] truncate" style={{ color: C.muted }}>{user?.email}</p>
            </div>
            {user?.houseCode && (
              <span
                className="ml-auto text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(227,197,152,0.12)', color: GOLD }}
              >
                {user.houseCode}
              </span>
            )}
          </div>

          {/* Subject dropdown */}
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
              style={{ color: C.dimmed }}
            >
              Subject
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                style={{
                  background: subject ? 'rgba(227,197,152,0.08)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${subject ? 'rgba(227,197,152,0.35)' : 'rgba(255,255,255,0.10)'}`,
                  color: subject ? GOLD : C.muted,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                <span className="flex-1">{subject || 'Select a topic…'}</span>
                <svg
                  width={14} height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{
                    color: C.dimmed,
                    transform: subOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {subOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 rounded-2xl overflow-hidden py-1 w-full"
                  style={{
                    background: 'rgba(8,12,26,0.98)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(30px)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
                  }}
                >
                  {SUBJECTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSubject(s); setSubOpen(false); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm font-bold text-left transition-all hover:bg-white/[0.05]"
                      style={{ color: s === subject ? GOLD : C.muted }}
                    >
                      {s}
                      {s === subject && (
                        <CheckCircle2 size={12} className="ml-auto flex-shrink-0" style={{ color: GOLD }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
              style={{ color: C.dimmed }}
            >
              Message
            </p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe your issue or request in detail…"
              rows={5}
              className="w-full resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${body.length >= 10 ? 'rgba(227,197,152,0.40)' : 'rgba(255,255,255,0.10)'}`,
                color: C.text,
                borderRadius: '1rem',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'border-color 0.2s',
                lineHeight: 1.6,
              }}
            />
            <p
              className="mt-1 text-right text-[10px]"
              style={{ color: body.length > 0 && body.length < 10 ? '#f87171' : C.dimmed }}
            >
              {body.length} chars {body.length > 0 && body.length < 10 ? '(min 10)' : ''}
            </p>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-xs font-bold px-3 py-2 rounded-xl"
              style={{
                color: '#f87171',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.22)',
              }}
            >
              ⚠ {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                color: '#4ade80',
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.22)',
              }}
            >
              <CheckCircle2 size={15} />
              <span className="text-xs font-bold">Message sent! We'll get back to you soon.</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-7 py-5 gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12 }}
        >
          <button
            onClick={onClose}
            disabled={sending}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-75 disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: C.muted,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSend}
            disabled={!canSend || sending || success}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: success
                ? 'linear-gradient(135deg,#4ade80,#22c55e)'
                : canSend
                  ? 'linear-gradient(135deg,#E3C598,#c9a96e)'
                  : 'rgba(255,255,255,0.08)',
              color: canSend ? '#1a1008' : C.dimmed,
              boxShadow: canSend && !success ? '0 8px 24px rgba(227,197,152,0.35)' : 'none',
              minWidth: 150,
              justifyContent: 'center',
            }}
          >
            {success ? (
              <><CheckCircle2 size={15} /> Sent!</>
            ) : sending ? (
              <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
            ) : (
              <><Send size={15} /> Send Message</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
