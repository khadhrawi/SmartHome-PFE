import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Lock, User, Loader2, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PublicMotionShell from '../components/PublicMotionShell';
import { isEmailValid } from '../utils/validation';

const sequence = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

const fieldMotion = {
  whileHover: { scale: 1.01, borderColor: 'rgba(251,191,36,0.5)' },
  whileTap: { scale: 0.996 },
};

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const emailValid  = isEmailValid(email);
  const canSubmit   = emailValid && password.length > 0 && !isLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);

    const res = await login(email, password);

    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard');
      return;
    }

    // Always use a vague, professional error — never reveal which field failed
    setError('Invalid credentials. Please check your email and password.');
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.07] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          variants={sequence}
          initial="hidden"
          animate="show"
        >
          <motion.button
            type="button"
            onClick={() => navigate('/about')}
            className="mx-auto mb-5 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-100/10 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.24)]"
            variants={item}
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Home size={30} strokeWidth={2.2} />
          </motion.button>

          <motion.h1 className="text-center text-4xl font-extrabold tracking-tight text-white" variants={item}>
            Smart Home
          </motion.h1>

          <motion.p className="mt-2 text-center text-sm text-zinc-200" variants={item}>
            Welcome back. Step into your intelligent home control center.
          </motion.p>

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

          <motion.form className="mt-6 space-y-4" onSubmit={handleSubmit} variants={sequence}>
            {/* Email */}
            <motion.div
              className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 transition-colors duration-200 ${
                email && !emailValid
                  ? 'border-rose-500'
                  : 'border-white/15'
              }`}
              variants={item}
              whileHover={fieldMotion.whileHover}
              whileTap={fieldMotion.whileTap}
            >
              <User size={17} className="text-amber-100/70" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </motion.div>

            {/* Inline email hint */}
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
            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3"
              variants={item}
              whileHover={fieldMotion.whileHover}
              whileTap={fieldMotion.whileTap}
            >
              <Lock size={17} className="text-amber-100/70" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-amber-300 py-3.5 text-sm font-bold text-zinc-900 shadow-[0_0_26px_rgba(251,191,36,0.34)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              variants={item}
              whileHover={canSubmit ? { scale: 1.02, filter: 'brightness(1.06)' } : {}}
              whileTap={canSubmit ? { scale: 0.97 } : {}}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </motion.button>
          </motion.form>

          <motion.div className="mt-6 text-center text-sm text-zinc-300" variants={item}>
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-amber-200 hover:text-amber-100">
              Sign Up
            </Link>
          </motion.div>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default Login;
