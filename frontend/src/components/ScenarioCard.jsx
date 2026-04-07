import { Trash2, Clock, Hash } from 'lucide-react';
import { formatLastTriggered } from '../data/automations';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#E3C598',
};

/* ─────────────────────────────────────────────────────────────
   Haptic feedback helper (mobile only)
   ───────────────────────────────────────────────────────────── */
const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10); // light 10ms tap
  }
};

/* ─────────────────────────────────────────────────────────────
   Glassmorphic Toggle Switch
   ───────────────────────────────────────────────────────────── */
const GlassToggle = ({ isOn, accent, onToggle, ruleId }) => (
  <button
    onClick={() => {
      triggerHaptic();
      onToggle(ruleId);
    }}
    aria-label={isOn ? 'Disable rule' : 'Enable rule'}
    className="relative flex-shrink-0 focus:outline-none"
    style={{ width: 46, height: 26 }}
  >
    {/* Track */}
    <div
      className="absolute inset-0 rounded-full transition-all duration-400"
      style={{
        background: isOn
          ? `linear-gradient(135deg, ${accent}ee, ${accent}99)`
          : 'rgba(255,255,255,0.09)',
        border: `1px solid ${isOn ? accent + '55' : 'rgba(255,255,255,0.14)'}`,
        boxShadow: isOn
          ? `0 0 14px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.15)`
          : `inset 0 1px 0 rgba(255,255,255,0.07)`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
    {/* Thumb */}
    <div
      className="absolute top-[4px] w-[18px] h-[18px] rounded-full shadow-lg"
      style={{
        left: isOn ? 24 : 4,
        background: isOn ? '#fff' : 'rgba(255,255,255,0.55)',
        boxShadow: isOn
          ? `0 2px 8px rgba(0,0,0,0.4), 0 0 6px ${accent}55`
          : '0 2px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  </button>
);

/* ─────────────────────────────────────────────────────────────
   AutomationCard
   ───────────────────────────────────────────────────────────── */
const AutomationCard = ({ rule, onToggle, onDelete, isRunning }) => {
  const {
    title, description, isEnabled, trigger, condition, action,
    lastTriggered, runCount, accentColor, emoji,
  } = rule;

  const accent       = accentColor ?? '#E3C598';
  const lastRanLabel = formatLastTriggered(lastTriggered);
  const isRecent     = lastTriggered &&
    (Date.now() - new Date(lastTriggered).getTime()) < 3_600_000;

  /* ── Glow: full when active, removed when inactive (card looks "dead") ── */
  const glowFull   = `0 20px 50px rgba(0,0,0,0.38), 0 0 32px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.07)`;
  const glowNone   = `0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)`;

  /* ── Icon desaturation: grayscale filter when inactive ── */
  const iconFilter = isEnabled ? 'none' : 'grayscale(1) brightness(0.6)';

  return (
    <div
      className="group relative rounded-[2rem] flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1"
      style={{
        background: isEnabled
          ? `linear-gradient(145deg, ${accent}0d 0%, rgba(255,255,255,0.025) 100%)`
          : 'rgba(255,255,255,0.018)',
        /* Border glow removed entirely when inactive */
        border: `1px solid ${isEnabled ? accent + '33' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        /* Box-shadow: full when active, stripped away when inactive */
        boxShadow: isEnabled ? glowFull : glowNone,
        minHeight: 264,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── Ambient corner glow (active only) ── */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, ${accent}1a 0%, transparent 70%)`,
          transform: 'translate(40%, -40%)',
          opacity: isEnabled ? 0.65 : 0,
        }}
      />

      {/* ══════════════════════════════════════
           CARD BODY — opacity dims to 0.5 when inactive
         ══════════════════════════════════════ */}
      <div
        className="p-6 flex flex-col gap-4 relative z-10 flex-1 transition-opacity duration-500"
        style={{ opacity: isEnabled ? 1 : 0.5 }}
      >

        {/* ── TOP HEADER ROW ── */}
        <div className="flex items-center justify-between gap-3">

          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Emoji badge */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-400"
              style={{
                background: isEnabled ? `${accent}1a` : 'rgba(255,255,255,0.055)',
                border: `1px solid ${isEnabled ? accent + '38' : 'rgba(255,255,255,0.09)'}`,
                boxShadow: isEnabled ? `0 0 18px ${accent}1f` : 'none',
                /* Grayscale / muted when inactive */
                filter: iconFilter,
                transition: 'all 0.4s ease',
              }}
            >
              {isRunning
                ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                : emoji}
            </div>

            {/* Title + subtitle */}
            <div className="min-w-0">
              <h3
                className="text-[15px] font-black tracking-tight leading-tight truncate"
                style={{ color: isEnabled ? C.text : C.muted }}
              >
                {title}
              </h3>
              <p
                className="text-[10.5px] font-medium mt-0.5 truncate"
                style={{ color: C.dimmed }}
              >
                {description}
              </p>
            </div>
          </div>

          {/* Right: Glassmorphic Toggle + Delete */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <GlassToggle
              isOn={isEnabled}
              accent={accent}
              onToggle={onToggle}
              ruleId={rule.id}
            />

            {/*
              Trash icon — low opacity by default, brightens on hover.
              The opacity is reset to 1 so it isn't double-dimmed by the
              parent's inactive overlay; the parent already dims everything.
            */}
            <button
              onClick={() => onDelete(rule.id)}
              aria-label="Delete rule"
              className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: 'rgba(248,249,250,0.18)',
                opacity: 1, /* intentionally full opacity — hover JS handles brightness */
                transition: 'color 0.25s ease, background 0.25s ease, border-color 0.25s ease, transform 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.14)';
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(248,249,250,0.18)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── CONDENSED IF → THEN LOGIC STRIP ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isEnabled ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.12)',
            border: `1px solid ${isEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
          }}
        >
          {/* IF row */}
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            {/*
              Label "IF" — Champagne Gold, ~80% of the value text-size.
              Value is text-[10px] → label is text-[8px] (80%).
            */}
            <span
              style={{
                fontSize: '8px',           /* 80% of 10px value size */
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                width: '1.5rem',
                flexShrink: 0,
                lineHeight: 1,
                color: C.gold,             /* Champagne Gold ONLY for labels */
              }}
            >
              IF
            </span>
            <div className="flex flex-col min-w-0">
              {/* Value text — larger */}
              <span
                className="text-[10px] font-bold truncate leading-snug"
                style={{ color: isEnabled ? C.text : C.muted }}
              >
                {trigger.label}
              </span>
              {condition?.label && (
                <span
                  className="text-[9px] font-medium truncate leading-snug"
                  style={{ color: C.dimmed }}
                >
                  {condition.label}
                </span>
              )}
            </div>
          </div>

          {/* Micro-divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* THEN row */}
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            {/* Label "THEN" same style — Champagne Gold, 80% of value size */}
            <span
              style={{
                fontSize: '8px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                width: '1.5rem',
                flexShrink: 0,
                lineHeight: 1,
                color: C.gold,
              }}
            >
              THEN
            </span>
            <span
              className="text-[10px] font-bold truncate leading-snug"
              style={{ color: isEnabled ? C.text : C.muted }}
            >
              {action.label}
            </span>
          </div>
        </div>

        {/* ── BOTTOM META-BAR ── */}
        <div className="flex items-center justify-between mt-auto" style={{ opacity: 0.50 }}>
          {/* Last ran + run count */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock
                size={9}
                style={{ color: isRecent ? '#4ade80' : C.dimmed, flexShrink: 0 }}
              />
              <span
                className="text-[8.5px] font-medium"
                style={{ color: isRecent ? '#4ade8099' : C.dimmed }}
              >
                {lastRanLabel}
              </span>
            </div>

            {runCount > 0 && (
              <div className="flex items-center gap-1">
                <Hash size={8} style={{ color: C.dimmed }} />
                <span className="text-[8.5px] font-medium" style={{ color: C.dimmed }}>
                  {runCount}× runs
                </span>
              </div>
            )}
          </div>

          {/* Running pulse badge */}
          {isRunning && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: `${accent}18`, border: `1px solid ${accent}3a` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: accent,
                  animation: 'warm-pulse 0.8s ease-in-out infinite',
                }}
              />
              <span
                className="text-[7.5px] font-black uppercase tracking-widest"
                style={{ color: accent }}
              >
                Running
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Accent status bar (bottom edge) ── */}
      <div
        className="h-[3px] w-full transition-all duration-700"
        style={{
          background: isEnabled
            ? `linear-gradient(90deg, ${accent}cc, ${accent}44)`
            : 'rgba(255,255,255,0.04)',
        }}
      />
    </div>
  );
};

export default AutomationCard;
