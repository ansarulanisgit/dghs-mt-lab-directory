// Dataset Backup & Version Snapshot Manager
// Keeps the last 2 update datasets in store for security & rollback

const BACKUP_STORAGE_KEY = 'dghs_backup_snapshots_v1';
const ACTIVE_OVERRIDE_KEY = 'dghs_active_backup_override_v1';

export function getBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load backup snapshots:', err);
    return [];
  }
}

export function saveBackupSnapshot(dataset, label = 'Automatic Update Snapshot') {
  try {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
      return null;
    }

    const currentBackups = getBackups();
    const filledCount = dataset.filter(s => s.status === 'Filled').length;
    const vacantCount = dataset.filter(s => s.status === 'Vacant').length;

    const newSnapshot = {
      id: 'backup_' + Date.now(),
      label,
      createdAt: new Date().toISOString(),
      recordCount: dataset.length,
      filledCount,
      vacantCount,
      data: dataset // Full dataset snapshot
    };

    // Keep only the last 2 snapshots (newest first)
    const updatedBackups = [newSnapshot, ...currentBackups].slice(0, 2);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updatedBackups));
    window.dispatchEvent(new Event('dghs_backups_updated'));
    return newSnapshot;
  } catch (err) {
    console.error('Failed to save backup snapshot:', err);
    return null;
  }
}

export function getActiveBackupOverride() {
  try {
    const raw = localStorage.getItem(ACTIVE_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function restoreBackupById(backupId) {
  try {
    const backups = getBackups();
    const target = backups.find(b => b.id === backupId);
    if (!target) {
      throw new Error('Specified backup version not found.');
    }

    localStorage.setItem(ACTIVE_OVERRIDE_KEY, JSON.stringify({
      id: target.id,
      label: target.label,
      createdAt: target.createdAt,
      recordCount: target.recordCount,
      data: target.data
    }));

    window.dispatchEvent(new Event('dghs_backup_restored'));
    return target;
  } catch (err) {
    console.error('Failed to restore backup:', err);
    throw err;
  }
}

export function clearBackupOverride() {
  localStorage.removeItem(ACTIVE_OVERRIDE_KEY);
  window.dispatchEvent(new Event('dghs_backup_restored'));
}