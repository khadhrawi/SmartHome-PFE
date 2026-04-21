import { motion } from 'framer-motion';
import { getPasswordStrength } from '../utils/validation';

const SEGMENT_COLORS = {
  empty:  ['bg-white/10', 'bg-white/10', 'bg-white/10'],
  weak:   ['bg-rose-400', 'bg-white/10', 'bg-white/10'],
  medium: ['bg-amber-300', 'bg-amber-300', 'bg-white/10'],
  strong: ['bg-emerald-400', 'bg-emerald-400', 'bg-emerald-400'],
};

const LABELS = {
  empty:  '',
  weak:   'Weak — make it longer',
  medium: 'Medium — add a special character',
  strong: 'Strong ✓',
};

const LABEL_COLORS = {
  empty:  'text-zinc-500',
  weak:   'text-rose-300',
  medium: 'text-amber-300',
  strong: 'text-emerald-400',
};

/**
 * Aura Glassmorphism password strength indicator.
 * Shows three animated segments + a descriptive label.
 *
 * @param {{ password: string, accentClass?: string }} props
 */
const PasswordStrengthBar = ({ password }) => {
  const { level } = getPasswordStrength(password || '');
  const segments = SEGMENT_COLORS[level];
  const label = LABELS[level];

  if (!password) return null;

  return (
    <motion.div
      className="px-1 pt-0.5"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/* Three-segment bar */}
      <div className="flex gap-1.5">
        {segments.map((segClass, i) => (
          <motion.div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-400 ${segClass}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>

      {/* Label */}
      <p className={`mt-1.5 text-[11px] font-medium ${LABEL_COLORS[level]}`}>
        {label}
      </p>
    </motion.div>
  );
};

export default PasswordStrengthBar;
