import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
    style={{ background: 'transparent' }}
  >
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-sm"
    >
      {/* Glowing number */}
      <div className="relative select-none">
        <p
          className="text-[8rem] font-black leading-none"
          style={{
            background: 'linear-gradient(135deg, #E3C598, #D4AF37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(227,197,152,0.35))',
          }}
        >
          404
        </p>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(227,197,152,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white">Page not found</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/dashboard"
          className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black transition hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #E3C598, #D4AF37)',
            color: '#18180b',
            boxShadow: '0 8px 24px rgba(227,197,152,0.25)',
          }}
        >
          <Home size={15} />
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10 transition"
        >
          <ArrowLeft size={15} />
          Go back
        </button>
      </div>
    </motion.div>
  </div>
);

export default NotFound;
