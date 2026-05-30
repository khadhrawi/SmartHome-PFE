/**
 * GasEmergencyOverlay
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen red glassmorphic emergency screen.
 * - Cannot be dismissed by the user (only cleared when gas level drops)
 * - Admins see a "Confirm Safe & Clear" button
 * - Animated pulsing alert, live ppm gauge, step-by-step safety instructions
 * - Plays a visual alarm tick (CSS animation) — no Web Audio so no browser block
 */

import React, { useContext } from 'react';
import { AlertTriangle, ShieldOff, Wind, Flame, PhoneCall } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const STEPS = [
  { Icon: Wind,      text: 'Open all windows and doors immediately' },
  { Icon: Flame,     text: 'Do NOT operate any switches or appliances' },
  { Icon: ShieldOff, text: 'Evacuate all residents from the building' },
  { Icon: PhoneCall, text: 'Call emergency services: 190 / 15' },
];

const GasEmergencyOverlay = ({ gasLevel, threshold, gasValveOpen, onClear }) => {
  const { user } = useContext(AuthContext);
  const isAdmin  = user?.role === 'admin';
  const pct      = Math.min(100, Math.round((gasLevel / (threshold * 2)) * 100));

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto py-6"
      style={{
        background: 'rgba(12,2,2,0.93)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
      }}
    >
      {/* ── Animated ambient radial pulses ─────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 42%, rgba(220,38,38,0.22) 0%, transparent 70%)',
          animation: 'gas-pulse 1.6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 40% 35% at 50% 42%, rgba(239,68,68,0.14) 0%, transparent 60%)',
          animation: 'gas-pulse 1.6s ease-in-out infinite 0.8s',
        }}
      />

      {/* ── Corner scanlines (cinematic tension) ───────────────────── */}
      {[0,1,2,3].map(i => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: 64, height: 64,
            top:    i < 2 ? 24 : 'auto',
            bottom: i >= 2 ? 24 : 'auto',
            left:   i % 2 === 0 ? 24 : 'auto',
            right:  i % 2 !== 0 ? 24 : 'auto',
            border: '2px solid rgba(239,68,68,0.45)',
            borderRight:  i % 2 === 0 ? 'none' : undefined,
            borderLeft:   i % 2 !== 0 ? 'none' : undefined,
            borderBottom: i < 2      ? 'none' : undefined,
            borderTop:    i >= 2     ? 'none' : undefined,
            animation: 'gas-corner-pulse 2s ease-in-out infinite',
          }}
        />
      ))}

      {/* ── Main card ──────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-[2.5rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(30,4,4,0.98) 0%, rgba(20,2,2,0.99) 100%)',
          border: '1.5px solid rgba(239,68,68,0.45)',
          boxShadow: '0 0 0 1px rgba(239,68,68,0.12), 0 40px 100px rgba(180,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Danger stripe top */}
        <div
          className="w-full h-1.5"
          style={{
            background: 'repeating-linear-gradient(90deg, #dc2626 0px, #dc2626 18px, #450a0a 18px, #450a0a 36px)',
            animation: 'danger-stripe 1s linear infinite',
          }}
        />

        <div className="px-8 pt-8 pb-8 space-y-6">
          {/* Icon + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'rgba(220,38,38,0.18)',
                border: '1.5px solid rgba(239,68,68,0.55)',
                boxShadow: '0 0 40px rgba(220,38,38,0.45)',
                animation: 'gas-pulse 1.6s ease-in-out infinite',
              }}
            >
              <AlertTriangle size={38} style={{ color: '#ef4444' }} strokeWidth={2.5} />
            </div>
            <div>
              <h1
                className="text-3xl font-black tracking-tight uppercase"
                style={{ color: '#fca5a5', letterSpacing: '0.08em' }}
              >
                Gas Emergency
              </h1>
              <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(252,165,165,0.6)' }}>
                Dangerous gas level detected — take action immediately
              </p>
            </div>
          </div>

          {/* Live ppm gauge */}
          <div
            className="rounded-2xl px-6 py-4 space-y-3"
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(252,165,165,0.6)' }}>
                Gas Level
              </span>
              <span className="text-2xl font-black tabular-nums" style={{ color: '#fca5a5' }}>
                {gasLevel} <span className="text-sm font-bold opacity-60">ppm</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                  boxShadow: '0 0 12px rgba(220,38,38,0.8)',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: 'rgba(252,165,165,0.4)' }}>
              <span>Safe &lt; {threshold} ppm</span>
              <span className="text-red-400">⚠ Danger Zone</span>
            </div>

            {/* Valve status badge */}
            <div className="flex items-center gap-2 pt-1">
              <span
                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                style={{
                  background: gasValveOpen ? 'rgba(220,38,38,0.25)' : 'rgba(74,222,128,0.12)',
                  border: gasValveOpen ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(74,222,128,0.3)',
                  color: gasValveOpen ? '#fca5a5' : '#4ade80',
                }}
              >
                Gas Valve: {gasValveOpen ? '⚠ Open' : '✓ Closed'}
              </span>
            </div>
          </div>

          {/* Safety instructions */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(252,165,165,0.4)' }}>
              Emergency Steps
            </p>
            {STEPS.map(({ Icon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  <Icon size={13} style={{ color: '#f87171' }} />
                </div>
                <span className="text-[12px] font-bold" style={{ color: 'rgba(252,165,165,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Admin clear button */}
          {isAdmin && (
            <div className="pt-2">
              <p className="text-[9px] font-bold text-center mb-3" style={{ color: 'rgba(252,165,165,0.35)' }}>
                Admin only — only confirm once gas levels have physically dropped below threshold
              </p>
              <button
                onClick={onClear}
                className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.12))',
                  border: '1px solid rgba(74,222,128,0.4)',
                  color: '#4ade80',
                  boxShadow: '0 0 24px rgba(74,222,128,0.15)',
                }}
              >
                ✓ Confirm Safe — Clear Emergency
              </button>
            </div>
          )}

          {!isAdmin && (
            <p className="text-center text-[11px] font-bold" style={{ color: 'rgba(252,165,165,0.4)' }}>
              Contact your home administrator to clear this emergency.
            </p>
          )}
        </div>

        {/* Danger stripe bottom */}
        <div
          className="w-full h-1.5"
          style={{
            background: 'repeating-linear-gradient(90deg, #450a0a 0px, #450a0a 18px, #dc2626 18px, #dc2626 36px)',
            animation: 'danger-stripe 1s linear infinite reverse',
          }}
        />
      </div>

      <style>{`
        @keyframes gas-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes gas-corner-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        @keyframes danger-stripe {
          from { background-position: 0 0; }
          to   { background-position: 36px 0; }
        }
      `}</style>
    </div>
  );
};

export default GasEmergencyOverlay;
