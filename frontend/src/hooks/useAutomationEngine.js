import { useEffect, useCallback, useRef } from 'react';

/**
 * useAutomationEngine
 *
 * Evaluates enabled automation rules every 30 seconds (and on mount).
 * Fires onTrigger(ruleId) when a rule's condition is met.
 *
 * Supported trigger types:
 *   'time'     → matches HH:MM against current local time
 *   'sensor'   → compares homeState device value against threshold
 *   'device'   → checks device status / locked state
 *   'location' → no real GPS; simulated via homeState.awayMode flag
 */
export function useAutomationEngine({ rules, homeState, onTrigger }) {
  // Track which rules already fired this minute to avoid re-triggering
  const firedThisMinute = useRef(new Set());

  const evaluate = useCallback(() => {
    const now   = new Date();
    const hh    = String(now.getHours()).padStart(2, '0');
    const mm    = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    // Reset the fired-set every new minute
    const minuteKey = currentTime;
    if (firedThisMinute.current.lastMinute !== minuteKey) {
      firedThisMinute.current = new Set();
      firedThisMinute.current.lastMinute = minuteKey;
    }

    rules.forEach(rule => {
      if (!rule.isEnabled) return;
      if (firedThisMinute.current.has(rule.id)) return;

      let conditionMet = false;

      switch (rule.trigger.type) {
        /* ── Time-based ── */
        case 'time':
          conditionMet = rule.trigger.triggerTime === currentTime;
          break;

        /* ── Device state ── */
        case 'device': {
          const allDevices = [
            ...(homeState?.lights    || []),
            ...(homeState?.doors     || []),
            ...(homeState?.climate   || []),
          ];
          const dev = allDevices.find(d => d.id === rule.trigger.deviceId);
          if (!dev) break;

          switch (rule.condition?.type) {
            case 'equals_on':    conditionMet = dev.is_on   === true;  break;
            case 'equals_off':   conditionMet = dev.is_on   === false; break;
            case 'is_locked':    conditionMet = dev.locked  === true;  break;
            case 'is_unlocked':  conditionMet = dev.locked  === false; break;
            default:             conditionMet = false;
          }
          break;
        }

        /* ── Sensor threshold ── */
        case 'sensor': {
          const sensors = homeState?.climate || [];
          const sensor  = sensors.find(s => s.id === rule.trigger.deviceId);
          if (!sensor) break;

          const threshold = parseFloat(rule.condition?.value ?? '0');
          const reading   = sensor.temp ?? sensor.humidity ?? 0;

          switch (rule.condition?.type) {
            case 'greater_than': conditionMet = reading > threshold;  break;
            case 'less_than':    conditionMet = reading < threshold;  break;
            case 'equals':       conditionMet = reading === threshold; break;
            default:             conditionMet = false;
          }
          break;
        }

        /* ── Location ── */
        case 'location': {
          const isAway = homeState?.awayMode === true;
          conditionMet =
            rule.condition?.type === 'location_away' ? isAway :
            rule.condition?.type === 'location_home' ? !isAway : false;
          break;
        }

        default:
          conditionMet = false;
      }

      if (conditionMet) {
        firedThisMinute.current.add(rule.id);
        onTrigger(rule.id, rule.action);
      }
    });
  }, [rules, homeState, onTrigger]);

  /* Run on mount and every 30 seconds */
  useEffect(() => {
    evaluate();
    const id = setInterval(evaluate, 30_000);
    return () => clearInterval(id);
  }, [evaluate]);
}
