import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Send, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ResidentRestricted = ({ title, description, actionKey, actionLabel, room = '' }) => {
  const { hasApprovedPermission, requestPermission } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const approved = hasApprovedPermission(actionKey, room);

  const onRequest = async () => {
    setBusy(true);
    setError('');
    const res = await requestPermission({ actionKey, actionLabel, room });
    setBusy(false);
    if (res.success) setSent(true);
    else setError(res.error || 'Failed to send request.');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: approved
              ? 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))'
              : 'linear-gradient(135deg, rgba(248,113,113,0.12), rgba(239,68,68,0.05))',
            border: approved
              ? '1px solid rgba(74,222,128,0.30)'
              : '1px solid rgba(248,113,113,0.25)',
            boxShadow: approved
              ? '0 0 40px rgba(74,222,128,0.12)'
              : '0 0 40px rgba(239,68,68,0.08)',
          }}>
          {approved
            ? <ShieldCheck size={34} style={{ color: '#4ade80' }} />
            : <Lock size={34} style={{ color: '#f87171' }} />
          }
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white mb-2">{title}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-xs mx-auto">{description}</p>

        {approved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.22)' }}
          >
            <CheckCircle size={20} className="mx-auto mb-2" style={{ color: '#4ade80' }} />
            <p className="text-sm font-bold text-emerald-300">Access Approved</p>
            <p className="text-xs text-zinc-500 mt-1">Your admin has granted you access. Refresh to see controls.</p>
          </motion.div>
        ) : sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.22)' }}
          >
            <CheckCircle size={20} className="mx-auto mb-2" style={{ color: '#38bdf8' }} />
            <p className="text-sm font-bold text-sky-300">Request Sent</p>
            <p className="text-xs text-zinc-500 mt-1">Your admin will review it shortly and notify you.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={onRequest}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(14,165,233,0.35)',
              }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              {busy ? 'Sending…' : 'Request Access'}
            </button>

            {error && (
              <p className="text-xs text-red-400 font-semibold">{error}</p>
            )}

            <p className="text-xs text-zinc-600">
              Your admin will be notified and can approve or deny your request.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResidentRestricted;
