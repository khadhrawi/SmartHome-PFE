import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Lock, Mail, User, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PublicMotionShell from '../components/PublicMotionShell';

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

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await register(name, email, password);

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
            Create your account and orchestrate your entire home with ease.
          </motion.p>

          {error ? (
            <motion.div
              className="mt-6 rounded-2xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
              variants={item}
            >
              {error}
            </motion.div>
          ) : null}

          <motion.form className="mt-6 space-y-4" onSubmit={handleSubmit} variants={sequence}>
            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3"
              variants={item}
              whileHover={fieldMotion.whileHover}
              whileTap={fieldMotion.whileTap}
            >
              <User size={17} className="text-amber-100/70" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Full Name"
                required
              />
            </motion.div>

            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3"
              variants={item}
              whileHover={fieldMotion.whileHover}
              whileTap={fieldMotion.whileTap}
            >
              <Mail size={17} className="text-amber-100/70" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Email"
                required
              />
            </motion.div>

            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3"
              variants={item}
              whileHover={fieldMotion.whileHover}
              whileTap={fieldMotion.whileTap}
            >
              <Lock size={17} className="text-amber-100/70" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                required
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-amber-300 py-3.5 text-sm font-bold text-zinc-900 shadow-[0_0_26px_rgba(251,191,36,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
              variants={item}
              whileHover={{ scale: 1.02, filter: 'brightness(1.06)' }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
            </motion.button>
          </motion.form>

          <motion.div className="mt-6 text-center text-sm text-zinc-300" variants={item}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-amber-200 hover:text-amber-100">
              Sign In
            </Link>
          </motion.div>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default Register;
