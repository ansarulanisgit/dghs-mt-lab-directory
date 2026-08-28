// Robust countdown utility for automated DGHS scraper schedules

export function calculateTimeRemaining(intervalDays = 7) {
  const now = new Date();
  const days = parseInt(intervalDays, 10) || 7;

  // Retrieve or initialize last sync anchor time
  let lastSyncStr = typeof window !== 'undefined' ? localStorage.getItem('dghs_last_sync_time') : null;
  let lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
  
  if (!lastSync || isNaN(lastSync.getTime())) {
    lastSync = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dghs_last_sync_time', lastSync.toISOString());
    }
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