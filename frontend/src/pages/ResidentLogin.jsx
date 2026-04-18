import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Lock, User, Loader2 } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';

const formatHouseCodeInput = (value = '') => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (!cleaned) return '';

  const firstLetter = cleaned[0].replace(/[^A-Z]/g, '');
  const digits = cleaned.slice(1).replace(/[^0-9]/g, '').slice(0, 4);
  return `${firstLetter}${digits}`;
};

const ResidentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [houseCode, setHouseCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { loginResident } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedHouseCode = formatHouseCodeInput(houseCode);
    const res = await loginResident(email, password, normalizedHouseCode);

    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard');
      return;
    }

    setError(res.error);
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

          {error ? <div className="mt-6 rounded-2xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <User size={17} className="text-emerald-100/80" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Email"
                required
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Lock size={17} className="text-emerald-100/80" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                required
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Users size={17} className="text-emerald-100/80" />
              <input
                type="text"
                value={houseCode}
                onChange={(event) => setHouseCode(formatHouseCodeInput(event.target.value))}
                className="w-full bg-transparent text-sm uppercase tracking-[0.12em] text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Enter House Code (A1234)"
                aria-label="House Code"
                maxLength={5}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Resident'}
            </button>
          </form>

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
