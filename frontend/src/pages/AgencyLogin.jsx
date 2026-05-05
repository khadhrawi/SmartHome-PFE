import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Lock, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';
import { isEmailValid } from '../utils/validation';

const AgencyLogin = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const { loginAgency, verifyTwoFactor } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid = isEmailValid(email);
  const canSubmit  = emailValid && password.length > 0 && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);

    const res = await loginAgency(email, password);
    setIsLoading(false);

    if (res.success) {
      navigate('/dashboard');
      return;
    }
    if (res.requiresTwoFactor) {
      setTempToken(res.tempToken);
      setTwoFAStep(true);
      return;
    }
    setError('Invalid credentials. Please verify your email, password, and agency access code.');
  };

  const handleTwoFA = async (e) => {
    e.preventDefault();
    if (twoFACode.length !== 6 || isLoading) return;
    setError('');
    setIsLoading(true);
    const res = await verifyTwoFactor(twoFACode, tempToken);
    setIsLoading(false);
    if (res.success) { navigate('/dashboard'); return; }
    setError(res.error || 'Invalid code. Try again.');
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border p-8 shadow-[0_35px_120px_rgba(0,0,0,0.60)] backdrop-blur-xl"
          style={{
            background: 'rgba(16,8,40,0.72)',
            borderColor: 'rgba(167,139,250,0.28)',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Icon */}
          <motion.button
            type="button"
            onClick={() => navigate('/auth/choose')}
            aria-label="Back to role selection"
            className="mx-auto mb-5 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.22), rgba(109,40,217,0.18))',
              border: '1px solid rgba(167,139,250,0.35)',
              boxShadow: '0 0 28px rgba(139,92,246,0.30)',
            }}
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)' }}
            whileTap={{ scale: 0.96 }}
          >
            <Building2 size={30} strokeWidth={2.2} style={{ color: '#c4b5fd' }} />
          </motion.button>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-white">
            Agency Portal
          </h1>
          <p className="mt-2 text-center text-sm" style={{ color: 'rgba(196,181,253,0.75)' }}>
            Top-level management access — Aura Residence Network
          </p>

          {/* Badge */}
          <div className="mt-3 flex justify-center">
            <span
              className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest"
              style={{
                background: 'rgba(139,92,246,0.18)',
                border: '1px solid rgba(139,92,246,0.45)',
                color: '#c4b5fd',
              }}
            >
              Agency Tier
            </span>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  boxShadow: '0 0 24px rgba(239,68,68,0.12)',
                }}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-sm leading-snug text-rose-100">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {twoFAStep ? (
            <form className="mt-6 space-y-4" onSubmit={handleTwoFA}>
              <p className="text-center text-sm" style={{ color: 'rgba(196,181,253,0.75)' }}>Enter the 6-digit code from your authenticator app.</p>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(167,139,250,0.22)' }}>
                <KeyRound size={17} style={{ color: 'rgba(196,181,253,0.80)' }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-center text-xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-zinc-300/55"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={twoFACode.length !== 6 || isLoading}
                className="mt-2 flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setTwoFAStep(false); setTwoFACode(''); setError(''); }} className="w-full text-center text-xs" style={{ color: 'rgba(196,181,253,0.55)' }}>
                ← Back to login
              </button>
            </form>
          ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-200"
              style={{
                background: 'rgba(0,0,0,0.28)',
                border: `1px solid ${email && !emailValid ? 'rgba(239,68,68,0.6)' : 'rgba(167,139,250,0.22)'}`,
              }}
            >
              <User size={17} style={{ color: 'rgba(196,181,253,0.80)' }} />
              <input
                id="agency-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/55"
                placeholder="Agency email"
                autoComplete="email"
                required
              />
            </div>
            <AnimatePresence>
              {email && !emailValid && (
                <motion.p
                  className="ml-1 text-[11px] text-rose-300"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  Please enter a valid email address.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Password */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(167,139,250,0.22)' }}
            >
              <Lock size={17} style={{ color: 'rgba(196,181,253,0.80)' }} />
              <input
                id="agency-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/55"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="agency-login-submit"
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                boxShadow: canSubmit ? '0 0 22px rgba(139,92,246,0.45)' : 'none',
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Agency'}
            </button>
          </form>

          )}

          <div className="mt-6 text-center text-sm" style={{ color: 'rgba(196,181,253,0.65)' }}>
            No agency account yet?{' '}
            <Link
              to="/auth/agency/register"
              className="font-semibold hover:underline"
              style={{ color: '#c4b5fd' }}
            >
              Create Agency Account
            </Link>
          </div>

          <button
            type="button"
            onClick={() => navigate('/auth/choose')}
            className="mt-4 w-full text-sm font-semibold"
            style={{ color: 'rgba(196,181,253,0.70)' }}
          >
            ← Back to role selection
          </button>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default AgencyLogin;
