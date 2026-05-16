import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon, Wifi, Shield, Thermometer,
  Lightbulb, Lock, Zap, Bell, Cpu,
} from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';

// ── Floating background icons ─────────────────────────────────────────────
const FLOATERS = [
  { Icon: Wifi,        x: '8%',  y: '18%', size: 22, delay: 0,    dur: 6   },
  { Icon: Shield,      x: '88%', y: '12%', size: 20, delay: 0.8,  dur: 7   },
  { Icon: Thermometer, x: '5%',  y: '65%', size: 18, delay: 1.4,  dur: 5.5 },
  { Icon: Lightbulb,   x: '92%', y: '58%', size: 22, delay: 0.4,  dur: 8   },
  { Icon: Lock,        x: '15%', y: '85%', size: 16, delay: 1.8,  dur: 6.5 },
  { Icon: Zap,         x: '82%', y: '80%', size: 18, delay: 0.6,  dur: 7.5 },
  { Icon: Bell,        x: '50%', y: '8%',  size: 16, delay: 1.2,  dur: 6   },
  { Icon: Cpu,         x: '72%', y: '30%', size: 20, delay: 2,    dur: 9   },
  { Icon: Wifi,        x: '28%', y: '22%', size: 14, delay: 1.6,  dur: 5   },
  { Icon: Zap,         x: '38%', y: '88%', size: 16, delay: 0.2,  dur: 8.5 },
];

// ── Stagger variants ──────────────────────────────────────────────────────
const sequence = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.3 } },
};
const item = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

// ── Component ─────────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();

  const handleContinue = useCallback((e) => {
    if (e.target instanceof Element && e.target.closest('[data-public-navbar]')) return;
    navigate('/about');
  }, [navigate]);

  return (
    <PublicMotionShell showNavbar onBackgroundClick={handleContinue}>

      {/* ── Floating background icons ── */}
      {FLOATERS.map(({ Icon, x, y, size, delay, dur }, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute z-0"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.18, 0.12, 0.18, 0], scale: 1, y: [0, -18, 0, -10, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size} className="text-amber-100" />
        </motion.div>
      ))}

      {/* ── Pulsing rings behind card ── */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            className="absolute rounded-full border border-amber-200/10"
            initial={{ width: 320, height: 320, opacity: 0 }}
            animate={{ width: 320 + n * 140, height: 320 + n * 140, opacity: [0, 0.18, 0] }}
            transition={{ duration: 3.5, delay: n * 1, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* ── Main card ── */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-24">
        <motion.section
          className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-white/[0.06] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-14"
          variants={sequence}
          initial="hidden"
          animate="show"
        >
          {/* Animated border glow */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            animate={{ opacity: [0.4, 0.85, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 60px rgba(251,191,36,0.08), inset 0 0 60px rgba(251,191,36,0.04)' }}
          />

          {/* Inner ambient gradient */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
          />

          {/* Home icon button */}
          <motion.button
            type="button"
            onClick={() => navigate('/about')}
            className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-100/10 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.24)]"
            variants={item}
            whileHover={{ scale: 1.12, filter: 'brightness(1.18)', rotate: [0, -4, 4, 0] }}
            whileTap={{ scale: 0.94 }}
            transition={{ rotate: { duration: 0.4 } }}
          >
            <HomeIcon size={30} strokeWidth={2.2} />
          </motion.button>

          {/* Title with animated gradient */}
          <motion.h1
            className="relative text-5xl font-black tracking-tight sm:text-7xl"
            variants={item}
          >
            {['S','m','a','r','t',' ','H','o','m','e'].map((char, i) => (
              <motion.span
                key={i}
                className="inline-block"
                style={char === ' ' ? { width: '0.3em' } : {
                  backgroundImage: 'linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b, #fcd34d)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle — word by word */}
          <motion.p className="mt-5 text-base text-zinc-200 sm:text-lg" variants={item}>
            {'Enter a cinematic control hub for smarter, calmer daily living.'.split(' ').map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.9 + i * 0.06, ease: 'easeOut' }}
              >
                {word}
              </motion.span>
            ))}
          </motion.p>

          {/* Divider line */}
          <motion.div
            className="mx-auto my-8 h-px w-32 rounded-full bg-gradient-to-r from-transparent via-amber-300/50 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.3 }}
          />

          {/* CTA badge */}
          <motion.p
            className="inline-flex rounded-full border border-amber-200/35 bg-amber-200/10 px-5 py-2.5 text-sm font-semibold tracking-wide text-amber-100"
            variants={item}
            animate={{ opacity: [0.5, 1, 0.5], y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            Click anywhere to continue →
          </motion.p>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default Home;
