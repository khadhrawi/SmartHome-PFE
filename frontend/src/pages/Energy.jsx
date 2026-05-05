import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Zap, TrendingUp, TrendingDown, Lightbulb, Award, RefreshCw, Loader2 } from 'lucide-react';
import api from '../api/axios';

const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#3E5F4F',
};

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl"
      style={{ background: 'rgba(26,31,29,0.92)', border: '1px solid rgba(62,95,79,0.30)', backdropFilter: 'blur(16px)' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.dimmed }}>{label}</p>
      <p className="text-base font-black" style={{ color: '#3E5F4F' }}>
        {Number(payload[0].value).toFixed(2)} <span className="text-xs font-semibold" style={{ color: C.muted }}>kWh</span>
      </p>
    </div>
  );
}

function StatCard({ label, value, unit, sub, accent, Icon, delta }) {
  return (
    <div className="rounded-[1.5rem] p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: `${accent}0a`, border: `1px solid ${accent}22`, backdropFilter: 'blur(25px)' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />
      <div className="flex items-center justify-between relative z-10">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={18} strokeWidth={2} style={{ color: accent }} />
        </div>
        {delta && (
          <span className="text-[10px] font-black px-2 py-1 rounded-full"
            style={{ background: `${delta.color}15`, border: `1px solid ${delta.color}30`, color: delta.color }}>
            {delta.label}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-black" style={{ color: C.text }}>{value}</span>
          <span className="text-sm font-bold mb-1" style={{ color: accent }}>{unit}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.dimmed }}>{label}</p>
        {sub && <p className="text-[11px] font-medium mt-1" style={{ color: C.muted }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Device type → icon emoji ──────────────────────────────────────────────────
const TYPE_ICON = { ac: '❄️', climate: '❄️', light: '💡', lamp: '💡', tv: '📺', television: '📺', washer: '🫧', washing_machine: '🫧', door: '🚪', lock: '🔒', camera: '📷', window: '🪟', blind: '🪟' };
const getIcon = (type) => TYPE_ICON[String(type || '').toLowerCase()] ?? '🔌';

const ACCENT_COLORS = ['#60a5fa', '#f97316', '#a78bfa', '#3E5F4F', '#f5c842', '#6b7280'];

// ════════════════════════════════════════════════════════════════
//  ENERGY PAGE
// ════════════════════════════════════════════════════════════════
const Energy = () => {
  const [chartRange, setChartRange] = useState('today');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);

  const fetchEnergy = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/energy');
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEnergy(); }, [fetchEnergy]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-500 font-semibold">Loading energy data…</p>
      </div>
    );
  }

  // Fallback to zeros if API returns nothing useful
  const hourly = data?.hourly ?? [];
  const weekly = data?.weekly ?? [];
  const todayKwh   = data?.todayKwh   ?? 0;
  const avgKwh     = data?.avgDailyKwh ?? 0;
  const deviceList = (data?.deviceBreakdown ?? []).map((d, i) => ({
    ...d,
    icon:  getIcon(d.type),
    color: ACCENT_COLORS[i % ACCENT_COLORS.length],
  }));

  const chartData = chartRange === 'today' ? hourly : weekly;
  const chartKey  = chartRange === 'today' ? 'label' : 'day';

  // Comparison helpers
  const yesterdayKwh = weekly.at(-2)?.kwh ?? 0;
  const vsYestPct = yesterdayKwh > 0 ? ((todayKwh - yesterdayKwh) / yesterdayKwh) * 100 : 0;
  const vsYest = {
    pct: Math.abs(vsYestPct).toFixed(1),
    direction: vsYestPct >= 0 ? 'up' : 'down',
    label: vsYestPct >= 0 ? `↑ ${Math.abs(vsYestPct).toFixed(1)}% more than yesterday` : `↓ ${Math.abs(vsYestPct).toFixed(1)}% less than yesterday`,
    color: vsYestPct >= 0 ? '#f87171' : '#4ade80',
  };

  const vsAvgPct = avgKwh > 0 ? ((todayKwh - avgKwh) / avgKwh) * 100 : 0;
  const vsAvg = {
    pct: Math.abs(vsAvgPct).toFixed(1),
    direction: vsAvgPct >= 0 ? 'up' : 'down',
    label: vsAvgPct >= 0 ? `↑ ${Math.abs(vsAvgPct).toFixed(1)}% more than usual` : `↓ ${Math.abs(vsAvgPct).toFixed(1)}% less than usual`,
    color: vsAvgPct >= 0 ? '#f87171' : '#4ade80',
  };

  const topDevice = deviceList[0] ?? { name: 'N/A', pct: 0, kwh: 0, color: '#60a5fa' };

  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>Energy</h2>
          <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
            Real-time consumption · based on your active devices
          </p>
        </div>
        <button onClick={fetchEnergy} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Usage" value={todayKwh.toFixed(2)} unit="kWh"
          sub={`vs avg ${avgKwh.toFixed(1)} kWh/day`} accent="#3E5F4F" Icon={Zap} delta={vsAvg} />
        <StatCard label="vs Yesterday" value={vsYest.pct}
          unit={vsYest.direction === 'up' ? '%↑' : '%↓'} sub="Compared to same time"
          accent={vsYest.color} Icon={vsYest.direction === 'up' ? TrendingUp : TrendingDown} />
        <StatCard label="Weekly Average" value={avgKwh.toFixed(1)} unit="kWh"
          sub="Last 7 days" accent="#a78bfa" Icon={TrendingUp} />
        <StatCard label="Top Consumer" value={topDevice.pct} unit="%"
          sub={topDevice.name} accent={topDevice.color} Icon={Award} />
      </div>

      {/* Area chart */}
      <div className="rounded-[2rem] p-6 space-y-5 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(62,95,79,0.14)', backdropFilter: 'blur(25px)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(62,95,79,0.10) 0%, transparent 70%)' }} />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-lg font-black" style={{ color: C.text }}>Consumption Chart</h3>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: C.muted }}>
              {chartRange === 'today' ? 'Hourly kWh today' : 'Daily kWh this week'} · live data
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {['today', 'week'].map(r => (
              <button key={r} onClick={() => setChartRange(r)}
                className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                style={{
                  background: chartRange === r ? `${C.gold}20` : 'transparent',
                  border: `1px solid ${chartRange === r ? C.gold + '45' : 'transparent'}`,
                  color: chartRange === r ? C.gold : C.muted,
                }}>
                {r === 'today' ? '24h' : 'Week'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="natureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3E5F4F" stopOpacity={0.30} />
                  <stop offset="95%" stopColor="#3E5F4F" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey={chartKey} tick={{ fill: 'rgba(248,249,250,0.30)', fontSize: 10, fontWeight: 700 }}
                axisLine={false} tickLine={false} interval={chartRange === 'today' ? 3 : 0} />
              <YAxis tick={{ fill: 'rgba(248,249,250,0.25)', fontSize: 10, fontWeight: 600 }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(62,95,79,0.25)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="kwh" stroke="#3E5F4F" strokeWidth={2.5}
                fill="url(#natureGradient)" dot={false}
                activeDot={{ r: 5, fill: '#3E5F4F', stroke: 'rgba(62,95,79,0.4)', strokeWidth: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 relative z-10">
          {[vsAvg, vsYest].map((cmp, i) => (
            <div key={i} className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{ background: `${cmp.color}10`, border: `1px solid ${cmp.color}28` }}>
              {cmp.direction === 'up'
                ? <TrendingUp size={12} style={{ color: cmp.color }} />
                : <TrendingDown size={12} style={{ color: cmp.color }} />}
              <span className="text-[11px] font-bold" style={{ color: cmp.color }}>{cmp.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black" style={{ color: C.text }}>Active Device Breakdown</h3>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.dimmed }}>
            Today · {todayKwh.toFixed(2)} kWh
          </span>
        </div>

        {deviceList.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-500 font-semibold">No active devices found.</p>
            <p className="text-xs text-zinc-600 mt-1">Turn on some devices to see their energy usage.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deviceList.map((dev, i) => (
              <div key={dev.id}
                className="rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.01]"
                style={{
                  background: i === 0 ? `linear-gradient(135deg, ${dev.color}10 0%, rgba(255,255,255,0.03) 100%)` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? dev.color + '28' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <span className="text-[10px] font-black w-5 text-center flex-shrink-0" style={{ color: i === 0 ? dev.color : C.dimmed }}>
                  {i === 0 ? '🏆' : `#${i + 1}`}
                </span>
                <span className="text-xl flex-shrink-0">{dev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate" style={{ color: C.text }}>{dev.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: C.dimmed }}>{dev.room || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black" style={{ color: dev.color }}>{dev.kwh.toFixed(2)}</p>
                  <p className="text-[10px] font-medium" style={{ color: C.dimmed }}>kWh</p>
                </div>
                <div className="w-24 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black" style={{ color: dev.color }}>{dev.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${dev.pct}%`, background: `linear-gradient(90deg, ${dev.color}cc, ${dev.color}66)` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Tip */}
      {topDevice.name !== 'N/A' && (
        <div className="flex items-start gap-4 px-6 py-5 rounded-[1.75rem] relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${topDevice.color}0e 0%, rgba(255,255,255,0.025) 100%)`, border: `1px solid ${topDevice.color}28` }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 relative z-10"
            style={{ background: `${topDevice.color}18`, border: `1px solid ${topDevice.color}35` }}>
            <Lightbulb size={20} style={{ color: topDevice.color }} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: `${topDevice.color}99` }}>
              💡 Smart Tip
            </p>
            <p className="text-sm font-bold leading-relaxed" style={{ color: C.text }}>
              <span style={{ color: topDevice.color }}>{topDevice.name}</span> accounts for{' '}
              <span style={{ color: topDevice.color }}>{topDevice.pct}%</span> of today's energy usage.
              Consider scheduling it during off-peak hours to reduce consumption.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Energy;
