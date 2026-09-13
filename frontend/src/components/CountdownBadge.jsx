import React, { useState, useEffect, memo } from 'react';
import { Timer } from 'lucide-react';
import { calculateTimeRemaining } from '../lib/countdownUtil';
import { getSystemConfig } from '../lib/configStore';
import { MOCK_METADATA } from '../lib/supabaseClient';

function CountdownBadge({ lastRunAt }) {
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    function tick() {
      const config = getSystemConfig();
      const text = calculateTimeRemaining(
        config.scheduleIntervalDays || 7,
        lastRunAt || MOCK_METADATA.last_run_at
      );
      setCountdownText(text);
    }

    tick();
    const interval = setInterval(tick, 1000);

    const handleConfigUpdate = () => tick();
    window.addEventListener('dghs_config_updated', handleConfigUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dghs_config_updated', handleConfigUpdate);
    };
  }, [lastRunAt]);

  const isDue = countdownText === 'Update Due';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full ${
        isDue
          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
      } border text-[11px] sm:text-xs font-semibold shadow-2xs w-fit self-start sm:self-auto shrink-0`}
    >
      <Timer
        className={`w-3.5 h-3.5 ${
          isDue
            ? 'text-amber-600 dark:text-amber-400 animate-spin'
            : 'text-emerald-600 dark:text-emerald-400 animate-pulse'
        }`}
      />
      {isDue ? (
        <span className="flex items-center gap-1.5">
          <span>Auto-Update:</span>
          <strong className="font-bold text-amber-900 dark:text-amber-200">
            Update Due (Syncing...)
          </strong>
        </span>
      ) : (
        <span>
          Next Update In:{' '}
          <strong className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
            {countdownText || 'Calculating...'}
          </strong>
        </span>
      )}
    </div>
  );
}

export default memo(CountdownBadge);
