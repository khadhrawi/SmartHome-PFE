/** ── Hourly kWh consumption for today ── */
export const HOURLY_USAGE = [
  { hour: '00:00', kwh: 0.12, label: '12am' },
  { hour: '01:00', kwh: 0.08, label: '1am'  },
  { hour: '02:00', kwh: 0.07, label: '2am'  },
  { hour: '03:00', kwh: 0.06, label: '3am'  },
  { hour: '04:00', kwh: 0.06, label: '4am'  },
  { hour: '05:00', kwh: 0.09, label: '5am'  },
  { hour: '06:00', kwh: 0.18, label: '6am'  },
  { hour: '07:00', kwh: 0.42, label: '7am'  },
  { hour: '08:00', kwh: 0.61, label: '8am'  },
  { hour: '09:00', kwh: 0.54, label: '9am'  },
  { hour: '10:00', kwh: 0.48, label: '10am' },
  { hour: '11:00', kwh: 0.52, label: '11am' },
  { hour: '12:00', kwh: 0.71, label: '12pm' },
  { hour: '13:00', kwh: 0.65, label: '1pm'  },
  { hour: '14:00', kwh: 0.58, label: '2pm'  },
  { hour: '15:00', kwh: 0.49, label: '3pm'  },
  { hour: '16:00', kwh: 0.53, label: '4pm'  },
  { hour: '17:00', kwh: 0.74, label: '5pm'  },
  { hour: '18:00', kwh: 0.92, label: '6pm'  },
  { hour: '19:00', kwh: 1.04, label: '7pm'  },
  { hour: '20:00', kwh: 0.88, label: '8pm'  },
  { hour: '21:00', kwh: 0.67, label: '9pm'  },
  { hour: '22:00', kwh: 0.44, label: '10pm' },
  { hour: '23:00', kwh: 0.28, label: '11pm' },
];

/** ── Weekly comparison data ── */
export const WEEKLY_USAGE = [
  { day: 'Mon', kwh: 8.4  },
  { day: 'Tue', kwh: 9.1  },
  { day: 'Wed', kwh: 7.8  },
  { day: 'Thu', kwh: 10.2 },
  { day: 'Fri', kwh: 11.5 },
  { day: 'Sat', kwh: 13.2 },
  { day: 'Sun', kwh: 9.8  },
];

/** ── Device energy breakdown ── */
export const DEVICE_USAGE = [
  { id: 'dev-ac',     name: 'Air Conditioning', icon: '❄️', kwh: 3.8,  pct: 40, color: '#60a5fa', room: 'Living Room' },
  { id: 'dev-oven',   name: 'Smart Oven',        icon: '🍳', kwh: 1.9,  pct: 20, color: '#f97316', room: 'Kitchen'     },
  { id: 'dev-tv',     name: 'Smart TV',          icon: '📺', kwh: 1.14, pct: 12, color: '#a78bfa', room: 'Living Room' },
  { id: 'dev-washer', name: 'Washing Machine',   icon: '🫧', kwh: 0.95, pct: 10, color: '#3E5F4F', room: 'Utility'     },
  { id: 'dev-light',  name: 'Lighting (all)',    icon: '💡', kwh: 0.76, pct: 8,  color: '#f5c842', room: 'All rooms'   },
  { id: 'dev-other',  name: 'Other devices',     icon: '🔌', kwh: 0.95, pct: 10, color: '#6b7280', room: '–'           },
];

/** Today's total kWh */
export const TODAY_KWH = HOURLY_USAGE
  .slice(0, new Date().getHours() + 1)
  .reduce((s, h) => s + h.kwh, 0);

/** Average daily kWh (from weekly data) */
export const AVG_DAILY_KWH = WEEKLY_USAGE.reduce((s, d) => s + d.kwh, 0) / WEEKLY_USAGE.length;

/** Yesterday's kWh */
export const YESTERDAY_KWH = WEEKLY_USAGE.at(-2)?.kwh ?? 9.8;

/**
 * Smart comparison helpers
 * Returns { pct, direction: 'up'|'down', label }
 */
export function compareToAverage(todayKwh = TODAY_KWH) {
  const pct = ((todayKwh - AVG_DAILY_KWH) / AVG_DAILY_KWH) * 100;
  return {
    pct: Math.abs(pct).toFixed(1),
    direction: pct >= 0 ? 'up' : 'down',
    label: pct >= 0
      ? `↑ ${Math.abs(pct).toFixed(1)}% more than usual`
      : `↓ ${Math.abs(pct).toFixed(1)}% less than usual`,
    color: pct >= 0 ? '#f87171' : '#4ade80',
  };
}

export function compareToYesterday(todayKwh = TODAY_KWH) {
  const pct = ((todayKwh - YESTERDAY_KWH) / YESTERDAY_KWH) * 100;
  return {
    pct: Math.abs(pct).toFixed(1),
    direction: pct >= 0 ? 'up' : 'down',
    label: pct >= 0
      ? `↑ ${Math.abs(pct).toFixed(1)}% more than yesterday`
      : `↓ ${Math.abs(pct).toFixed(1)}% less than yesterday`,
    color: pct >= 0 ? '#f87171' : '#4ade80',
  };
}

/** Top consumer */
export function getTopConsumer() {
  return DEVICE_USAGE.reduce((a, b) => a.kwh > b.kwh ? a : b);
}
