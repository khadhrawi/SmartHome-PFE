import { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import { AuthContext } from '../context/AuthContext';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [status, setStatus]       = useState(null); // 'success' | 'error'
  const [message, setMessage]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = token && password.length >= 8 && password === confirm && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setStatus(null);

    const res = await resetPassword(token, password);
    setIsLoading(false);

    if (res.success) {
      setStatus('success');
      setMessage(res.message);
    } else {
      setStatus('error');
      setMessage(res.error);
    }
  };

  if (!token) {
    return (
      <PublicMotionShell showNavbar={false}>
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-rose-300 text-sm">Invalid reset link. Please request a new one.</p>
        </main>
      </PublicMotionShell>
    );
  }

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-sky-200/30 bg-sky-500/10 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200/35 bg-sky-100/10 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.24)]">
            <Lock size={30} strokeWidth={2.2} />
          </div>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-white">Reset Password</h1>
          <p className="mt-2 text-center text-sm text-zinc-300">Choose a strong new password.</p>

          <AnimatePresence>
            {status === 'error' && (
              <motion.div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3.5 backdrop-blur-sm"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-sm text-rose-100">{message}</span>
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3.5 backdrop-blur-sm"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                <span className="text-sm text-emerald-100">{message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {status !== 'success' ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
                <Lock size={17} className="text-sky-100/80" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {password.length > 0 && <PasswordStrengthBar password={password} />}

              <div className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 ${mismatch ? 'border-rose-500' : 'border-white/15'}`}>
                <Lock size={17} className="text-sky-100/80" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <AnimatePresence>
                {mismatch && (
                  <motion.p className="ml-1 text-[11px] text-rose-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Passwords do not match.
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-sky-300 py-3.5 text-sm font-bold text-sky-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Set New Password'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/auth/choose')}
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-sky-300 py-3.5 text-sm font-bold text-sky-950"
            >
              Go to Login
            </button>
          )}
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default ResetPassword;
