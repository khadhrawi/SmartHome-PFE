import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon, Wifi, Shield, Zap, Cpu, BarChart3,
  ArrowRight, CheckCircle2, Lightbulb, Lock, Thermometer, Bell,
} from 'lucide-react';
import api from '../api/axios';
import PublicMotionShell from '../components/PublicMotionShell';

// ── Scroll-triggered slide wrapper ───────────────────────────────────────────
const OFFSETS = { up: { y: 70 }, down: { y: -70 }, left: { x: -90 }, right: { x: 90 } };

function Slide({ children, direction = 'up', delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, ...OFFSETS[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '10K+', label: 'Active Homes' },
  { value: '50K+', label: 'Devices Connected' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'AI Monitoring' },
];

const FEATURES = [
  { icon: Lightbulb, color: '#f59e0b', title: 'Smart Lighting', desc: 'Control brightness, color and schedules for every room from anywhere.' },
  { icon: Shield,    color: '#3b82f6', title: 'Advanced Security', desc: 'Real-time alerts, door locks, and camera monitoring keep your home safe.' },
  { icon: Thermometer, color: '#10b981', title: 'Climate Control', desc: 'Automated temperature management for perfect comfort and energy savings.' },
  { icon: Wifi,      color: '#8b5cf6', title: 'IoT Integration', desc: 'Connect ESP32 sensors, MQ6 gas detectors, DHT11, and more hardware.' },
  { icon: BarChart3, color: '#ec4899', title: 'Energy Analytics', desc: 'Track consumption per device and reduce your electricity bill over time.' },
  { icon: Bell,      color: '#f97316', title: 'Smart Alerts', desc: 'Gas leaks, unusual activity and system events pushed instantly to your device.' },
];

const STEPS = [
  { n: '01', title: 'Create Your Account', desc: 'Register as a House Owner and get your unique house code instantly.' },
  { n: '02', title: 'Add Your Devices', desc: 'Connect lights, doors, sensors and cameras through the dashboard.' },
  { n: '03', title: 'Automate & Relax', desc: 'Set scenarios, schedules, and let the AI handle the rest.' },
];

// ── Page ─────────────────────────────────────────────────────────────────────
const About = () => {
  const navigate = useNavigate();

  return (
    <PublicMotionShell showNavbar>
      <div className="overflow-x-hidden">

        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558002038-bb4237bb89a0?w=1600&auto=format&fit=crop&q=80')" }}
          />
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#020817]" />
          {/* Ambient glows */}
          <div className="pointer-events-none absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-sky-500/20 blur-[120px]" />
          <div className="pointer-events-none absolute right-1/4 top-1/2 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px]" />

          {/* Home button */}
          <motion.button
            type="button"
            onClick={() => navigate('/')}
            className="absolute left-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <HomeIcon size={20} />
          </motion.button>

          {/* Hero content */}
          <div className="relative z-10 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-300"
            >
              <Cpu size={12} /> Next-Gen Smart Living Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl font-black leading-tight tracking-tight text-white sm:text-7xl"
            >
              Your Home,{' '}
              <span
                style={{ backgroundImage: 'linear-gradient(135deg,#38bdf8,#818cf8,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Fully Alive
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300"
            >
              SmartHome PFE is a unified IoT command center that connects your devices,
              automates your routines, and keeps your family safe — all from one beautiful interface.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <button
                onClick={() => navigate('/auth/choose')}
                className="flex items-center gap-2 rounded-2xl bg-sky-400 px-7 py-3.5 text-sm font-black text-slate-900 transition-all hover:bg-sky-300 hover:scale-105"
              >
                Get Started <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/auth/choose')}
                className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/15"
              >
                Sign In
              </button>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          >
            <div className="flex flex-col items-center gap-1 text-xs text-zinc-400">
              <div className="h-8 w-px bg-gradient-to-b from-transparent to-zinc-400" />
              scroll
            </div>
          </motion.div>
        </section>

        {/* ══ STATS ═════════════════════════════════════════════════════════ */}
        <section className="relative bg-[#020817] py-20 px-6">
          <div className="mx-auto max-w-5xl">
            <Slide direction="up">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 md:grid-cols-4"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center justify-center gap-1 p-8 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-4xl font-black text-white sm:text-5xl"
                      style={{ backgroundImage: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {s.value}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{s.label}</span>
                  </motion.div>
                ))}
              </div>
            </Slide>
          </div>
        </section>

        {/* ══ SPLIT — ABOUT + IMAGE ════════════════════════════════════════ */}
        <section className="bg-[#020817] py-24 px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <Slide direction="left">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-sky-400">Who We Are</p>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Built by engineers,<br />
                <span style={{ backgroundImage: 'linear-gradient(135deg,#34d399,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  for modern families.
                </span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-300">
                SmartHome PFE is an end-to-end platform developed as a final year engineering project.
                We built a full-stack IoT system — from ESP32 hardware nodes to a real-time cloud backend
                and a polished React dashboard — so anyone can manage their home intelligently.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                Our AI companion Melo understands natural language commands, while automated scenarios
                and energy analytics handle the rest. Security, comfort, and efficiency — all in one place.
              </p>
              <ul className="mt-6 space-y-2">
                {['Real-time MQTT communication', 'Role-based access (Owner, Resident, Agency)', 'AI-powered voice commands with Melo'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> {t}
                  </li>
                ))}
              </ul>
            </Slide>

            <Slide direction="right" delay={0.1}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-sky-500/20 via-violet-500/10 to-emerald-500/20 blur-2xl" />
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&auto=format&fit=crop&q=80"
                  alt="Smart home interior"
                  className="relative w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
                  style={{ maxHeight: 420 }}
                />
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0d1117] px-4 py-3 shadow-2xl backdrop-blur-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15">
                    <Zap size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Live Sync</p>
                    <p className="text-[10px] text-zinc-400">All devices real-time</p>
                  </div>
                </div>
              </div>
            </Slide>
          </div>
        </section>

        {/* ══ FEATURES GRID ════════════════════════════════════════════════ */}
        <section className="bg-[#020817] py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <Slide direction="up" className="mb-14 text-center">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-violet-400">Everything You Need</p>
              <h2 className="text-4xl font-black text-white sm:text-5xl">Built-in features that <br/>
                <span style={{ backgroundImage: 'linear-gradient(135deg,#818cf8,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  actually matter
                </span>
              </h2>
            </Slide>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 60, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="group relative overflow-hidden rounded-3xl border border-white/8 p-6"
                  style={{ background: 'linear-gradient(145deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)' }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}12 0%, transparent 70%)` }} />
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                    <f.icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-black text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECOND IMAGE SPLIT ═══════════════════════════════════════════ */}
        <section className="bg-[#020817] py-24 px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <Slide direction="left" delay={0.1}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 blur-2xl" />
                <img
                  src="https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop&q=80"
                  alt="Smart home app"
                  className="relative w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
                  style={{ maxHeight: 420 }}
                />
                <div className="absolute -top-4 -right-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0d1117] px-4 py-3 shadow-2xl backdrop-blur-xl">
                  <Lock size={16} className="text-sky-400" />
                  <p className="text-xs font-bold text-white">256-bit Secure</p>
                </div>
              </div>
            </Slide>

            <Slide direction="right">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-pink-400">Security First</p>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Your data stays{' '}
                <span style={{ backgroundImage: 'linear-gradient(135deg,#f472b6,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  yours.
                </span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-300">
                End-to-end JWT authentication, 2FA support, role-based access control, and
                rate-limited APIs ensure only the right people control your home.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                Gas leaks, unauthorized access attempts, and unusual device activity
                trigger instant push notifications and hardware alarms.
              </p>
            </Slide>
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════════════════════ */}
        <section className="bg-[#020817] py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <Slide direction="up" className="mb-16 text-center">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-400">Simple to Start</p>
              <h2 className="text-4xl font-black text-white sm:text-5xl">Up and running in <br/>
                <span style={{ backgroundImage: 'linear-gradient(135deg,#34d399,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  3 steps
                </span>
              </h2>
            </Slide>

            <div className="relative space-y-6">
              {/* Vertical line */}
              <div className="absolute left-8 top-8 h-[calc(100%-4rem)] w-px bg-gradient-to-b from-sky-500/60 via-violet-500/40 to-transparent" />

              {STEPS.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: -80 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.65, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex gap-6 rounded-3xl border border-white/8 p-6"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-xl font-black text-sky-300">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-[#020817] py-24 px-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-sky-500/15 blur-[100px]" />
            <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-violet-500/15 blur-[100px]" />
          </div>
          <Slide direction="up">
            <div className="relative mx-auto max-w-3xl rounded-3xl border border-white/10 p-10 text-center"
              style={{ background: 'linear-gradient(145deg,rgba(14,165,233,0.08),rgba(139,92,246,0.06))' }}>
              <h2 className="text-4xl font-black text-white sm:text-5xl">Ready to automate<br/>your home?</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-zinc-300">
                Join thousands of homeowners already using SmartHome PFE to live smarter.
              </p>
              <button
                onClick={() => navigate('/auth/choose')}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-400 px-8 py-4 text-sm font-black text-slate-900 transition-all hover:bg-sky-300 hover:scale-105"
              >
                Get Started Free <ArrowRight size={16} />
              </button>
            </div>
          </Slide>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
        <footer className="border-t border-white/8 bg-[#020817] py-8 text-center text-xs text-zinc-500">
          © 2026 SmartHome PFE. All rights reserved. Built with ❤️ by engineering students.
        </footer>

        {/* Concierge access */}
        <div className="fixed left-4 bottom-6 z-50">
          <button
            onClick={async () => {
              const code = window.prompt('Enter concierge access code');
              if (!code) return;
              try {
                const res = await api.post('/concierge/token', { code });
                if (res?.data?.ok) {
                  window.sessionStorage.setItem('conciergeCode', code);
                  window.location.href = '/concierge-hub';
                } else { window.alert('Invalid code'); }
              } catch { window.alert('Invalid code'); }
            }}
            title="Concierge Space"
            className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-zinc-400 backdrop-blur-sm hover:text-zinc-200"
          >
            Concierge Space
          </button>
        </div>
      </div>
    </PublicMotionShell>
  );
};

export default About;
