import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Navbar from './Navbar';

const pageTransition = {
  initial: { opacity: 0, scale: 0.988, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.992,
    y: -8,
    transition: { duration: 0.42, ease: [0.4, 0, 1, 1] },
  },
};

const PublicMotionShell = ({ children, showNavbar = true, onBackgroundClick }) => {
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 80, damping: 20, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20, mass: 0.5 });

  const blob1X = useTransform(springX, [-0.5, 0.5], [-26, 26]);
  const blob1Y = useTransform(springY, [-0.5, 0.5], [-20, 20]);
  const blob2X = useTransform(springX, [-0.5, 0.5], [18, -18]);
  const blob2Y = useTransform(springY, [-0.5, 0.5], [14, -14]);

  const handleMouseMove = (event) => {
    const { innerWidth, innerHeight } = window;
    mouseX.set(event.clientX / innerWidth - 0.5);
    mouseY.set(event.clientY / innerHeight - 0.5);
  };

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-zinc-950 text-white"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseMove={handleMouseMove}
      onClick={onBackgroundClick}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(125% 110% at 10% 8%, rgba(251,191,36,0.28), transparent 53%), radial-gradient(110% 90% at 90% 82%, rgba(186,230,253,0.14), transparent 52%), linear-gradient(130deg, #09090b 0%, #111827 48%, #05060b 100%)',
          backgroundSize: '140% 140%, 150% 150%, 100% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 0%, 100% 100%, 0% 0%', '8% 6%, 92% 90%, 0% 0%', '0% 0%, 100% 100%, 0% 0%'],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute -left-16 top-1/4 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl"
        style={{ x: blob1X, y: blob1Y }}
        animate={{ scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute bottom-10 right-[-40px] h-80 w-80 rounded-full bg-sky-200/15 blur-3xl"
        style={{ x: blob2X, y: blob2Y }}
        animate={{ scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.09),transparent_45%)]" />

      {showNavbar ? <Navbar /> : null}

      <div
        className="relative z-10"
        onMouseEnter={() => setIsHoveringInteractive(true)}
        onMouseLeave={() => setIsHoveringInteractive(false)}
      >
        {children}
      </div>

      {!isHoveringInteractive && onBackgroundClick ? (
        <motion.div
          className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-xs font-semibold tracking-wide text-amber-100"
          animate={{ opacity: [0.35, 0.95, 0.35], y: [0, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          Click anywhere to continue
        </motion.div>
      ) : null}
    </motion.div>
  );
};

export default PublicMotionShell;
