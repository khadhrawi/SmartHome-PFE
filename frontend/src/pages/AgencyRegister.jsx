import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Lock, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';
import { isEmailValid } from '../utils/validation';

const AgencyRegister = () => {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [agencyAccessCode, setAgencyAccessCode] = useState('');
  const [error, setError]                     = useState('');
  const [isLoading, setIsLoading]             = useState(false);

  const { registerAgency } = useContext(AuthContext);
  const navigate = useNavigate();

  const emailValid = isEmailValid(email);
  const canSubmit  =
    name.trim().length > 0 &&
    emailValid &&
    password.length >= 8 &&
    agencyAccessCode.trim().length > 0 &&
    !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);

    const res = await registerAgency(name, email, password, agencyAccessCode);
    setIsLoading(false);

    if (res.success) {
      navigate('/auth/agency/login');
      return;
    }
    setError(res.error || 'Registration failed. Please try again.');
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.28)',
    border: '1px solid rgba(167,139,250,0.22)',
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl p-8 shadow-[0_35px_120px_rgba(0,0,0,0.60)] backdrop-blur-xl"
          style={{ background: 'rgba(16,8,40,0.72)', border: '1px solid rgba(167,139,250,0.28)' }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.22), rgba(109,40,217,0.18))',
              border: '1px solid rgba(167,139,250,0.35)',
              boxShadow: '0 0 28px rgba(139,92,246,0.30)',
            }}
          >
            <Building2 size={30} strokeWidth={2.2} style={{ color: '#c4b5fd' }} />
          </div>

          <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">
            Create Agency Account
          </h1>
          <p className="mt-2 text-center text-sm" style={{ color: 'rgba(196,181,253,0.70)' }}>
            Aura Agency Tier — top-level management registration
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-sm text-rose-100">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {[
              { id: 'agency-reg-name',     label: 'Full name',  value: name,     setter: setName,     type: 'text',     icon: User },
              { id: 'agency-reg-email',    label: 'Agency email',value: email,    setter: setEmail,    type: 'email',    icon: User },
              { id: 'agency-reg-password', label: 'Password',   value: password, setter: setPassword, type: 'password', icon: Lock },
              { id: 'agency-reg-code',     label: 'Agency Access Code', value: agencyAccessCode, setter: setAgencyAccessCode, type: 'password', icon: KeyRound },
            ].map(({ id, label, value, setter, type, icon: Icon }) => (
              <div key={id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={inputStyle}>
                <Icon size={17} style={{ color: 'rgba(196,181,253,0.80)' }} />
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-300/55"
                  placeholder={label}
                  required
                />
              </div>
            ))}

            <button
              id="agency-register-submit"
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Agency Account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/auth/agency/login')}
            className="mt-5 w-full text-sm font-semibold"
            style={{ color: 'rgba(196,181,253,0.70)' }}
          >
            ← Already have an account? Sign in
          </button>
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default AgencyRegister;
