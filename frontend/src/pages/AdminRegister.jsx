import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Mail, Lock, Loader2, Key, AlertTriangle, Info } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import { isEmailValid, isPasswordStrong } from '../utils/validation';

const AdminRegister = () => {
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [adminAccessCode, setAdminAccessCode] = useState('');
  const [error, setError]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [success, setSuccess]               = useState(false);

  const { registerAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid = isEmailValid(email);
  const passwordOk = isPasswordStrong(password);
  const canSubmit  = name.trim().length > 0 && emailValid && passwordOk && adminAccessCode.trim().length > 0 && !isLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!name || !email || !password || !adminAccessCode) {
      return setError('All fields are required.');
    }
    if (!emailValid) return setError('Please enter a valid email address.');
    if (!passwordOk) return setError('Password must be at least 8 characters with a number and a special character.');

    setIsLoading(true);
    const res = await registerAdmin(name, email, password, adminAccessCode);
    setIsLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => navigate('/onboarding'), 1800);
      return;
    }

    setError(res.error);
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-amber-400/20 bg-amber-500/8 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/15 shadow-[0_0_28px_rgba(251,191,36,0.2)]">
            <Home size={30} className="text-amber-300" strokeWidth={2.2} />
          </div>

          <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">House Owner Registration</h1>
          <p className="mt-2 text-center text-sm text-zinc-300">
            Enter the unique access code you received by email after your request was approved.
          </p>

          {/* Info box */}
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-xs text-amber-200">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Don't have a code yet?{' '}
              <Link to="/request-owner-account" className="font-bold underline underline-offset-2 hover:text-amber-100">
                Request House Owner access
              </Link>{' '}
              first. An admin will review and email you a unique code.
            </span>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3.5"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-sm text-rose-100">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Account created! Redirecting…
              </motion.div>
            )}
          </AnimatePresence>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <User size={17} className="text-amber-200/80" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-400"
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </div>

            <div className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 ${email && !emailValid ? 'border-rose-500' : 'border-white/15'}`}>
              <Mail size={17} className="text-amber-200/80" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-400"
                placeholder="Email address (same as your request)"
                autoComplete="email"
                required
              />
            </div>

            <div className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 ${password && !passwordOk ? 'border-amber-400/40' : 'border-white/15'}`}>
              <Lock size={17} className="text-amber-200/80" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-400"
                placeholder="Password"
                autoComplete="new-password"
                required
              />
            </div>
            <PasswordStrengthBar password={password} />

            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-black/20 px-4 py-3">
              <Key size={17} className="text-amber-300" />
              <input
                type="text"
                value={adminAccessCode}
                onChange={(e) => setAdminAccessCode(e.target.value.toUpperCase())}
                className="w-full bg-transparent font-mono text-sm tracking-widest text-amber-200 outline-none placeholder:text-zinc-500 placeholder:tracking-normal"
                placeholder="Access code (e.g. HO-A1B2C3D4)"
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3.5 text-sm font-black text-zinc-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Home size={18} />}
              {isLoading ? 'Creating account…' : 'Create House Owner Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-300">
            Already have an account?{' '}
            <Link to="/auth/admin/login" className="font-semibold text-amber-300 hover:text-amber-200">
              Sign In as House Owner
            </Link>
          </div>

          <button
            type="button"
            onClick={() => navigate('/auth/choose')}
            className="mt-3 w-full text-sm font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Back to role selection
          </button>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default AdminRegister;
