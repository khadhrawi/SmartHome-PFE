import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';

const Home = () => {
  const navigate = useNavigate();

  const handleContinue = useCallback(
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-public-navbar]')) {
        return;
      }

      navigate('/about');
    },
    [navigate],
  );

  const sequence = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.18 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <PublicMotionShell
      showNavbar
      onBackgroundClick={handleContinue}
    >
      <main className="relative flex min-h-screen items-center justify-center px-6 pt-24">
        <motion.section
          className="w-full max-w-3xl rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-14"
          variants={sequence}
          initial="hidden"
          animate="show"
        >
          <motion.button
            type="button"
            onClick={() => navigate('/about')}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-100/10 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.24)]"
            variants={item}
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)' }}
            whileTap={{ scale: 0.96 }}
          >
            <HomeIcon size={30} strokeWidth={2.2} />
          </motion.button>

          <motion.h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl" variants={item}>
            Smart Home
          </motion.h1>

          <motion.p className="mt-5 text-base text-zinc-200 sm:text-lg" variants={item}>
            Enter a cinematic control hub for smarter, calmer daily living.
          </motion.p>

          <motion.p
            className="mt-10 inline-flex rounded-full border border-amber-200/35 bg-amber-200/10 px-5 py-2.5 text-sm font-semibold tracking-wide text-amber-100"
            variants={item}
            animate={{ opacity: [0.45, 1, 0.45], y: [0, -2, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Click anywhere to continue
          </motion.p>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default Home;
