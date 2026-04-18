import { Lightbulb, Thermometer, Shield, Zap, Tv, Music, Lock, Unlock, Droplets, Sun } from 'lucide-react';

/* ── Per-type metadata: icon + accent color ─────────────────────── */
const TYPE_CONFIG = {
  light:     { Icon: Lightbulb,   accent: '#D4AF37', label: 'Lighting'  },
  climate:   { Icon: Thermometer, accent: '#f97316', label: 'Climate'   },
  security:  { Icon: Shield,      accent: '#60a5fa', label: 'Security'  },
  appliance: { Icon: Zap,         accent: '#3E5F4F', label: 'Appliance' },
  media:     { Icon: Tv,          accent: '#a78bfa', label: 'Media'     },
};

const C = {
  text:       '#F8F9FA',
  textMuted:  'rgba(248,249,250,0.45)',
  dimmed:     'rgba(248,249,250,0.25)',
  gold:       '#E3C598',
};

/* ── Sub-value display per type ─────────────────────────────────── */
function DeviceMeta({ device, isOn }) {
  const m = 'text-[10px] font-bold';
  switch (device.type) {
    case 'light':
      return (
        <div className="flex items-center gap-1.5">
          <Sun size={10} style={{ color: isOn ? '#E3C598' : C.dimmed }} />
          <span className={m} style={{ color: isOn ? C.textMuted : C.dimmed }}>
            {isOn ? `${device.value ?? 80}%` : 'Off'}
          </span>
        </div>
      );
    case 'climate':
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Thermometer size={10} style={{ color: '#f97316' }} />
            <span className={m} style={{ color: C.textMuted }}>{device.value ?? 22}°C</span>
          </div>
          {device.humidity != null && (
            <div className="flex items-center gap-1">
              <Droplets size={10} style={{ color: '#60a5fa' }} />
              <span className={m} style={{ color: C.textMuted }}>{device.humidity}%</span>
            </div>
          )}
        </div>
      );
    case 'security': {
      const locked = device.locked ?? false;
      return (
        <div className="flex items-center gap-1.5">
          {locked
            ? <Lock size={10} style={{ color: '#60a5fa' }} />
            : <Unlock size={10} style={{ color: '#f87171' }} />}
          <span className={m} style={{ color: locked ? '#93c5fd' : '#fca5a5' }}>
            {locked ? 'Locked' : 'Unlocked'}
          </span>
        </div>
      );
    }
    case 'media':
      return (
        <div className="flex items-center gap-1.5">
          <Music size={10} style={{ color: '#a78bfa' }} />
          <span className={m} style={{ color: C.textMuted }}>
            {device.wattage ?? '–'}
          </span>
        </div>
      );
    case 'appliance':
      return (
        <div className="flex items-center gap-1.5">
          <Zap size={10} style={{ color: '#3E5F4F' }} />
          <span className={m} style={{ color: C.textMuted }}>
            {isOn ? (device.wattage ?? '–') : '0W'}
          </span>
        </div>
      );
    default:
      return null;
  }
}

const DeviceCard = ({ device, onToggle }) => {
  const cfg = TYPE_CONFIG[device.type] ?? TYPE_CONFIG.appliance;
  const { Icon, accent } = cfg;

  /* Normalise isOn across all device types */
  const isOn = device.state === 'ON'
    || device.status === 'on'
    || device.status === 'online';

  return (
    <div
      onClick={onToggle}
      className="group relative flex cursor-pointer flex-col gap-5 rounded-[2rem] border p-6 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:brightness-110 active:scale-[0.985]"
      style={{
        background: isOn
          ? `linear-gradient(135deg, ${accent}14 0%, rgba(255,255,255,0.06) 100%)`
          : 'rgba(255,255,255,0.04)',
        borderColor: isOn ? `${accent}45` : 'rgba(255,220,140,0.10)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        boxShadow: isOn
          ? `0 28px 56px rgba(0,0,0,0.45), 0 0 36px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.18)`
          : '0 20px 44px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Ambient glow spot when ON */}
      {isOn && (
        <div
          className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
            transform: 'translate(35%,-35%)',
          }}
        />
      )}

      {/* Icon + Toggle */}
      <div className="flex items-start justify-between relative z-10">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{
            background: isOn ? accent : 'rgba(255,255,255,0.07)',
            border: isOn ? 'none' : '1px solid rgba(255,220,140,0.12)',
            color: isOn ? '#12080a' : 'rgba(248,249,250,0.35)',
            boxShadow: isOn ? `0 0 24px ${accent}60` : 'none',
          }}
        >
          <Icon size={22} strokeWidth={isOn ? 2.5 : 1.8} />
        </div>

        {/* Toggle pill */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          aria-label={`Toggle ${device.name}`}
          className="relative flex-shrink-0 focus:outline-none transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ width: 50, height: 26 }}
        >
          <div
            className="absolute inset-0 rounded-full transition-all duration-300"
            style={{
              background: isOn
                ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                : 'rgba(255,255,255,0.10)',
              boxShadow: isOn ? `0 0 12px ${accent}55` : 'none',
            }}
          />
          <div
            className="absolute top-[4px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-all duration-300"
            style={{ left: isOn ? 28 : 4, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          />
        </button>
      </div>

      {/* Name + Room */}
      <div className="relative z-10 space-y-0.5">
        <p className="text-sm font-black truncate leading-tight" style={{ color: C.text }}>
          {device.name}
        </p>
        <p className="text-[10px] font-semibold capitalize truncate" style={{ color: C.textMuted }}>
          {device.room ?? 'Home'} · {cfg.label}
        </p>
      </div>

      {/* Meta value row */}
      <div className="relative z-10">
        <DeviceMeta device={device} isOn={isOn} />
      </div>

      {/* Status badge + pulse dot */}
      <div className="flex items-center justify-between relative z-10">
        <span
          className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
          style={{
            background: isOn ? `${accent}18` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isOn ? accent + '35' : 'rgba(255,255,255,0.07)'}`,
            color: isOn ? accent : 'rgba(248,249,250,0.28)',
          }}
        >
          {isOn ? 'Active' : 'Standby'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium" style={{ color: C.dimmed }}>
            {device.lastSeen ?? '–'}
          </span>
          <span
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: isOn ? accent : 'rgba(255,255,255,0.10)',
              boxShadow: isOn ? `0 0 8px ${accent}` : 'none',
              ...(isOn ? { animation: 'warm-pulse 2.5s ease-in-out infinite' } : {}),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
