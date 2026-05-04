import { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, ArrowRight, Loader2, CheckCircle2,
  AlertTriangle, Sparkles, Building2, KeyRound, X,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

// ─── Shared styles ────────────────────────────────────────────────────────────
const PANEL = {
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(24px)',
};

const INPUT_STYLE = {
  background: 'rgba(0,0,0,0.30)',
  border: '1px solid rgba(255,255,255,0.12)',
};

// ─── Choice Card ─────────────────────────────────────────────────────────────
const ChoiceCard = ({ id, icon: Icon, title, subtitle, description, accent, onClick }) => (
  <motion.button
    id={id}
    type="button"
    onClick={onClick}
    className="group w-full rounded-3xl p-7 text-left transition-all duration-300"
    style={{
      ...PANEL,
      borderColor: `${accent}28`,
    }}
    whileHover={{
      scale: 1.025,
      borderColor: `${accent}55`,
      boxShadow: `0 0 40px ${accent}22`,
    }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
  >
    <div className="flex items-start justify-between gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 22px ${accent}18`,
        }}
      >
        <Icon size={26} style={{ color: accent }} />
      </div>
      <ArrowRight
        size={20}
        className="mt-1 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        style={{ color: `${accent}80` }}
      />
    </div>

    <p
      className="mt-5 text-[11px] font-black uppercase tracking-[0.22em]"
      style={{ color: accent }}
    >
      {subtitle}
    </p>
    <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{description}</p>

    {/* Feature pills */}
    <div className="mt-5 flex flex-wrap gap-2">
      {id === 'onboard-join' && (
        <>
          <Pill color={accent} label="Agency Support" />
          <Pill color={accent} label="Request Maintenance" />
          <Pill color={accent} label="Managed Network" />
        </>
      )}
      {id === 'onboard-solo' && (
        <>
          <Pill color={accent} label="Super Admin Rights" />
          <Pill color={accent} label="Full Control" />
          <Pill color={accent} label="No Agency Needed" />
        </>
      )}
    </div>
  </motion.button>
);

const Pill = ({ color, label }) => (
  <span
    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
    style={{
      background: `${color}12`,
      border: `1px solid ${color}30`,
      color: `${color}cc`,
    }}
  >
    {label}
  </span>
);

// ─── Join Panel ───────────────────────────────────────────────────────────────
const JoinPanel = ({ onBack, onSuccess, hideBack = false }) => {
  const { joinUnit } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [message, setMessage] = useState('');

  const handleJoin = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setMessage('');
    const res = await joinUnit(code.trim().toUpperCase());
    if (res.success) {
      setStatus('success');
      setTimeout(() => onSuccess(), 800);
    } else {
      setStatus('error');
      setMessage(res.error || 'No residence found with that code.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <div className="rounded-3xl p-8" style={PANEL}>
        {!hideBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <X size={15} /> Cancel
          </button>
        )}

        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)', boxShadow: '0 0 24px rgba(56,189,248,0.18)' }}
        >
          <KeyRound size={26} style={{ color: '#38bdf8' }} />
        </div>

        <h2 className="text-2xl font-black text-white">Enter Your House Code</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Ask your <span className="font-semibold text-sky-300">home admin</span> for the 5-character house code. They can find it on their dashboard (e.g. <span className="font-mono font-bold text-sky-300">A1234</span>).
        </p>

        <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)' }}>
          <p className="text-xs text-sky-300 font-semibold">📋 How to get your house code</p>
          <p className="text-xs text-zinc-400 mt-1">Your admin logs in → Dashboard → copies the <span className="text-sky-300 font-mono">House Code</span> shown at the top and shares it with you.</p>
        </div>

        {/* Input */}
        <div className="mt-6 flex flex-col gap-3">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{
              ...INPUT_STYLE,
              borderColor: status === 'error' ? 'rgba(248,113,113,0.55)' : 'rgba(56,189,248,0.25)',
            }}
          >
            <KeyRound size={17} style={{ color: 'rgba(56,189,248,0.70)' }} />
            <input
              id="join-house-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (status === 'error') setStatus('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 bg-transparent font-mono text-base font-bold tracking-[0.20em] text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400/60"
              placeholder="e.g. A1234"
              maxLength={5}
              autoFocus
            />
            {status === 'success' && <CheckCircle2 size={18} style={{ color: '#4ade80' }} />}
          </div>

          <AnimatePresence>
            {status === 'error' && message && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)' }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-300" />
                <span className="text-xs text-rose-200">{message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="join-submit"
            onClick={handleJoin}
            disabled={code.length < 5 || status === 'loading' || status === 'success'}
            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              boxShadow: '0 0 24px rgba(14,165,233,0.35)',
            }}
          >
            {status === 'loading'
              ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
              : status === 'success'
              ? <><CheckCircle2 size={16} /> Joined!</>
              : <>Join Residence <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Solo Confirm Panel ───────────────────────────────────────────────────────
const SoloPanel = ({ onBack, onSuccess }) => {
  const { createSoloUnit } = useContext(AuthContext);
  const [status, setStatus] = useState('idle');
  const [unitCode, setUnitCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setStatus('loading');
    setError('');
    const res = await createSoloUnit();
    if (res.success) {
      setUnitCode(res.unitCode || '');
      setStatus('success');
      setTimeout(() => onSuccess(), 1400);
    } else {
      setStatus('error');
      setError(res.error || 'Failed to create your unit. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <div className="rounded-3xl p-8" style={PANEL}>
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <X size={15} /> Cancel
        </button>

        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.40)', boxShadow: '0 0 28px rgba(139,92,246,0.25)' }}
        >
          <Sparkles size={26} style={{ color: '#c4b5fd' }} />
        </div>

        <h2 className="text-2xl font-black text-white">Start Your Solo Home</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          We'll generate a unique house code for you and grant you{' '}
          <span className="font-bold text-violet-300">full Super Admin control</span> — no agency oversight required.
        </p>

        {/* Feature list */}
        <ul className="mt-5 space-y-2">
          {[
            'Your unique house code, generated instantly',
            'Full access to all rooms, devices & automations',
            'No maintenance request flow (you\'re the admin)',
            'Upgrade to Agency-managed anytime',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: '#a78bfa' }} />
              {item}
            </li>
          ))}
        </ul>

        <AnimatePresence>
          {status === 'success' && unitCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 rounded-2xl p-4 text-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(167,139,250,0.40)' }}
            >
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Your House Code</p>
              <p className="font-mono text-3xl font-black tracking-[0.25em]" style={{ color: '#c4b5fd' }}>
                {unitCode}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Save this — it's your home's unique ID</p>
            </motion.div>
          )}
          {status === 'error' && error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)' }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-300" />
              <span className="text-xs text-rose-200">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          id="solo-create"
          onClick={handleCreate}
          disabled={status === 'loading' || status === 'success'}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: status === 'success'
              ? 'rgba(139,92,246,0.40)'
              : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            boxShadow: status !== 'success' ? '0 0 28px rgba(139,92,246,0.40)' : 'none',
          }}
        >
          {status === 'loading'
            ? <><Loader2 size={16} className="animate-spin" /> Creating your home…</>
            : status === 'success'
            ? <><CheckCircle2 size={16} /> Home created — entering…</>
            : <><Sparkles size={16} /> Create My Solo Home</>}
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main UnitOnboarding Page ─────────────────────────────────────────────────
const UnitOnboarding = ({ onComplete }) => {
  const { user } = useContext(AuthContext);

  // Residents must join an existing home — they cannot create a solo unit
  const isResident = user?.role === 'resident';
  const [step, setStep] = useState(isResident ? 'join' : 'choose'); // residents skip straight to join

  const handleSuccess = () => {
    if (onComplete) onComplete();
    // Force a page reload so the router re-evaluates houseCode from context
    window.location.replace('/dashboard');
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col items-center justify-center overflow-y-auto px-5 py-10"
      style={{
        background:
          'linear-gradient(155deg, #07080E 0%, #0D1224 50%, #07080E 100%)',
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div
          className="absolute"
          style={{
            inset: 0,
            background:
              'radial-gradient(60% 60% at 20% 15%, rgba(56,189,248,0.10), transparent 60%),' +
              'radial-gradient(55% 55% at 80% 82%, rgba(139,92,246,0.12), transparent 58%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="mb-4 inline-flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #E3C598, #D4AF37)' }}
            >
              <Home size={20} style={{ color: '#1a1008' }} />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Smart<span style={{ color: '#E3C598' }}>Home</span>
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">
            {isResident
              ? 'Enter the house code provided by your admin to connect to your smart home.'
              : 'How would you like to set up your smart home? Choose an option below to get started.'}
          </p>
        </motion.div>

        {/* Step panels */}
        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-5 md:grid-cols-2"
            >
              <ChoiceCard
                id="onboard-join"
                icon={Building2}
                subtitle="Managed Residence"
                title="Join Existing Residence"
                description="Your building manager or agency has already set up a smart home unit. Enter the house code they provided to connect your account."
                accent="#38bdf8"
                onClick={() => setStep('join')}
              />
              <ChoiceCard
                id="onboard-solo"
                icon={Sparkles}
                subtitle="Independent Owner"
                title="Start Solo Home"
                description="Set up your own smart home without an agency. You'll get a unique house code and full Super Admin control over every device and room."
                accent="#a78bfa"
                onClick={() => setStep('solo')}
              />
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div key="join" className="flex justify-center">
              <JoinPanel
                onBack={() => setStep('choose')}
                onSuccess={handleSuccess}
                hideBack={isResident}
              />
            </motion.div>
          )}

          {step === 'solo' && (
            <motion.div key="solo" className="flex justify-center">
              <SoloPanel onBack={() => setStep('choose')} onSuccess={handleSuccess} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        {step === 'choose' && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-8 text-center text-xs text-zinc-500"
          >
            You can always change or upgrade your setup later from your Profile settings.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default UnitOnboarding;
