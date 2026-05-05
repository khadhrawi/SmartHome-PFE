import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable glassmorphic confirm dialog.
 *
 * Props:
 *   open        — boolean
 *   title       — string
 *   message     — string
 *   confirmLabel — string (default "Confirm")
 *   cancelLabel  — string (default "Cancel")
 *   accent      — hex color for confirm button (default "#f87171")
 *   onConfirm   — () => void
 *   onCancel    — () => void
 */
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  accent = '#f87171',
  onConfirm,
  onCancel,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-center justify-center p-4"
        style={{ background: 'rgba(4,8,20,0.75)', backdropFilter: 'blur(20px)' }}
        onClick={e => e.target === e.currentTarget && onCancel?.()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="w-full max-w-sm rounded-[2rem] p-6 space-y-5"
          style={{
            background: 'rgba(12,14,26,0.95)',
            border: `1px solid ${accent}30`,
            boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 40px ${accent}10`,
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}15`, border: `1px solid ${accent}35` }}
            >
              <AlertTriangle size={20} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white text-lg leading-tight">{title}</h3>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/10 transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl py-2.5 text-sm font-black transition hover:opacity-90 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
                color: '#fff',
                boxShadow: `0 4px 16px ${accent}40`,
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ConfirmDialog;
