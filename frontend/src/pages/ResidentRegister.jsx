import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Lock, Mail, User, Loader2, BedDouble, KeyRound, AlertTriangle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import { isEmailValid, isPasswordStrong } from '../utils/validation';

const ROOM_OPTIONS = ['Living Room', 'Bedroom', 'Kitchen', 'Entrance', 'Garage', 'Utility'];
const HOUSE_CODE_REGEX = /^[A-Z]\d{4}$/;

const formatHouseCodeInput = (value = '') => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (!cleaned) return '';

  const firstLetter = cleaned[0].replace(/[^A-Z]/g, '');
  const digits = cleaned.slice(1).replace(/[^0-9]/g, '').slice(0, 4);
  return `${firstLetter}${digits}`;
};

const ResidentRegister = () => {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [assignedRoom, setAssignedRoom] = useState('Bedroom');
  const [roomRequest, setRoomRequest]   = useState('');
  const [inviteCode, setInviteCode]     = useState('');
  const [houseCode, setHouseCode]       = useState('');
  const [error, setError]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);

  const { registerResident } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid  = isEmailValid(email);
  const passwordOk  = isPasswordStrong(password);
  const houseOk     = HOUSE_CODE_REGEX.test(formatHouseCodeInput(houseCode));
  const canSubmit   = name.trim().length > 0 && emailValid && passwordOk && houseOk && !isLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedHouseCode = formatHouseCodeInput(houseCode);

    if (!HOUSE_CODE_REGEX.test(normalizedHouseCode)) {
      setError('Invalid House Code. Please check and try again.');
      return;
    }
    if (!emailValid) {
      setError('Please enter a valid email address (.com, .fr, or .tn).');
      return;
    }
    if (!passwordOk) {
      setError('Password must be at least 8 characters and include a number and a special character.');
      return;
    }

    setIsLoading(true);

    const res = await registerResident({
      name,
      email,
      password,
      houseCode: normalizedHouseCode,
      assignedRoom,
      roomRequest,
      inviteCode,
    });

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
          className="w-full max-w-xl rounded-3xl border border-emerald-200/30 bg-emerald-500/10 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/about')}
            aria-label="Go to About Us"
            className="mx-auto mb-5 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border border-emerald-200/35 bg-emerald-100/10 text-emerald-100 shadow-[0_0_28px_rgba(74,222,128,0.24)]"
            whileHover={{ scale: 1.06, opacity: 0.96 }}
            whileTap={{ scale: 0.97 }}
          >
            <Users size={30} strokeWidth={2.2} />
          </motion.button>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-white">Register as House Resident</h1>
          <p className="mt-2 text-center text-sm text-zinc-100">
            House Residents have limited access and must request permission for global controls.
          </p>

          {/* ── Aura Glassmorphism Error Tooltip ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3.5 shadow-[0_0_24px_rgba(239,68,68,0.12)] backdrop-blur-sm"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-sm leading-snug text-rose-100">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Name */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
                <User size={17} className="text-emerald-100/80" />
                <input
                  id="resident-register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="Full name"
                  autoComplete="name"
                  required
                />
              </div>

              {/* Email */}
              <div
                className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 transition-colors duration-200 ${
                  email && !emailValid ? 'border-rose-500' : 'border-white/15'
                }`}
              >
                <Mail size={17} className="text-emerald-100/80" />
                <input
                  id="resident-register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="Email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {email && !emailValid && (
                <motion.p
                  className="ml-1 text-[11px] text-rose-300"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Please enter a valid luxury address.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Password */}
            <div
              className={`flex items-center gap-3 rounded-2xl border bg-black/20 px-4 py-3 transition-colors duration-200 ${
                password && !passwordOk ? 'border-amber-400/40' : 'border-white/15'
              }`}
            >
              <Lock size={17} className="text-emerald-100/80" />
              <input
                id="resident-register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Password"
                autoComplete="new-password"
                required
              />
            </div>

            {/* Strength Bar */}
            <PasswordStrengthBar password={password} />

            <div className="grid gap-4 md:grid-cols-2">
              {/* Assigned Room */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
                <BedDouble size={17} className="text-emerald-100/80" />
                <select
                  id="resident-register-room"
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                  required
                >
                  {ROOM_OPTIONS.map((room) => (
                    <option key={room} value={room} className="bg-zinc-900 text-white">
                      {room}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Request */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
                <BedDouble size={17} className="text-emerald-100/80" />
                <input
                  id="resident-register-room-request"
                  type="text"
                  value={roomRequest}
                  onChange={(e) => setRoomRequest(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                  placeholder="Or request another room"
                />
              </div>
            </div>

            {/* House Code */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <KeyRound size={17} className="text-emerald-100/80" />
              <input
                id="resident-register-house-code"
                type="text"
                value={houseCode}
                onChange={(e) => setHouseCode(formatHouseCodeInput(e.target.value))}
                className="w-full bg-transparent text-sm uppercase tracking-[0.12em] text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Enter House Code (A1234)"
                aria-label="House Code"
                maxLength={5}
                required
              />
            </div>

            {/* Invite Code */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <KeyRound size={17} className="text-emerald-100/80" />
              <input
                id="resident-register-invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/65"
                placeholder="Invite code (optional if required)"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-emerald-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Resident Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-200">
            Already registered?{' '}
            <Link to="/auth/resident/login" className="font-semibold text-emerald-200 hover:text-emerald-100">
              Sign In as Resident
            </Link>
          </div>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default ResidentRegister;
