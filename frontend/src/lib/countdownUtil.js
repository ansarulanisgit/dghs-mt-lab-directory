// Robust centralized countdown utility for automated DGHS scraper schedules
// Universally synchronized across all devices, browsers, and deployments.

export function calculateTimeRemaining(intervalDays = 7, anchorTime = null) {
  const now = new Date();
  const days = parseInt(intervalDays, 10) || 7;

  let lastSync = null;
  if (anchorTime) {
    lastSync = new Date(anchorTime);
  }

  // Universal persistent baseline anchor
  if (!lastSync || isNaN(lastSync.getTime())) {
    lastSync = new Date('2026-08-30T19:50:00.000Z');
  }

  // Calculate target: advance in intervalDays increments until target > now
  const intervalMs = days * 24 * 60 * 60 * 1000;
  let target = new Date(lastSync.getTime() + intervalMs);

  while (target.getTime() <= now.getTime()) {
    target = new Date(target.getTime() + intervalMs);
  }

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Syncing now...';

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  if (d > 0) {
    return `${d}d ${h}h ${m}m ${s}s`;
  }
  return `${h}h ${m}m ${s}s`;
}