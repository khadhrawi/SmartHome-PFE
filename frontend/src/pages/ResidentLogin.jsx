import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Lock, User, Loader2, AlertTriangle, Key } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { AuthContext } from '../context/AuthContext';
import { isEmailValid } from '../utils/validation';

const formatHouseCodeInput = (value = '') => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (!cleaned) return '';

  const firstLetter = cleaned[0].replace(/[^A-Z]/g, '');
  const digits = cleaned.slice(1).replace(/[^0-9]/g, '').slice(0, 4);
  return `${firstLetter}${digits}`;
};

const ResidentLogin = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [houseCode, setHouseCode] = useState('');
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const { loginResident, verifyTwoFactor } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid = isEmailValid(email);
  const canSubmit  = emailValid && password.length > 0 && houseCode.length === 5 && !isLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);

    const normalizedHouseCode = formatHouseCodeInput(houseCode);
    const res = await loginResident(email, password, normalizedHouseCode);

    setIsLoading(false);
    if (res.success) { navigate('/dashboard'); return; }

    if (res.requiresTwoFactor) {
      setTempToken(res.tempToken);
      setTwoFAStep(true);
      return;
    }

    if (res.error?.includes('verify your email')) {
      setError('Please verify your email before logging in. Check your inbox or resend below.');
    } else {
      setError('Invalid credentials. Please check your email, password, and house code.');
    }
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
          className="w-full max-w-md rounded-3xl border border-emerald-200/30 bg-emerald-500/10 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/auth/choose')}
            aria-label="Back to role selection"
            className="mx-auto mb-5 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border border-emerald-200/35 bg-emerald-100/10 text-emerald-100 shadow-[0_0_28px_rgba(74,222,128,0.24)]"
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)' }}
            whileTap={{ scale: 0.96 }}
          >
            <Users size={30} strokeWidth={2.2} />
          </motion.button>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-white">House Resident Login</h1>

          {/* ── Aura Glassmorphism Error Tooltip ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3.5 shadow-[0_0_24px_rgba(239,68,68,0.12)] backdrop-blur-sm"
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
              <p className="text-center text-sm text-zinc-200">Enter the 6-digit code from your authenticator app.</p>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
                <Key size={17} className="text-emerald-100/80" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-center text-xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={twoFACode.length !== 6 || isLoading}
                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-emerald-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setTwoFAStep(false); setTwoFACode(''); setError(''); }} className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200">
                ← Back to login
              </button>
            </form>
          ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div
              className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 transition-colors duration-200 ${
                email && !emailValid ? 'border-rose-500' : 'border-white/15'
              }`}
            >
              <User size={17} className="text-emerald-100/80" />
              <input
                id="resident-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </div>

            <AnimatePresence>
              {email && !emailValid && (
                <motion.p
                  className="ml-1 text-[11px] text-rose-300"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Please enter a valid luxury address.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Lock size={17} className="text-emerald-100/80" />
              <input
                id="resident-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* House Code */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Users size={17} className="text-emerald-100/80" />
              <input
                id="resident-login-house-code"
                type="text"
                value={houseCode}
                onChange={(e) => setHouseCode(formatHouseCodeInput(e.target.value))}
                className="w-full bg-transparent text-sm uppercase tracking-[0.12em] text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Enter House Code (A1234)"
                aria-label="House Code"
                maxLength={5}
                required
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-emerald-200 hover:text-emerald-100">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-emerald-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Resident'}
            </button>
          </form>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-4">
            <GoogleAuthButton role="resident" label="Sign in with Google" />
          </div>

          <div className="mt-6 text-center text-sm text-zinc-200">
            No resident account yet?{' '}
            <Link to="/auth/resident/register" className="font-semibold text-emerald-200 hover:text-emerald-100">
              Register as House Resident
            </Link>
          </div>

          <button type="button" onClick={() => navigate('/auth/choose')} className="mt-4 w-full text-sm font-semibold text-emerald-100">
            Back to role selection
          </button>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default ResidentLogin;
