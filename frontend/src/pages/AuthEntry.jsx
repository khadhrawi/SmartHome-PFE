import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ShieldCheck, Users, ChevronRight } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';

const cardBase =
  'w-full rounded-3xl border p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl';

const AuthEntry = () => {
  const navigate = useNavigate();

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.button
          type="button"
          onClick={() => navigate('/about')}
          aria-label="Go to About Us page"
          className="fixed left-6 top-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/10"
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Home size={22} strokeWidth={2} />
        </motion.button>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-4xl rounded-3xl border border-white/15 bg-white/[0.06] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
        >
          <h1 className="text-center text-4xl font-black tracking-tight text-white">Choose Your Access Role</h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-200">
            Select the portal that matches your account so access rights and controls are explicit from the first step.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/auth/admin/login')}
              className={`${cardBase} border-sky-300/35 bg-sky-400/10`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-sky-200/35 bg-sky-200/15 p-3 text-sky-100">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Admin Portal</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Continue as Admin</h2>
                  </div>
                </div>
                <ChevronRight className="text-sky-100" />
              </div>
              <p className="mt-4 text-sm text-zinc-100">
                You are logging in as an Admin with full control over the smart home system.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/auth/resident/login')}
              className={`${cardBase} border-emerald-300/35 bg-emerald-400/10`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-200/35 bg-emerald-200/15 p-3 text-emerald-100">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Resident Portal</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Continue as House Resident</h2>
                  </div>
                </div>
                <ChevronRight className="text-emerald-100" />
              </div>
              <p className="mt-4 text-sm text-zinc-100">
                House Residents have limited access and must request permission for global controls.
              </p>
            </button>
          </div>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default AuthEntry;
