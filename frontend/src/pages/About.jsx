import { Home as HomeIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PublicMotionShell from '../components/PublicMotionShell';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const About = () => {
  const navigate = useNavigate();

  return (
    <PublicMotionShell showNavbar>
      <motion.main
        className="relative mx-auto w-[min(92%,1100px)] px-1 pb-16 pt-28 sm:pt-32"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div className="mb-6 text-center" variants={sectionVariants}>
          <motion.button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to landing page"
            className="mx-auto mb-4 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-amber-200/35 bg-amber-100/10 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.24)]"
            whileHover={{ scale: 1.08, filter: 'brightness(1.12)', opacity: 0.96 }}
            whileTap={{ scale: 0.96 }}
          >
            <HomeIcon size={26} strokeWidth={2.2} />
          </motion.button>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">About Smart Home</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-200 sm:text-base">
            A unified command center built for elegant automation, comfort, and secure modern living.
          </p>
        </motion.div>

        <motion.section
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg sm:p-8"
          variants={sectionVariants}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">About Us</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-200 sm:text-base">
            Smart Home is a home control center platform built to simplify modern living. It helps users control and manage smart home devices such as lighting, security systems, and appliances from one place.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200 sm:text-base">
            Our focus is simplicity, intelligent automation, and a smoother daily lifestyle powered by connected technology.
          </p>
        </motion.section>

        <motion.section
          className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg sm:p-8"
          variants={sectionVariants}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">How to Join</h2>
          <ol className="mt-4 space-y-3 text-sm text-zinc-200 sm:text-base">
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">1. Create an account.</li>
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">2. Connect your devices.</li>
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">3. Start managing your home.</li>
          </ol>
        </motion.section>

        <motion.section
          className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg sm:p-8"
          variants={sectionVariants}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Benefits</h2>
          <ul className="mt-4 grid gap-3 text-sm text-zinc-200 sm:grid-cols-2 sm:text-base">
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">Centralized control</li>
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">Automation and time-saving</li>
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">Better security</li>
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">Energy efficiency</li>
          </ul>
        </motion.section>
      </motion.main>

      <motion.footer
        className="relative border-t border-white/10 py-5 text-center text-xs text-zinc-300 sm:text-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        © 2026 Smart Home. All rights reserved.
      </motion.footer>
    </PublicMotionShell>
  );
};

export default About;
