import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Lock, Loader2, Key, AlertTriangle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';
import { isEmailValid } from '../utils/validation';

const AdminLogin = () => {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [adminAccessCode, setAdminAccessCode] = useState('');
  const [error, setError]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);

  const { loginAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid = isEmailValid(email);
  const canSubmit  = emailValid && password.length > 0 && adminAccessCode.trim().length > 0 && !isLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);

    const res = await loginAdmin(email, password, adminAccessCode);
    setIsLoading(false);

    if (res.success) {
      navigate('/dashboard');
      return;
    }

    // Keep error messages vague — never expose which field failed
    setError('Invalid credentials. Please verify your email, password, and access code.');
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-sky-200/30 bg-sky-500/10 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/auth/choose')}
            aria-label="Back to role selection"
            className="mx-auto mb-5 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border border-sky-200/35 bg-sky-100/10 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.24)]"
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)' }}
            whileTap={{ scale: 0.96 }}
          >
            <ShieldCheck size={30} strokeWidth={2.2} />
          </motion.button>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-white">Admin Login</h1>
          <p className="mt-2 text-center text-sm text-zinc-100">
            You are logging in as an Admin with full control over the smart home system.
          </p>

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

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div
              className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 transition-colors duration-200 ${
                email && !emailValid ? 'border-rose-500' : 'border-white/15'
              }`}
            >
              <User size={17} className="text-sky-100/80" />
              <input
                id="admin-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Admin email"
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
              <Lock size={17} className="text-sky-100/80" />
              <input
                id="admin-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Admin Access Code */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Key size={17} className="text-sky-100/80" />
              <input
                id="admin-login-access-code"
                type="password"
                value={adminAccessCode}
                onChange={(e) => setAdminAccessCode(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Admin Access Code"
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-sky-300 py-3.5 text-sm font-bold text-sky-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Admin'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-200">
            No admin account yet?{' '}
            <Link to="/auth/admin/register" className="font-semibold text-sky-200 hover:text-sky-100">
              Create Admin Account
            </Link>
          </div>

          <button
            type="button"
            onClick={() => navigate('/auth/choose')}
            className="mt-4 w-full text-sm font-semibold text-sky-100"
          >
            Back to role selection
          </button>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default AdminLogin;
