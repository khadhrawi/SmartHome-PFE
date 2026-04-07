import { useState, useCallback, useMemo } from 'react';
import {
  Plus, Zap, Clock, Cpu, MapPin, Lightbulb,
  ChevronRight, ChevronLeft, X, CheckCircle2,
  ToggleLeft, Thermometer, Bell, Lock,
} from 'lucide-react';
import AutomationCard from '../components/ScenarioCard';
import { useAutomationEngine } from '../hooks/useAutomationEngine';
import {
  INITIAL_AUTOMATION_RULES,
  TRIGGER_TYPES,
  CONDITIONS_BY_TRIGGER,
  ACTION_TYPES,
  formatLastTriggered,
} from '../data/automations';
import { DEVICE_REGISTRY } from '../data/devices';

/* ── Design tokens ──────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#E3C598',
};

/* ── Input style helper ─────────────────────────────────────── */
const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: C.text,
  borderRadius: '1rem',
  padding: '0.75rem 1rem',
  width: '100%',
  fontSize: '0.875rem',
  fontWeight: 600,
  outline: 'none',
};

/* ── Section label ──────────────────────────────────────────── */
const Label = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: C.dimmed }}>
    {children}
  </p>
);

/* ── Trigger icon map ───────────────────────────────────────── */
const TRIGGER_ICONS = {
  time:     Clock,
  device:   Lightbulb,
  sensor:   Thermometer,
  location: MapPin,
};

/* ── Action icon map ────────────────────────────────────────── */
const ACTION_ICONS = {
  execute_mood:   Zap,
  toggle_device:  ToggleLeft,
  set_temperature: Thermometer,
  lock_all:       Lock,
  notify:         Bell,
};

/* ── Accent map per trigger type ────────────────────────────── */
const TRIGGER_ACCENTS = {
  time:     '#f5c842',
  device:   '#E3C598',
  sensor:   '#f97316',
  location: '#4ade80',
};

/* ── Stats strip ────────────────────────────────────────────── */
function StatsStrip({ rules }) {
  const enabled  = rules.filter(r => r.isEnabled).length;
  const total    = rules.length;
  const ran24h   = rules.filter(r =>
    r.lastTriggered && Date.now() - new Date(r.lastTriggered).getTime() < 86_400_000
  ).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Rules',   value: total,   accent: '#E3C598' },
        { label: 'Active',        value: enabled, accent: '#4ade80' },
        { label: 'Ran Today',     value: ran24h,  accent: '#a78bfa' },
      ].map(s => (
        <div
          key={s.label}
          className="rounded-2xl px-5 py-4 flex flex-col gap-1"
          style={{
            background: `${s.accent}0a`,
            border: `1px solid ${s.accent}22`,
          }}
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
   3-STEP CREATE MODAL
══════════════════════════════════════════════════════════════ */
function CreateModal({ onClose, onCreate }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState({
    title: '',
    description: '',
    /* Step 1 – Trigger */
    triggerType:   'time',
    triggerTime:   '07:00',
    triggerDevice: DEVICE_REGISTRY[0]?.id ?? '',
    triggerDeviceName: DEVICE_REGISTRY[0]?.name ?? '',
    /* Step 2 – Condition */
    conditionType:  'time_match',
    conditionValue: '26',
    /* Step 3 – Action */
    actionType:     'execute_mood',
    actionMood:     'Sleep',
    actionDevice:   DEVICE_REGISTRY[0]?.id ?? '',
    actionDeviceName: DEVICE_REGISTRY[0]?.name ?? '',
    actionTargetStatus: 'on',
    actionTargetTemp:   22,
    /* Meta */
    emoji: '⚡',
    accentColor: '#E3C598',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  /* Update accent/emoji when trigger type changes */
  const selectTriggerType = (type) => {
    const found = TRIGGER_TYPES.find(t => t.value === type);
    set('triggerType', type);
    if (found) {
      set('accentColor', found.accent);
      set('emoji', found.emoji);
    }
    // Reset condition to first valid option
    const conds = CONDITIONS_BY_TRIGGER[type] ?? [];
    if (conds.length) set('conditionType', conds[0].value);
  };

  const handleSubmit = () => {
    /* Build the trigger label */
    let triggerLabel = '';
    if (form.triggerType === 'time') triggerLabel = `Every day at ${form.triggerTime}`;
    else if (form.triggerType === 'location') triggerLabel = 'When leaving / arriving home';
    else triggerLabel = form.triggerDeviceName;

    /* Build condition label */
    const condOpts = CONDITIONS_BY_TRIGGER[form.triggerType] ?? [];
    const condLabel = condOpts.find(c => c.value === form.conditionType)?.label ?? form.conditionType;

    /* Build action label */
    let actionLabel = '';
    if (form.actionType === 'execute_mood')    actionLabel = `Activate ${form.actionMood} mood`;
    else if (form.actionType === 'toggle_device') actionLabel = `Turn ${form.actionTargetStatus} ${form.actionDeviceName}`;
    else if (form.actionType === 'set_temperature') actionLabel = `Set temperature to ${form.actionTargetTemp}°C`;
    else if (form.actionType === 'lock_all')   actionLabel = 'Lock all doors';
    else if (form.actionType === 'notify')     actionLabel = 'Send home notification';

    const newRule = {
      id: `a${Date.now()}`,
      title: form.title || `${form.emoji} New Automation`,
      description: form.description || triggerLabel,
      isEnabled: true,
      trigger: {
        type: form.triggerType,
        triggerTime: form.triggerTime,
        deviceId: form.triggerDevice,
        deviceName: form.triggerDeviceName,
        label: triggerLabel,
      },
      condition: {
        type: form.conditionType,
        value: form.conditionValue,
        label: condLabel,
      },
      action: {
        type: form.actionType,
        mood: form.actionMood,
        deviceId: form.actionDevice,
        deviceName: form.actionDeviceName,
        targetStatus: form.actionTargetStatus,
        targetTemp: form.actionTargetTemp,
        label: actionLabel,
      },
      lastTriggered: null,
      runCount: 0,
      accentColor: form.accentColor,
      emoji: form.emoji,
    };

    onCreate(newRule);
    onClose();
  };

  const totalSteps = 3;
  const canNext = (
    (step === 1) ||
    (step === 2) ||
    (step === 3 && (form.title.trim() !== '' || true))
  );

  const stepLabels = ['Trigger', 'Condition', 'Action'];

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,16,13,0.82)', backdropFilter: 'blur(25px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(26,31,29,0.97) 0%, rgba(13,26,21,0.99) 100%)',
          border: `1px solid ${form.accentColor}35`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px ${form.accentColor}18, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${form.accentColor}15 0%, transparent 70%)`,
            transform: 'translate(35%, -35%)',
          }}
        />

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: C.text }}>
              New Automation
            </h2>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: C.muted }}>
              Step {step} of {totalSteps} — {stepLabels[step - 1]}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {stepLabels.map((l, i) => (
              <div
                key={l}
                className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black transition-all duration-300"
                style={{
                  background: i + 1 === step
                    ? form.accentColor
                    : i + 1 < step
                    ? `${form.accentColor}35`
                    : 'rgba(255,255,255,0.07)',
                  color: i + 1 === step ? '#08100D' : i + 1 < step ? form.accentColor : C.dimmed,
                  boxShadow: i + 1 === step ? `0 0 12px ${form.accentColor}70` : 'none',
                }}
              >
                {i + 1 < step ? <CheckCircle2 size={13} /> : i + 1}
              </div>
            ))}
            <button
              onClick={onClose}
              className="ml-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Step Content ── */}
        <div className="px-7 py-6 space-y-5 min-h-[340px]">

          {/* ─────────────── STEP 1: TRIGGER ─────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold" style={{ color: C.muted }}>
                What event should <strong style={{ color: C.text }}>start</strong> this automation?
              </p>

              {/* Trigger type grid */}
              <div className="grid grid-cols-2 gap-3">
                {TRIGGER_TYPES.map(t => {
                  const TIcon = TRIGGER_ICONS[t.value] ?? Zap;
                  const isActive = form.triggerType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => selectTriggerType(t.value)}
                      className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        background: isActive ? `${t.accent}18` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? t.accent + '55' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: isActive ? `0 0 18px ${t.accent}20` : 'none',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                        style={{
                          background: isActive ? `${t.accent}22` : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isActive ? t.accent + '40' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {t.emoji}
                      </div>
                      <div>
                        <p className="text-[12px] font-black" style={{ color: isActive ? t.accent : C.text }}>
                          {t.label}
                        </p>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: C.dimmed }}>
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Time picker */}
              {form.triggerType === 'time' && (
                <div>
                  <Label>Trigger Time</Label>
                  <input
                    type="time"
                    value={form.triggerTime}
                    onChange={e => set('triggerTime', e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </div>
              )}

              {/* Device picker */}
              {(form.triggerType === 'device' || form.triggerType === 'sensor') && (
                <div>
                  <Label>Select Device / Sensor</Label>
                  <select
                    value={form.triggerDevice}
                    onChange={e => {
                      const dev = DEVICE_REGISTRY.find(d => d.id === e.target.value);
                      set('triggerDevice', e.target.value);
                      set('triggerDeviceName', dev?.name ?? '');
                    }}
                    style={{ ...inputStyle, appearance: 'none' }}
                  >
                    {DEVICE_REGISTRY
                      .filter(d =>
                        form.triggerType === 'sensor'
                          ? d.type === 'climate'
                          : true
                      )
                      .map(d => (
                        <option key={d.id} value={d.id} style={{ background: '#0D1A15' }}>
                          {d.name} ({d.room})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ────────────── STEP 2: CONDITION ──────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold" style={{ color: C.muted }}>
                Under what <strong style={{ color: C.text }}>condition</strong> should it fire?
              </p>

              {/* Condition type */}
              <div>
                <Label>Condition</Label>
                <div className="grid grid-cols-1 gap-2">
                  {(CONDITIONS_BY_TRIGGER[form.triggerType] ?? []).map(c => {
                    const isActive = form.conditionType === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => set('conditionType', c.value)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: isActive ? `${form.accentColor}18` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? form.accentColor + '50' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <span className="text-sm font-bold" style={{ color: isActive ? form.accentColor : C.muted }}>
                          {c.label}
                        </span>
                        {isActive && <CheckCircle2 size={14} style={{ color: form.accentColor }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Threshold value (sensor only) */}
              {form.triggerType === 'sensor' && (
                <div>
                  <Label>Threshold Value (°C or %)</Label>
                  <input
                    type="number"
                    value={form.conditionValue}
                    onChange={e => set('conditionValue', e.target.value)}
                    placeholder="e.g. 26"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Summary preview */}
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: `${form.accentColor}0a`, border: `1px solid ${form.accentColor}22` }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: C.dimmed }}>
                  Preview
                </p>
                <p className="text-sm font-bold" style={{ color: C.text }}>
                  <span style={{ color: form.accentColor }}>IF </span>
                  {form.triggerType === 'time'
                    ? `time is ${form.triggerTime}`
                    : form.triggerDeviceName || 'selected device'}{' '}
                  → {(CONDITIONS_BY_TRIGGER[form.triggerType] ?? []).find(c => c.value === form.conditionType)?.label}
                  {form.triggerType === 'sensor' && ` ${form.conditionValue}`}
                </p>
              </div>
            </div>
          )}

          {/* ─────────────── STEP 3: ACTION + META ─────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold" style={{ color: C.muted }}>
                What should <strong style={{ color: C.text }}>happen</strong> when triggered?
              </p>

              {/* Action type */}
              <div>
                <Label>Action</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ACTION_TYPES.map(a => {
                    const AIcon = ACTION_ICONS[a.value] ?? Zap;
                    const isActive = form.actionType === a.value;
                    return (
                      <button
                        key={a.value}
                        onClick={() => set('actionType', a.value)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: isActive ? `${a.accent}18` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? a.accent + '50' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <span className="text-lg">{a.emoji}</span>
                        <span className="text-sm font-bold flex-1" style={{ color: isActive ? a.accent : C.muted }}>
                          {a.label}
                        </span>
                        {isActive && <CheckCircle2 size={14} style={{ color: a.accent }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-options */}
              {form.actionType === 'execute_mood' && (
                <div>
                  <Label>Choose Mood Scene</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Sleep', 'Morning', 'Cinematic', 'Dinner'].map(m => (
                      <button
                        key={m}
                        onClick={() => set('actionMood', m)}
                        className="py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: form.actionMood === m ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${form.actionMood === m ? '#a78bfa55' : 'rgba(255,255,255,0.08)'}`,
                          color: form.actionMood === m ? '#a78bfa' : C.muted,
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.actionType === 'toggle_device' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Device</Label>
                    <select
                      value={form.actionDevice}
                      onChange={e => {
                        const dev = DEVICE_REGISTRY.find(d => d.id === e.target.value);
                        set('actionDevice', e.target.value);
                        set('actionDeviceName', dev?.name ?? '');
                      }}
                      style={{ ...inputStyle, appearance: 'none', fontSize: '0.75rem' }}
                    >
                      {DEVICE_REGISTRY.map(d => (
                        <option key={d.id} value={d.id} style={{ background: '#0D1A15' }}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>State</Label>
                    <select
                      value={form.actionTargetStatus}
                      onChange={e => set('actionTargetStatus', e.target.value)}
                      style={{ ...inputStyle, appearance: 'none' }}
                    >
                      <option value="on"  style={{ background: '#0D1A15' }}>Turn ON</option>
                      <option value="off" style={{ background: '#0D1A15' }}>Turn OFF</option>
                    </select>
                  </div>
                </div>
              )}

              {form.actionType === 'set_temperature' && (
                <div>
                  <Label>Target Temperature (°C)</Label>
                  <input
                    type="number"
                    min={16} max={30}
                    value={form.actionTargetTemp}
                    onChange={e => set('actionTargetTemp', Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Name + description */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label>Rule Name</Label>
                  <input
                    type="text"
                    placeholder="e.g. Night Routine"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <input
                    type="text"
                    placeholder="Short summary…"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div
          className="flex items-center justify-between px-7 py-5 gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 ml-auto"
              style={{
                background: `linear-gradient(135deg, ${form.accentColor}, ${form.accentColor}bb)`,
                color: '#08100D',
                boxShadow: `0 6px 20px ${form.accentColor}40`,
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95 ml-auto"
              style={{
                background: `linear-gradient(135deg, ${form.accentColor}, ${form.accentColor}bb)`,
                color: '#08100D',
                boxShadow: `0 8px 24px ${form.accentColor}45`,
              }}
            >
              <CheckCircle2 size={15} /> Create Rule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENARIOS / AUTOMATIONS PAGE
══════════════════════════════════════════════════════════════ */
const Scenarios = () => {
  const [rules, setRules]           = useState(INITIAL_AUTOMATION_RULES);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId]   = useState(null);
  const [lastToast, setLastToast]   = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  /* ── Logic engine ── */
  const handleTrigger = useCallback((ruleId, action) => {
    setRunningId(ruleId);
    setLastToast({ ruleId, action });

    /* Mark as triggered + increment run count */
    setRules(prev => prev.map(r =>
      r.id === ruleId
        ? { ...r, lastTriggered: new Date().toISOString(), runCount: (r.runCount ?? 0) + 1 }
        : r
    ));

    /* Clear running state after 2 s */
    setTimeout(() => {
      setRunningId(null);
      setTimeout(() => setLastToast(null), 3500);
    }, 2000);
  }, []);

  /* Minimal homeState stub — in production, lift from context */
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
    switch (activeFilter) {
      case 'Active':   return rules.filter(r => r.isEnabled);
      case 'Inactive': return rules.filter(r => !r.isEnabled);
      case 'Time':     return rules.filter(r => r.trigger.type === 'time');
      case 'Device':   return rules.filter(r => r.trigger.type === 'device');
      case 'Sensor':   return rules.filter(r => r.trigger.type === 'sensor');
      default:         return rules;
    }
  }, [rules, activeFilter]);

  const enabledCount = rules.filter(r => r.isEnabled).length;

  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* ── Create modal ── */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createRule}
        />
      )}

      {/* ── Toast notification ── */}
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
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'warm-pulse 1.2s ease-in-out infinite' }}
          />
          <p className="text-sm font-black" style={{ color: C.text }}>
            ⚡ Automation fired —{' '}
            <span style={{ color: '#4ade80' }}>
              {rules.find(r => r.id === lastToast.ruleId)?.title ?? 'Rule'}
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
            {enabledCount} active rule{enabledCount !== 1 ? 's' : ''} running — your home thinks for itself.
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
          New Automation
        </button>
      </div>

      {/* ── Stats strip ── */}
      <StatsStrip rules={rules} />

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2">
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0"
              style={{
                background: isActive ? `${C.gold}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? C.gold + '55' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? C.gold : C.muted,
                boxShadow: isActive ? `0 0 16px ${C.gold}20` : 'none',
              }}
            >
              {f}
              <span
                className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? `${C.gold}25` : 'rgba(255,255,255,0.07)',
                  color: isActive ? C.gold : C.dimmed,
                }}
              >
                {f === 'All'      ? rules.length :
                 f === 'Active'   ? rules.filter(r => r.isEnabled).length :
                 f === 'Inactive' ? rules.filter(r => !r.isEnabled).length :
                 rules.filter(r => r.trigger.type === f.toLowerCase()).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Automation cards grid ── */}
      {filteredRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRules.map(rule => (
            <AutomationCard
              key={rule.id}
              rule={rule}
              onToggle={toggleRule}
              onDelete={deleteRule}
              isRunning={runningId === rule.id}
            />
          ))}
        </div>
      ) : (
        /* ── Empty state ── */
        <div
          className="py-28 flex flex-col items-center gap-5 text-center rounded-[2rem] border border-dashed"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            ⚡
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: C.muted }}>
              {activeFilter === 'All' ? 'No automations yet' : `No ${activeFilter} automations`}
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: C.dimmed }}>
              {activeFilter === 'All'
                ? 'Create your first rule and let your home run itself.'
                : `Try a different filter or create a new ${activeFilter.toLowerCase()} rule.`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}35`, color: C.gold }}
          >
            + Create Automation
          </button>
        </div>
      )}
    </div>
  );
};

export default Scenarios;
