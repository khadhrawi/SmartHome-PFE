/**
 * GasSafetyBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Slides down from the top of any screen when emergencyMode is active.
 * - Not blocking (unlike the overlay): user can still navigate
 * - Shows live ppm reading + flashing red indicator
 * - Admin gets a "Clear" button inline
 * - Disappears automatically when gas level drops below threshold
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Wind } from 'lucide-react';

const GasSafetyBanner = ({ gasLevel, threshold, emergencyMode, isAdmin, onClear }) => {
  const [visible, setVisible] = useState(false);

  /* Animate in/out */
  useEffect(() => {
    if (emergencyMode) {
      // small delay so CSS transition triggers
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [emergencyMode]);

  if (!emergencyMode && !visible) return null;

  return (
    <>
      <style>{`
        @keyframes banner-slide-in {
          from { transform: translateY(-110%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes banner-slide-out {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-110%); opacity: 0; }
        }
        @keyframes gas-dot-blink {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }
        @keyframes banner-stripe-move {
          from { background-position: 0 0; }
          to   { background-position: 28px 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 8000,
          animation: visible
            ? 'banner-slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both'
            : 'banner-slide-out 0.35s ease-in both',
        }}
      >
        {/* Danger stripe top edge */}
        <div style={{
          height: 3,
          background: 'repeating-linear-gradient(90deg, #dc2626 0px, #dc2626 14px, #7f1d1d 14px, #7f1d1d 28px)',
          animation: 'banner-stripe-move 0.8s linear infinite',
        }} />

        {/* Banner body */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(20,3,3,0.97) 0%, rgba(30,5,5,0.97) 100%)',
            borderBottom: '1px solid rgba(239,68,68,0.45)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 40px rgba(220,38,38,0.35)',
          }}
        >
          {/* Blinking dot */}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 12px #ef4444',
              flexShrink: 0,
              animation: 'gas-dot-blink 0.7s ease-in-out infinite',
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(220,38,38,0.2)',
              border: '1px solid rgba(239,68,68,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={16} color="#f87171" />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: '#fca5a5',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginRight: 10,
              }}
            >
              ⚠ CRITICAL: Gas Leak Detected in Kitchen!
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(252,165,165,0.6)',
              }}
            >
              Level: {gasLevel} ppm · Threshold: {threshold} ppm · Evacuate immediately
            </span>
          </div>

          {/* Safety action pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <Wind size={11} color="#f87171" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Open Windows
              </span>
            </div>

            {/* Admin clear button */}
            {isAdmin && (
              <button
                onClick={onClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.4)',
                  color: '#4ade80',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.12)'}
              >
                <X size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Danger stripe bottom edge */}
        <div style={{
          height: 2,
          background: 'repeating-linear-gradient(90deg, #7f1d1d 0px, #7f1d1d 14px, #dc2626 14px, #dc2626 28px)',
          animation: 'banner-stripe-move 0.8s linear infinite reverse',
        }} />
      </div>
    </>
  );
};

export default GasSafetyBanner;
