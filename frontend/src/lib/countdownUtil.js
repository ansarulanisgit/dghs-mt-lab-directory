// Robust centralized countdown utility for automated DGHS scraper schedules
// Universally synchronized across all devices, browsers, and deployments.

export function getScheduleCountdown(intervalDays = 7, anchorTime = null) {
  const now = new Date();
  const days = parseInt(intervalDays, 10) || 7;

  let lastSync = null;
  if (anchorTime) {
    lastSync = new Date(anchorTime);
  }

  // Universal persistent baseline anchor
  if (!lastSync || isNaN(lastSync.getTime())) {
    lastSync = new Date('2026-09-01T14:06:09.316Z');
  }

  // Calculate target: exactly lastSync + intervalMs
  const intervalMs = days * 24 * 60 * 60 * 1000;
  const targetTime = lastSync.getTime() + intervalMs;
  const diff = targetTime - now.getTime();

  if (diff <= 0) {
    return {
      isDue: true,
      text: 'Update Due',
      targetDate: new Date(targetTime)
    };
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const text = d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;

  return {
    isDue: false,
    text,
    targetDate: new Date(targetTime)
  };
}

export function calculateTimeRemaining(intervalDays = 7, anchorTime = null) {
  const res = getScheduleCountdown(intervalDays, anchorTime);
  return res.text;
}