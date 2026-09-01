// Dataset Backup & Version Snapshot Manager
// Hybrid Architecture: Supabase Cloud PostgreSQL (`staff_backups`) + IndexedDB / LocalStorage
// Universal synchronization across all devices and browsers with up to 5 active backup versions.

import { supabase, isSupabaseConfigured } from './supabaseClient';

const BACKUP_META_STORAGE_KEY = 'dghs_backup_meta_v2';
const ACTIVE_OVERRIDE_META_KEY = 'dghs_active_backup_override_meta_v2';
export const MAX_BACKUPS = 5;

// Clean up legacy bloated localStorage keys from v1
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('dghs_backup_snapshots_v1');
    localStorage.removeItem('dghs_active_backup_override_v1');
  }
} catch {
  // Ignore
}

// In-memory cache for active restored datasets
let activeRestoredDatasetCache = null;

// IndexedDB Helper (Native zero-dependency browser database)
const DB_NAME = 'DGHS_Directory_Backups_DB';
const DB_VERSION = 1;
const STORE_NAME = 'backups_data';

function openBackupDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error:', request.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function saveDatasetToIDB(id, data) {
  try {
    const db = await openBackupDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, data });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('IDB save error:', err);
    return false;
  }
}

async function getDatasetFromIDB(id) {
  try {
    const db = await openBackupDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IDB get error:', err);
    return null;
  }
}

async function deleteDatasetFromIDB(id) {
  try {
    const db = await openBackupDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('IDB delete error:', err);
  }
}

// -------------------------------------------------------------
// Universal Backup API (Cloud Sync + Local Cache)
// -------------------------------------------------------------

export function getBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(b => (b.recordCount || 0) >= 10000 && b.recordCount !== 2506);
  } catch (err) {
    console.warn('Failed to load backup metadata:', err);
    return [];
  }
}

export async function syncBackupsWithCloud() {
  if (!isSupabaseConfigured || !supabase) return getBackups();

  try {
    const { data, error } = await supabase
      .from('staff_backups')
      .select('id, label, created_at, record_count, is_auto')
      .order('created_at', { ascending: false })
      .limit(MAX_BACKUPS);

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map(b => ({
        id: b.id,
        label: b.label,
        createdAt: b.created_at,
        recordCount: b.record_count,
        isAuto: b.is_auto
      }));

      localStorage.setItem(BACKUP_META_STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('dghs_backups_updated', { detail: mapped }));
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase backups sync warning:', err);
  }

  return getBackups();
}

export function saveBackupSnapshot(dataset, label = 'Automatic Update Backup', isAuto = false) {
  try {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
      return null;
    }

    const currentBackups = getBackups();

    if (!isAuto && currentBackups.length >= MAX_BACKUPS) {
      throw new Error(`Backup storage limit reached (${MAX_BACKUPS}/${MAX_BACKUPS}). Please delete an older backup before creating a new one.`);
    }

    const filledCount = dataset.filter(s => s.status === 'Filled').length;
    const vacantCount = dataset.filter(s => s.status === 'Vacant').length;
    const abolishedCount = dataset.filter(s => s.status === 'Abolished').length;
    const backupId = 'backup_' + Date.now();
    const createdAt = new Date().toISOString();

    const newSnapshotMeta = {
      id: backupId,
      label,
      createdAt,
      recordCount: dataset.length,
      filledCount,
      vacantCount,
      abolishedCount,
      isAuto
    };

    // Save to local IndexedDB for fast instant access
    saveDatasetToIDB(backupId, dataset);

    // Save and trim local metadata
    let updatedBackups = [newSnapshotMeta, ...currentBackups];
    if (updatedBackups.length > MAX_BACKUPS) {
      const removed = updatedBackups.slice(MAX_BACKUPS);
      removed.forEach(rm => deleteDatasetFromIDB(rm.id));
      updatedBackups = updatedBackups.slice(0, MAX_BACKUPS);
    }

    localStorage.setItem(BACKUP_META_STORAGE_KEY, JSON.stringify(updatedBackups));
    window.dispatchEvent(new CustomEvent('dghs_backups_updated', { detail: updatedBackups }));

    // Asynchronously save to Cloud Supabase for universal access across all devices
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('staff_backups')
        .upsert({
          id: backupId,
          label,
          created_at: createdAt,
          record_count: dataset.length,
          snapshot_data: dataset,
          is_auto: isAuto
        })
        .then(async () => {
          // Cloud Cleanup: Keep only latest MAX_BACKUPS in cloud
          const { data: cloudBackups } = await supabase
            .from('staff_backups')
            .select('id, created_at')
            .order('created_at', { ascending: false });

          if (cloudBackups && cloudBackups.length > MAX_BACKUPS) {
            const staleIds = cloudBackups.slice(MAX_BACKUPS).map(b => b.id);
            await supabase.from('staff_backups').delete().in('id', staleIds);
          }
        })
        .catch((err) => console.warn('Cloud backup save exception:', err));
    }

    return newSnapshotMeta;
  } catch (err) {
    console.error('Failed to save backup snapshot:', err);
    throw err;
  }
}

export function deleteBackupById(backupId) {
  try {
    const backups = getBackups();
    const target = backups.find(b => b.id === backupId);
    if (!target) {
      throw new Error('Backup not found.');
    }

    const updated = backups.filter(b => b.id !== backupId);
    localStorage.setItem(BACKUP_META_STORAGE_KEY, JSON.stringify(updated));

    // Delete from IndexedDB
    deleteDatasetFromIDB(backupId);

    // If active restored view was this deleted backup, clear override
    const activeOverride = getActiveBackupOverride();
    if (activeOverride && activeOverride.id === backupId) {
      clearBackupOverride();
    }

    window.dispatchEvent(new CustomEvent('dghs_backups_updated', { detail: updated }));

    // Delete from Cloud Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('staff_backups')
        .delete()
        .eq('id', backupId)
        .catch((err) => console.warn('Cloud backup delete exception:', err));
    }

    return true;
  } catch (err) {
    console.error('Failed to delete backup:', err);
    throw err;
  }
}

export function getActiveBackupOverride() {
  try {
    const raw = localStorage.getItem(ACTIVE_OVERRIDE_META_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw);
    return {
      ...meta,
      data: activeRestoredDatasetCache
    };
  } catch {
    return null;
  }
}

export async function restoreBackupById(backupId) {
  try {
    const backups = getBackups();
    const target = backups.find(b => b.id === backupId);
    if (!target) {
      throw new Error('Specified backup version not found.');
    }

    // 1. Try loading from local IndexedDB
    let fullData = await getDatasetFromIDB(backupId);

    // 2. If missing locally (e.g. created on desktop, being restored on mobile), fetch from cloud
    if ((!fullData || fullData.length === 0) && isSupabaseConfigured && supabase) {
      const { data: remoteData, error } = await supabase
        .from('staff_backups')
        .select('snapshot_data')
        .eq('id', backupId)
        .maybeSingle();

      if (!error && remoteData?.snapshot_data && Array.isArray(remoteData.snapshot_data)) {
        fullData = remoteData.snapshot_data;
        // Cache to local IDB for fast future access
        saveDatasetToIDB(backupId, fullData);
      }
    }

    if (!fullData || !Array.isArray(fullData) || fullData.length === 0) {
      throw new Error('Backup dataset could not be loaded from storage or cloud.');
    }

    activeRestoredDatasetCache = fullData;

    localStorage.setItem(ACTIVE_OVERRIDE_META_KEY, JSON.stringify({
      id: target.id,
      label: target.label,
      createdAt: target.createdAt,
      recordCount: target.recordCount,
      filledCount: target.filledCount,
      vacantCount: target.vacantCount,
      abolishedCount: target.abolishedCount
    }));

    window.dispatchEvent(new Event('dghs_backup_restored'));
    return {
      ...target,
      data: fullData
    };
  } catch (err) {
    console.error('Failed to restore backup:', err);
    throw err;
  }
}

export function clearBackupOverride() {
  activeRestoredDatasetCache = null;
  localStorage.removeItem(ACTIVE_OVERRIDE_META_KEY);
  window.dispatchEvent(new Event('dghs_backup_restored'));
}