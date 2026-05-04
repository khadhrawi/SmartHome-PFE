import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Mail, User, Lock, Phone, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import { isEmailValid, isPasswordStrong } from '../utils/validation';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RequestOwnerAccount = () => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      return setError('Name, email and password are required.');
    }
    if (!isEmailValid(email)) return setError('Invalid email address.');
    if (!isPasswordStrong(password)) return setError('Password must be at least 8 characters with a digit and a special character.');

    setLoading(true);
    try {
      const res = await fetch(`${API}/owner-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request.');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-4 py-16">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/30">
              <Home size={26} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Become a House Owner</h1>
              <p className="mt-1 text-sm text-zinc-300">
                Submit a request. Once approved by an admin, you'll receive a unique access code by email to complete your registration.
              </p>
            </div>
          </div>

          {success ? (
            <motion.div
              className="flex flex-col items-center gap-4 py-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 size={48} className="text-emerald-400" />
              <p className="text-lg font-bold text-white">Request Submitted!</p>
              <p className="text-sm text-zinc-300">
                We'll review your request and send your access code to <strong className="text-amber-300">{email}</strong>.
              </p>
              <Link
                to="/"
                className="mt-4 rounded-xl bg-amber-400/15 px-6 py-2 text-sm font-bold text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/25"
              >
                Back to Home
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <User size={16} className="shrink-0 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Mail size={16} className="shrink-0 text-zinc-400" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>

              {/* Password */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Lock size={16} className="shrink-0 text-zinc-400" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>
              {password && <PasswordStrengthBar password={password} />}

              {/* Phone (optional) */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Phone size={16} className="shrink-0 text-zinc-400" />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>

              {/* Note (optional) */}
              <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <FileText size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                <textarea
                  placeholder="Brief note about your property (optional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <AlertTriangle size={15} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-sm font-black text-zinc-900 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Home size={16} />}
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-zinc-400">
            Already have your access code?{' '}
            <Link to="/auth/admin/register" className="font-semibold text-amber-300 hover:text-amber-200">
              Complete Registration
            </Link>
          </div>
          <div className="mt-2 text-center text-sm text-zinc-400">
            Just a resident?{' '}
            <Link to="/auth/resident/register" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Register as Resident
            </Link>
          </div>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default RequestOwnerAccount;
