import React, { useState, useCallback, useMemo, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Plus, Zap, Clock, MapPin, Lightbulb, X, CheckCircle2,
  Thermometer, Bell, Lock, Moon, Sun, Utensils, Film,
  ChevronDown, Sparkles,
} from 'lucide-react';
import AutomationCard from '../components/ScenarioCard';
import { useAutomationEngine } from '../hooks/useAutomationEngine';
import { INITIAL_AUTOMATION_RULES, formatLastTriggered } from '../data/automations';
import { DEVICE_REGISTRY } from '../data/devices';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#E3C598',
};

/* ── Sentence trigger options ──────────────────────────────── */
const TRIGGER_OPTIONS = [
  { value: 'time:23:00', label: 'It is 11:00 PM',        emoji: '🌙', accent: '#818cf8', type: 'time',     triggerTime: '23:00' },
  { value: 'time:07:00', label: 'It is 7:00 AM',         emoji: '☀️', accent: '#f5c842', type: 'time',     triggerTime: '07:00' },
  { value: 'time:20:00', label: 'It is 8:00 PM',         emoji: '🎬', accent: '#a78bfa', type: 'time',     triggerTime: '20:00' },
  { value: 'time:06:30', label: 'It is 6:30 AM',         emoji: '⏰', accent: '#f5c842', type: 'time',     triggerTime: '06:30' },
  { value: 'location:away',   label: 'I leave home',     emoji: '🚶', accent: '#60a5fa', type: 'location',  triggerTime: null },
  { value: 'location:arrive', label: 'I arrive home',    emoji: '🏠', accent: '#4ade80', type: 'location',  triggerTime: null },
  { value: 'sensor:temp_high','label': 'Temperature > 26°C', emoji: '🌡️', accent: '#f97316', type: 'sensor', triggerTime: null },
  { value: 'device:door_open','label': 'Front door opens',   emoji: '🚪', accent: '#f97316', type: 'device', triggerTime: null },
];

/* ── Sentence action options ───────────────────────────────── */
const ACTION_OPTIONS = [
  { value: 'mood:Sleep',     label: 'activate Sleep scene',     emoji: '🌙', accent: '#818cf8' },
  { value: 'mood:Morning',   label: 'activate Morning scene',   emoji: '☀️', accent: '#f5c842' },
  { value: 'mood:Cinematic', label: 'activate Cinematic scene', emoji: '🎬', accent: '#a78bfa' },
  { value: 'mood:Dinner',    label: 'activate Dinner scene',    emoji: '🍽️', accent: '#f97316' },
  { value: 'lock_all',       label: 'lock all doors',           emoji: '🔒', accent: '#60a5fa' },
  { value: 'notify',         label: 'send me a notification',   emoji: '🔔', accent: '#E3C598' },
  { value: 'toggle:light:on',  label: 'turn all lights ON',    emoji: '💡', accent: '#fde68a' },
  { value: 'toggle:light:off', label: 'turn all lights OFF',   emoji: '🌑', accent: '#94a3b8' },
  { value: 'toggle:ac:off',    label: 'turn the AC OFF',       emoji: '❄️', accent: '#7dd3fc' },
];

/* ── Smart defaults: suggest an action based on trigger type ─ */
const SMART_DEFAULT_ACTION = {
  'time:23:00':       'mood:Sleep',
  'time:07:00':       'mood:Morning',
  'time:20:00':       'mood:Cinematic',
  'time:06:30':       'mood:Morning',
  'location:away':    'lock_all',
  'location:arrive':  'toggle:light:on',
  'sensor:temp_high': 'toggle:ac:off',
  'device:door_open': 'notify',
};

/* ── Quick-Add templates ───────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'tpl_good_night',
    title: 'Good Night',
    emoji: '🌙',
    accent: '#818cf8',
    trigger: 'time:23:00',
    action:  'mood:Sleep',
    description: 'Turn all off at 11 PM',
  },
  {
    id: 'tpl_welcome_home',
    title: 'Welcome Home',
    emoji: '🏠',
    accent: '#4ade80',
    trigger: 'location:arrive',
    action:  'toggle:light:on',
    description: 'Unlock door when near',
  },
  {
    id: 'tpl_energy_saver',
    title: 'Energy Saver',
    emoji: '❄️',
    accent: '#7dd3fc',
    trigger: 'sensor:temp_high',
    action:  'toggle:ac:off',
    description: 'Turn off AC if too hot',
  },
];

/* ── Glassmorphic Select pill ──────────────────────────────── */
const GlassPill = ({ value, options, onChange, placeholder, accent = C.gold }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm transition-all duration-300 hover:scale-[1.03] active:scale-95"
        style={{
          background: selected ? `${accent}18` : 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${selected ? accent + '55' : 'rgba(255,255,255,0.14)'}`,
          color: selected ? accent : C.muted,
          backdropFilter: 'blur(12px)',
          boxShadow: selected ? `0 0 18px ${accent}22` : 'none',
          minWidth: 160,
        }}
      >
        {selected ? (
          <><span>{selected.emoji}</span><span className="truncate max-w-[180px]">{selected.label}</span></>
        ) : (
          <span>{placeholder}</span>
        )}
        <ChevronDown size={13} className="ml-auto flex-shrink-0 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden py-1"
          style={{
            background: 'rgba(8,12,26,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            minWidth: 220,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-left transition-all duration-150 hover:bg-white/[0.06]"
              style={{ color: opt.value === value ? opt.accent : C.muted }}
            >
              <span className="text-base">{opt.emoji}</span>
              <span>{opt.label}</span>
              {opt.value === value && <CheckCircle2 size={13} className="ml-auto" style={{ color: opt.accent }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Glassmorphic Toggle ───────────────────────────────────── */
const GlassToggle = ({ isOn, accent = C.gold, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isOn ? 'Disable' : 'Enable'}
    className="relative flex-shrink-0 focus:outline-none"
    style={{ width: 46, height: 26 }}
  >
    <div
      className="absolute inset-0 rounded-full transition-all duration-300"
      style={{
        background: isOn ? `linear-gradient(135deg, ${accent}ee, ${accent}99)` : 'rgba(255,255,255,0.09)',
        border: `1px solid ${isOn ? accent + '55' : 'rgba(255,255,255,0.14)'}`,
        boxShadow: isOn ? `0 0 14px ${accent}55` : 'none',
        backdropFilter: 'blur(8px)',
      }}
    />
    <div
      className="absolute top-[4px] w-[18px] h-[18px] rounded-full shadow-lg transition-all duration-300"
      style={{
        left: isOn ? 24 : 4,
        background: isOn ? '#fff' : 'rgba(255,255,255,0.55)',
        boxShadow: isOn ? `0 2px 8px rgba(0,0,0,0.4), 0 0 6px ${accent}55` : '0 2px 6px rgba(0,0,0,0.3)',
      }}
    />
  </button>
);

/* ══════════════════════════════════════════════════════════════
   RECIPE MODAL — Sentence Builder
══════════════════════════════════════════════════════════════ */
function RecipeModal({ onClose, onCreate }) {
  const [trigger, setTrigger] = useState('');
  const [action,  setAction]  = useState('');
  const [active,  setActive]  = useState(true);
  const [title,   setTitle]   = useState('');

  /* Smart default: auto-suggest action when trigger changes */
  const handleTriggerChange = (val) => {
    setTrigger(val);
    if (!action && SMART_DEFAULT_ACTION[val]) {
      setAction(SMART_DEFAULT_ACTION[val]);
    }
  };

  const applyTemplate = (tpl) => {
    setTrigger(tpl.trigger);
    setAction(tpl.action);
    setTitle(tpl.title);
    setActive(true);
  };

  const triggerOpt   = TRIGGER_OPTIONS.find(o => o.value === trigger);
  const actionOpt    = ACTION_OPTIONS.find(o => o.value === action);
  const accentColor  = triggerOpt?.accent ?? C.gold;
  const canCreate    = trigger && action;

  const handleCreate = () => {
    if (!canCreate) return;

    /* ── Flattened schema: trigger (string), action (string), active (bool) ── */
    const rule = {
      id: `a${Date.now()}`,
      title: title.trim() || `${triggerOpt?.emoji ?? '⚡'} ${triggerOpt?.label ?? 'Rule'}`,
      description: `${triggerOpt?.label} → ${actionOpt?.label}`,
      isEnabled: active,
      /* Flat trigger/action strings for MongoDB */
      trigger: {
        type: triggerOpt?.type ?? 'time',
        label: triggerOpt?.label ?? trigger,
        triggerTime: triggerOpt?.triggerTime ?? null,
        value: trigger,
      },
      condition: { type: 'auto', label: triggerOpt?.label ?? trigger },
      action: {
        type: action.startsWith('mood:') ? 'execute_mood'
             : action.startsWith('toggle:') ? 'toggle_device'
             : action,
        label: actionOpt?.label ?? action,
        mood: action.startsWith('mood:') ? action.split(':')[1] : undefined,
        value: action,
      },
      lastTriggered: null,
      runCount: 0,
      accentColor,
      emoji: triggerOpt?.emoji ?? '⚡',
    };

    onCreate(rule);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,20,0.85)', backdropFilter: 'blur(28px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-xl rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(14,18,36,0.98) 0%, rgba(8,12,26,0.99) 100%)',
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px ${accentColor}12, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
            transform: 'translate(35%,-35%)',
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-7 pt-6 pb-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}
            >
              <Sparkles size={17} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: C.text }}>
                New Recipe
              </h2>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: C.muted }}>
                Build your automation in one sentence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick-Add Templates */}
        <div className="px-7 pt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: C.dimmed }}>
            Quick-Add Templates
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all duration-300 hover:scale-[1.04] active:scale-95"
                style={{
                  background: trigger === tpl.trigger && action === tpl.action
                    ? `${tpl.accent}18`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${trigger === tpl.trigger && action === tpl.action ? tpl.accent + '45' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: trigger === tpl.trigger && action === tpl.action
                    ? `0 0 18px ${tpl.accent}22` : 'none',
                }}
              >
                <span className="text-xl">{tpl.emoji}</span>
                <span className="text-[11px] font-black" style={{ color: tpl.accent }}>{tpl.title}</span>
                <span className="text-[9px] font-medium leading-tight" style={{ color: C.dimmed }}>
                  {tpl.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── SENTENCE BUILDER ── */}
        <div className="px-7 pt-5 pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-4" style={{ color: C.dimmed }}>
            Or build your own
          </p>

          {/* Sentence row */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* "When ___" */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-sm font-black"
                style={{ color: accentColor, minWidth: 56, letterSpacing: '0.04em' }}
              >
                When
              </span>
              <GlassPill
                value={trigger}
                options={TRIGGER_OPTIONS}
                onChange={handleTriggerChange}
                placeholder="choose a trigger…"
                accent={accentColor}
              />
            </div>

            {/* Connector */}
            <div className="flex items-center gap-2 pl-1" style={{ opacity: trigger ? 1 : 0.3, transition: 'opacity 0.3s' }}>
              <div className="w-px h-5 ml-6" style={{ background: `${accentColor}44` }} />
            </div>

            {/* "→ perform ___" */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-sm font-black"
                style={{ color: accentColor, minWidth: 56, letterSpacing: '0.04em' }}
              >
                → do
              </span>
              <GlassPill
                value={action}
                options={ACTION_OPTIONS}
                onChange={setAction}
                placeholder="choose an action…"
                accent={actionOpt?.accent ?? accentColor}
              />
            </div>

            {/* Live sentence preview */}
            {trigger && action && (
              <div
                className="mt-1 px-4 py-3 rounded-xl text-[12px] font-bold"
                style={{
                  background: `${accentColor}0d`,
                  border: `1px solid ${accentColor}22`,
                  color: C.muted,
                }}
              >
                <span style={{ color: accentColor }}>✦</span>{' '}
                When <strong style={{ color: C.text }}>{triggerOpt?.label}</strong>,{' '}
                <strong style={{ color: actionOpt?.accent ?? accentColor }}>{actionOpt?.label}</strong>.
              </div>
            )}
          </div>
        </div>

        {/* Name + Active toggle */}
        <div className="px-7 pt-4 pb-2 grid grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>
              Rule Name (optional)
            </p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={triggerOpt ? `${triggerOpt.emoji} ${triggerOpt.label}` : 'My automation…'}
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: C.text,
                borderRadius: '1rem',
                padding: '0.65rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: C.dimmed }}>
              Active
            </p>
            <GlassToggle
              isOn={active}
              accent={accentColor}
              onToggle={() => setActive(a => !a)}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between px-7 py-5 gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: canCreate
                ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                : 'rgba(255,255,255,0.08)',
              color: canCreate ? '#08100D' : C.dimmed,
              boxShadow: canCreate ? `0 8px 24px ${accentColor}45` : 'none',
            }}
          >
            <CheckCircle2 size={15} />
            Create Recipe
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stats strip ────────────────────────────────────────────── */
function StatsStrip({ rules }) {
  const enabled = Array.isArray(rules) ? rules.filter(r => r.isEnabled).length : 0;
  const total   = Array.isArray(rules) ? rules.length : 0;
  const ran24h  = Array.isArray(rules) ? rules.filter(r =>
    r.lastTriggered && Date.now() - new Date(r.lastTriggered).getTime() < 86_400_000
  ).length : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Recipes', value: total,   accent: '#E3C598' },
        { label: 'Active',        value: enabled, accent: '#4ade80' },
        { label: 'Ran Today',     value: ran24h,  accent: '#a78bfa' },
      ].map(s => (
        <div
          key={s.label}
          className="rounded-2xl px-5 py-4 flex flex-col gap-1"
          style={{ background: `${s.accent}0a`, border: `1px solid ${s.accent}22` }}
        >
          <span className="text-2xl font-black" style={{ color: s.accent }}>{s.value}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.dimmed }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENARIOS / AUTOMATIONS PAGE
══════════════════════════════════════════════════════════════ */
const Scenarios = () => {
  /* ── Context ── */
  const { user, token } = useContext(AuthContext);

  const [rules, setRules]           = useState(INITIAL_AUTOMATION_RULES);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId]   = useState(null);
  const [lastToast, setLastToast]   = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLoading, setIsLoading]   = useState(false);
  const [sceneToast, setSceneToast] = useState(null);

  /* ── Scene activation ── */
  const handleScene = useCallback(async (sceneName) => {
    if (!sceneName || isLoading) return;
    setIsLoading(true);
    try {
      await axios.post(
        '/api/scenes/activate',
        { scene: sceneName },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSceneToast(`✦ ${sceneName} scene activated`);
    } catch (err) {
      console.warn('[Scenes] activate failed:', err?.response?.data?.message || err.message);
      setSceneToast(`✦ ${sceneName} scene queued`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSceneToast(null), 3000);
    }
  }, [isLoading, token]);

  /* ── Logic engine ── */
  const handleTrigger = useCallback((ruleId, action) => {
    setRunningId(ruleId);
    setLastToast({ ruleId, action });
    setRules(prev => prev.map(r =>
      r.id === ruleId
        ? { ...r, lastTriggered: new Date().toISOString(), runCount: (r.runCount ?? 0) + 1 }
        : r
    ));
    setTimeout(() => {
      setRunningId(null);
      setTimeout(() => setLastToast(null), 3500);
    }, 2000);
  }, []);

  const homeState = useMemo(() => ({ lights: [], doors: [], climate: [], awayMode: false }), []);
  useAutomationEngine({ rules, homeState, onTrigger: handleTrigger });

  /* ── Mutations ── */
  const toggleRule = id =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  const deleteRule = id =>
    setRules(prev => prev.filter(r => r.id !== id));
  const createRule = rule =>
    setRules(prev => [rule, ...prev]);

  /* ── Filter ── */
  const FILTERS = ['All', 'Active', 'Inactive', 'Time', 'Device', 'Sensor'];
  const filteredRules = useMemo(() => {
    if (!Array.isArray(rules)) return [];
    switch (activeFilter) {
      case 'Active':   return rules.filter(r => r.isEnabled);
      case 'Inactive': return rules.filter(r => !r.isEnabled);
      case 'Time':     return rules.filter(r => r.trigger?.type === 'time');
      case 'Device':   return rules.filter(r => r.trigger?.type === 'device');
      case 'Sensor':   return rules.filter(r => r.trigger?.type === 'sensor');
      default:         return rules;
    }
  }, [rules, activeFilter]);

  const enabledCount = Array.isArray(rules) ? rules.filter(r => r.isEnabled).length : 0;

  /* ── Loading guard ── */
  if (!user) return (
    <div className="flex items-center justify-center py-32" style={{ color: C.muted }}>
      <p className="text-sm font-bold">Loading automations…</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* Modal */}
      {showCreate && (
        <RecipeModal onClose={() => setShowCreate(false)} onCreate={createRule} />
      )}

      {/* Scene toast */}
      {sceneToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3 rounded-full"
          style={{
            background: 'rgba(15,10,4,0.92)',
            border: '1px solid rgba(227,197,152,0.35)',
            backdropFilter: 'blur(25px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.65), 0 0 20px rgba(227,197,152,0.12)',
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: C.gold, boxShadow: `0 0 8px ${C.gold}`, animation: 'warm-pulse 1.2s ease-in-out infinite' }} />
          <p className="text-sm font-black" style={{ color: C.gold }}>{sceneToast}</p>
        </div>
      )}

      {/* Automation-fire toast */}
      {lastToast && (
        <div
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-4 px-7 py-3.5 rounded-full"
          style={{
            background: 'rgba(15,10,4,0.90)',
            border: '1px solid rgba(74,222,128,0.30)',
            backdropFilter: 'blur(25px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.65), 0 0 20px rgba(74,222,128,0.10)',
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'warm-pulse 1.2s ease-in-out infinite' }} />
          <p className="text-sm font-black" style={{ color: C.text }}>
            ⚡ Recipe fired —{' '}
            <span style={{ color: '#4ade80' }}>
              {Array.isArray(rules) ? rules.find(r => r.id === lastToast.ruleId)?.title ?? 'Rule' : 'Rule'}
            </span>
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>
            Automations
          </h2>
          <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
            {enabledCount} active recipe{enabledCount !== 1 ? 's' : ''} — your home thinks for itself.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black transition-all hover:scale-[1.03] active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${C.gold}, #D4AF37)`,
            color: '#08100D',
            boxShadow: `0 8px 25px rgba(227,197,152,0.40)`,
          }}
        >
          <Plus size={16} strokeWidth={3} />
          New Recipe
        </button>
      </div>

      {/* ── Stats ── */}
      <StatsStrip rules={rules} />

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2">
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          const count = f === 'All' ? rules.length
            : f === 'Active'   ? rules.filter(r => r.isEnabled).length
            : f === 'Inactive' ? rules.filter(r => !r.isEnabled).length
            : rules.filter(r => r.trigger?.type === f.toLowerCase()).length;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0 flex items-center gap-1.5"
              style={{
                background: isActive ? `${C.gold}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? C.gold + '55' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? C.gold : C.muted,
                boxShadow: isActive ? `0 0 16px ${C.gold}20` : 'none',
              }}
            >
              {f}
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? `${C.gold}25` : 'rgba(255,255,255,0.07)',
                  color: isActive ? C.gold : C.dimmed,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Recipe cards grid ── */}
      {Array.isArray(filteredRules) && filteredRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRules.map(rule => rule && rule.id ? (
            <AutomationCard
              key={rule.id}
              rule={rule}
              onToggle={toggleRule}
              onDelete={deleteRule}
              isRunning={runningId === rule.id}
            />
          ) : null)}
        </div>
      ) : (
        <div
          className="py-28 flex flex-col items-center gap-5 text-center rounded-[2rem] border border-dashed"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            ✨
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: C.muted }}>
              {activeFilter === 'All' ? 'No recipes yet' : `No ${activeFilter} recipes`}
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: C.dimmed }}>
              {activeFilter === 'All'
                ? 'Create your first recipe and let your home run itself.'
                : `Try a different filter or create a new recipe.`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}35`, color: C.gold }}
          >
            + New Recipe
          </button>
        </div>
      )}
    </div>
  );
};

export default Scenarios;
