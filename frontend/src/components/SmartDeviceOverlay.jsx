import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Lightbulb, Thermometer, Shield, Zap,
  Lock, Unlock, ChevronUp, ChevronDown,
  Sun, Droplets, Clock, CheckCircle2,
} from 'lucide-react';

/* ── palette ── */
const C = {
  text:      '#F8F9FA',
  muted:     'rgba(248,249,250,0.45)',
  dimmed:    'rgba(248,249,250,0.25)',
  gold:      '#E3C598',
  goldLight: '#D4AF37',
};

/* ─────────────────────────────────────
   LIGHT CONTROLLER
───────────────────────────────────── */
function LightController({ device, onUpdate }) {
  const [brightness, setBrightness] = useState(device.value ?? 70);
  const [color, setColor]           = useState(device.color ?? '#ffc87a');
  const trackRef = useRef(null);
  const dragging  = useRef(false);

  const WARM_PRESETS = [
    { label: 'Warm',   hex: '#ffc87a' },
    { label: 'Amber',  hex: '#f5a623' },
    { label: 'Cool',   hex: '#cce8ff' },
    { label: 'White',  hex: '#ffffff' },
    { label: 'Rose',   hex: '#ffb3ba' },
  ];

  const computeBrightness = useCallback((clientY) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const val = Math.round(pct * 100);
    setBrightness(val);
    onUpdate({ brightness: val });
  }, [onUpdate]);

  useEffect(() => {
    const onMove = e => dragging.current && computeBrightness(e.touches?.[0]?.clientY ?? e.clientY);
    const onUp   = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [computeBrightness]);

  return (
    <div className="flex flex-col items-center gap-7 pt-2">
      {/* Live preview glow */}
      <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(brightness * 2.55).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
          border: `2px solid ${color}55`,
          boxShadow: brightness > 10 ? `0 0 ${brightness * 0.6}px ${color}88` : 'none',
          transition: 'all 0.3s ease',
        }}>
        <Lightbulb size={36}
          style={{ color: brightness > 5 ? color : C.dimmed, transition: 'color 0.3s' }}
          strokeWidth={brightness > 5 ? 2.5 : 1.5} />
      </div>

      {/* Slider + value */}
      <div className="flex items-center gap-5">
        {/* Vertical track */}
        <div ref={trackRef}
          className="relative w-8 h-48 rounded-full cursor-pointer select-none"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          onMouseDown={e => { dragging.current = true; computeBrightness(e.clientY); }}
          onTouchStart={e => { dragging.current = true; computeBrightness(e.touches[0].clientY); }}
        >
          {/* Fill */}
          <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-100"
            style={{
              height: `${brightness}%`,
              background: `linear-gradient(to top, ${C.gold}, ${color})`,
              boxShadow: `0 0 10px ${color}60`,
            }} />
          {/* Thumb */}
          <div className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg border-2 transition-all duration-100"
            style={{
              bottom: `calc(${brightness}% - 12px)`,
              borderColor: color,
              boxShadow: `0 0 8px ${color}80, 0 2px 6px rgba(0,0,0,0.4)`,
            }} />
        </div>

        {/* Value display */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-black" style={{ color: C.text }}>{brightness}</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.muted }}>%</span>
          <div className="flex flex-col gap-1 mt-2">
            {[100, 75, 50, 25, 0].map(v => (
              <button key={v}
                onClick={() => { setBrightness(v); onUpdate({ brightness: v }); }}
                className="text-[10px] font-bold px-3 py-1 rounded-full transition-all"
                style={{
                  background: brightness === v ? `${C.gold}25` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${brightness === v ? C.gold + '50' : 'rgba(255,255,255,0.1)'}`,
                  color: brightness === v ? C.gold : C.muted,
                }}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color swatches */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: C.dimmed }}>Color Tone</p>
        <div className="flex gap-3 justify-center">
          {WARM_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setColor(p.hex); onUpdate({ color: p.hex }); }}
              title={p.label}
              className="w-9 h-9 rounded-full transition-all duration-300"
              style={{
                background: p.hex,
                boxShadow: color === p.hex ? `0 0 12px ${p.hex}cc, 0 0 0 3px rgba(255,255,255,0.3)` : '0 2px 6px rgba(0,0,0,0.3)',
                transform: color === p.hex ? 'scale(1.2)' : 'scale(1)',
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   CLIMATE CONTROLLER — SVG arc dial
───────────────────────────────────── */
function ClimateController({ device, onUpdate }) {
  const [temp, setTemp]   = useState(device.value ?? 22);
  const [hum]             = useState(device.humidity ?? 48);
  const MIN = 16, MAX = 30;
  const R = 72, CX = 90, CY = 90;
  const START_ANG = 220, END_ANG = -40; // degrees, clockwise from top-right

  const degToRad = d => (d - 90) * (Math.PI / 180);
  const pct = (temp - MIN) / (MAX - MIN);
  // Arc from START_ANG downward to current pct
  const startR = degToRad(START_ANG);
  const endR   = degToRad(START_ANG - pct * (START_ANG - END_ANG));
  const large  = pct * (START_ANG - END_ANG) > 180 ? 1 : 0;

  const sx = CX + R * Math.cos(startR), sy = CY + R * Math.sin(startR);
  const ex = CX + R * Math.cos(endR),   ey = CY + R * Math.sin(endR);

  const tempColor = temp <= 19 ? '#60a5fa' : temp <= 23 ? '#3E5F4F' : '#f97316';

  const adjust = delta => {
    const next = Math.max(MIN, Math.min(MAX, temp + delta));
    setTemp(next);
    onUpdate({ value: next });
  };

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      {/* SVG Dial */}
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          {/* Arc */}
          <path
            d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 0 ${ex} ${ey}`}
            fill="none" stroke={tempColor} strokeWidth="8"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${tempColor}88)`, transition: 'all 0.3s ease' }}
          />
          {/* End dot */}
          <circle cx={ex} cy={ey} r="5" fill={tempColor}
            style={{ filter: `drop-shadow(0 0 8px ${tempColor})` }} />
        </svg>

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color: tempColor, transition: 'color 0.3s' }}>{temp}</span>
          <span className="text-base font-bold" style={{ color: C.muted }}>°C</span>
        </div>
      </div>

      {/* +/– controls */}
      <div className="flex items-center gap-5">
        <button onClick={() => adjust(-1)}
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
          <ChevronDown size={20} strokeWidth={2.5} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.dimmed }}>Target</span>
          <span className="text-lg font-black" style={{ color: C.text }}>{temp}°C</span>
        </div>
        <button onClick={() => adjust(1)}
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }}>
          <ChevronUp size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-8">
        <div className="flex items-center gap-2">
          <Thermometer size={13} style={{ color: tempColor }} />
          <span className="text-xs font-semibold" style={{ color: C.muted }}>Current {device.currentTemp ?? temp - 0.5}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets size={13} style={{ color: '#60a5fa' }} />
          <span className="text-xs font-semibold" style={{ color: C.muted }}>Humidity {hum}%</span>
        </div>
      </div>

      {/* Range presets */}
      <div className="flex gap-2">
        {[[19,'Cool','#60a5fa'],[22,'Comfort','#3E5F4F'],[26,'Warm','#f97316']].map(([v,l,col]) => (
          <button key={v}
            onClick={() => { setTemp(v); onUpdate({ value: v }); }}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: temp === v ? `${col}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${temp === v ? col + '50' : 'rgba(255,255,255,0.1)'}`,
              color: temp === v ? col : C.muted,
            }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   SECURITY CONTROLLER
───────────────────────────────────── */
function SecurityController({ device, onUpdate }) {
  const [locked, setLocked] = useState(device.locked ?? true);
  const [activity]          = useState(device.activity ?? [
    { time: '00:04', event: 'Door locked remotely' },
    { time: '23:51', event: 'Motion detected' },
    { time: '23:40', event: 'Door unlocked — Imen' },
    { time: '22:15', event: 'System armed' },
  ]);

  const toggle = () => {
    const next = !locked;
    setLocked(next);
    onUpdate({ locked: next });
  };

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      {/* Big lock icon */}
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          background: locked ? 'rgba(96,165,250,0.12)' : 'rgba(248,113,113,0.12)',
          border: `2px solid ${locked ? 'rgba(96,165,250,0.35)' : 'rgba(248,113,113,0.35)'}`,
          boxShadow: locked ? '0 0 30px rgba(96,165,250,0.2)' : '0 0 30px rgba(248,113,113,0.2)',
          transition: 'all 0.5s ease',
        }}>
        {locked
          ? <Lock size={42} style={{ color: '#60a5fa' }} strokeWidth={2} />
          : <Unlock size={42} style={{ color: '#f87171' }} strokeWidth={2} />}
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-2xl font-black" style={{ color: locked ? '#93c5fd' : '#fca5a5', transition: 'color 0.4s' }}>
          {locked ? 'Secured' : 'Unlocked'}
        </p>
        <p className="text-xs font-medium mt-1" style={{ color: C.muted }}>{device.name}</p>
      </div>

      {/* Toggle button */}
      <button onClick={toggle}
        className="flex items-center gap-3 px-7 py-3 rounded-2xl font-bold text-sm transition-all duration-400 hover:scale-105 active:scale-95"
        style={{
          background: locked
            ? 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(248,113,113,0.08))'
            : 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.08))',
          border: `1px solid ${locked ? 'rgba(248,113,113,0.35)' : 'rgba(96,165,250,0.35)'}`,
          color: locked ? '#f87171' : '#60a5fa',
        }}>
        {locked ? <Unlock size={16} strokeWidth={2} /> : <Lock size={16} strokeWidth={2} />}
        {locked ? 'Unlock Entrance' : 'Lock Entrance'}
      </button>

      {/* Activity log */}
      <div className="w-full space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: C.dimmed }}>
          <Clock size={11} /> Last Activity
        </p>
        {activity.slice(0, 4).map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: C.gold }}>{a.time}</span>
            <span className="text-[11px] font-medium" style={{ color: C.muted }}>{a.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   APPLIANCE CONTROLLER
───────────────────────────────────── */
function ApplianceController({ device, onUpdate }) {
  const [on, setOn] = useState(device.status === 'on');
  const toggle = () => { const n = !on; setOn(n); onUpdate({ status: n ? 'on' : 'off' }); };

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          background: on ? 'rgba(62,95,79,0.12)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${on ? 'rgba(62,95,79,0.4)' : 'rgba(255,255,255,0.12)'}`,
          boxShadow: on ? '0 0 30px rgba(62,95,79,0.2)' : 'none',
          transition: 'all 0.4s ease',
        }}>
        <Zap size={42} style={{ color: on ? '#3E5F4F' : C.dimmed }} strokeWidth={on ? 2.5 : 1.5} />
      </div>

      <p className="text-2xl font-black" style={{ color: on ? '#3E5F4F' : C.muted, transition: 'color 0.4s' }}>
        {on ? 'Running' : 'Standby'}
      </p>

      <button onClick={toggle}
        className="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
        style={{
          background: on
            ? 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(248,113,113,0.08))'
            : 'linear-gradient(135deg, rgba(62,95,79,0.15), rgba(62,95,79,0.08))',
          border: `1px solid ${on ? 'rgba(248,113,113,0.35)' : 'rgba(62,95,79,0.35)'}`,
          color: on ? '#f87171' : '#3E5F4F',
        }}>
        {on ? 'Turn Off' : 'Turn On'}
      </button>

      <div className="flex gap-6 mt-2">
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: C.muted }}>Power draw</p>
          <p className="text-lg font-black" style={{ color: C.text }}>{on ? device.wattage ?? '120W' : '0W'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: C.muted }}>Today</p>
          <p className="text-lg font-black" style={{ color: C.text }}>{device.todayKwh ?? '0.8 kWh'}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   MAIN OVERLAY
───────────────────────────────────── */
export default function SmartDeviceOverlay({ device, onClose, onUpdate }) {
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const TYPE_META = {
    light:     { label: 'Light Controller',    Icon: Lightbulb,   accent: '#E3C598' },
    climate:   { label: 'Climate Controller',  Icon: Thermometer, accent: '#f97316' },
    security:  { label: 'Security Controller', Icon: Shield,      accent: '#60a5fa' },
    appliance: { label: 'Appliance Control',   Icon: Zap,         accent: '#3E5F4F' },
  };

  const meta = TYPE_META[device.type] ?? TYPE_META.appliance;
  const { Icon, accent, label } = meta;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,4,2,0.80)', backdropFilter: 'blur(25px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-sm rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(28,18,8,0.92) 0%, rgba(18,12,5,0.96) 100%)',
          border: `1px solid ${accent}30`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}>
              <Icon size={18} strokeWidth={2.5} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: C.text }}>{device.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accent}99` }}>{label} · {device.room}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: C.muted }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Dynamic controller */}
        <div className="px-6 py-5 overflow-y-auto max-h-[75vh] scrollbar-none">
          {device.type === 'light'    && <LightController    device={device} onUpdate={onUpdate} />}
          {device.type === 'climate'  && <ClimateController  device={device} onUpdate={onUpdate} />}
          {device.type === 'security' && <SecurityController device={device} onUpdate={onUpdate} />}
          {device.type === 'appliance'&& <ApplianceController device={device} onUpdate={onUpdate}/>}
        </div>

        {/* Footer status */}
        <div className="flex items-center justify-between px-6 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'warm-pulse 2s ease-in-out infinite' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(74,222,128,0.7)' }}>Connected</span>
          </div>
          <CheckCircle2 size={14} style={{ color: `${accent}70` }} />
        </div>
      </div>
    </div>
  );
}
