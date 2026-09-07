import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const DEFAULT_SUPABASE_URL = 'https://xiwrfifchvfrjdwyolif.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd3JmaWZjaHZmcmpkd3lvbGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjQzNDUsImV4cCI6MjEwMzg0MDM0NX0.mBSI2P32tlL4CQfm2MZ0Gqy8nXAVoCZqZsPvDJWjFdY';

export const MAX_CLOUD_BACKUPS = 5;

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase] Warning: SUPABASE_URL or API Key not configured. Running in local mode.');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Checks if a scrape run is due based on the configured schedule interval
 */
export async function checkIfUpdateDue(options = {}) {
  // If force flag passed in options or CLI args, run immediately
  if (options.force || process.argv.includes('--force') || process.argv.includes('-f')) {
    return { isDue: true, reason: 'Manual or forced execution override (--force)' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { isDue: true, reason: 'Local mode without remote Supabase' };
  }

  try {
    // 1. Fetch configured schedule interval
    let scheduleIntervalDays = 7;
    const { data: configData } = await supabase
      .from('system_config')
      .select('config_data')
      .eq('id', 1)
      .maybeSingle();

    if (configData?.config_data?.scheduleIntervalDays) {
      scheduleIntervalDays = parseInt(configData.config_data.scheduleIntervalDays, 10) || 7;
    }

    // 2. Fetch last scrape timestamp
    const { data: metaData } = await supabase
      .from('scrape_metadata')
      .select('last_run_at')
      .eq('id', 1)
      .maybeSingle();

    const lastRunAt = metaData?.last_run_at;
    if (!lastRunAt) {
      return { isDue: true, intervalDays: scheduleIntervalDays, reason: 'Initial scrape execution' };
    }

    const elapsedMs = Date.now() - new Date(lastRunAt).getTime();
    const intervalMs = scheduleIntervalDays * 24 * 60 * 60 * 1000;

    if (elapsedMs < intervalMs) {
      const remainingHours = ((intervalMs - elapsedMs) / (1000 * 60 * 60)).toFixed(1);
      const remainingDays = (remainingHours / 24).toFixed(1);
      return {
        isDue: false,
        intervalDays: scheduleIntervalDays,
        lastRunAt,
        daysRemaining: remainingDays,
        hoursRemaining: remainingHours,
        reason: `Current schedule interval is ${scheduleIntervalDays} days. Last run was ${lastRunAt}. Next auto-update due in ~${remainingDays} days (~${remainingHours} hours).`
      };
    }

    return {
      isDue: true,
      intervalDays: scheduleIntervalDays,
      lastRunAt,
      reason: `Schedule interval of ${scheduleIntervalDays} days elapsed.`
    };
  } catch (err) {
    console.warn('[Schedule Check] Warning checking schedule:', err.message);
    return { isDue: true, reason: 'Fallback to execute due to check error: ' + err.message };
  }
}

/**
 * Creates an automatic point-in-time cloud backup snapshot in `staff_backups`
 * BEFORE updating or replacing staff_records in Supabase.
 */
export async function createPreUpdateBackup() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[Backup] Skipping cloud backup creation (no Supabase client).');
    return null;
  }

  try {
    console.log('[Backup] Fetching current dataset snapshot for automated pre-update cloud backup...');
    
    // 1. Fetch current live dataset (from local JSON if available or from Supabase)
    let currentRecords = [];
    const localJsonPath = path.join(__dirname, 'scraped_records.json');
    if (fs.existsSync(localJsonPath)) {
      try {
        const raw = fs.readFileSync(localJsonPath, 'utf8');
        currentRecords = JSON.parse(raw);
      } catch {
        // Fallback to query
      }
    }

    if (!currentRecords || currentRecords.length === 0) {
      // Query current staff_records from Supabase in batches
      const { data: remoteData, error } = await supabase
        .from('staff_records')
        .select('*')
        .limit(10500);

      if (!error && Array.isArray(remoteData) && remoteData.length > 0) {
        currentRecords = remoteData;
      }
    }

    if (!currentRecords || currentRecords.length === 0) {
      console.log('[Backup] No existing records found to backup. Proceeding with initial data sync.');
      return null;
    }

    const backupId = `backup_${Date.now()}`;
    const dateFormatted = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB');
    const label = `Automated Pre-Update Backup (${dateFormatted})`;

    console.log(`[Backup] Saving snapshot of ${currentRecords.length} records into 'staff_backups' (${backupId})...`);

    const { error: insertError } = await supabase
      .from('staff_backups')
      .upsert({
        id: backupId,
        label,
        created_at: new Date().toISOString(),
        record_count: currentRecords.length,
        snapshot_data: currentRecords,
        is_auto: true
      });

    if (insertError) {
      console.error('[Backup] Failed to insert cloud backup snapshot:', insertError.message);
    } else {
      console.log(`[Backup] Cloud backup snapshot "${label}" successfully stored in Supabase.`);
    }

    // 2. Cloud Cleanup: Retain strictly the MAX_CLOUD_BACKUPS (5) newest versions
    const { data: allBackups } = await supabase
      .from('staff_backups')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (allBackups && allBackups.length > MAX_CLOUD_BACKUPS) {
      const staleBackups = allBackups.slice(MAX_CLOUD_BACKUPS);
      const staleIds = staleBackups.map(b => b.id);
      console.log(`[Backup] Trimming ${staleIds.length} older backups in cloud to maintain 5-version limit...`);
      await supabase.from('staff_backups').delete().in('id', staleIds);
    }

    return backupId;
  } catch (err) {
    console.error('[Backup] Exception creating pre-update cloud backup:', err);
    return null;
  }
}

/**
 * Upserts / Replaces all staff records in Supabase `staff_records` table
 */
export async function upsertStaffRecords(records) {
  if (!records || records.length === 0) {
    console.log('[Supabase] No staff records to upsert.');
    return { count: 0 };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log(`[Supabase] Simulating upsert for ${records.length} records (local / dry-run mode).`);
    return { count: records.length, dryRun: true };
  }

  console.log(`[Supabase] Upserting & synchronizing ${records.length} records into 'staff_records'...`);

  // Map to exact database schema
  const dbRecords = records.map(r => ({
    id: r.id,
    post_id: String(r.post_id || ''),
    name: r.name || '',
    designation: r.designation || '',
    status: r.status || 'Vacant',
    discipline: r.major_discipline || r.discipline || '',
    designation_group: r.designation_group || '',
    hris_id: r.hris_id || '',
    contact_info: r.contact_no || r.contact_info || '',
    current_institute: r.facility || r.current_institute || '',
    prl_date: r.prl_date ? (String(r.prl_date).split('T')[0] || null) : null,
    nid: r.national_id || r.nid || '',
    email: r.email || '',
    address: r.address || '',
    division: r.division || '',
    district: r.district || '',
    upazila: r.upazila || '',
    updated_at: new Date().toISOString()
  }));

  // Batch in chunks of 100 for reliable network operations
  const chunkSize = 100;
  let totalUpserted = 0;

  for (let i = 0; i < dbRecords.length; i += chunkSize) {
    const chunk = dbRecords.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('staff_records')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`[Supabase] Error upserting chunk ${Math.floor(i / chunkSize) + 1}:`, error.message);
      // Retry once on failure
      const { error: retryError } = await supabase
        .from('staff_records')
        .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
      if (retryError) {
        throw retryError;
      }
    }
    totalUpserted += chunk.length;
  }

  console.log(`[Supabase] Successfully upserted and synchronized ${totalUpserted} records in 'staff_records'.`);
  return { count: totalUpserted };
}

/**
 * Updates central `scrape_metadata` record (id: 1)
 */
export async function updateScrapeMetadata(recordCount, filledCount, vacantCount, abolishedCount, failedCount = 0, intervalDays = 7) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log(`[Supabase] Metadata update skipped (dry-run): Records=${recordCount}`);
    return;
  }

  const nowIso = new Date().toISOString();
  console.log(`[Supabase] Updating 'scrape_metadata': Total=${recordCount}, Filled=${filledCount}, Vacant=${vacantCount}, Abolished=${abolishedCount}, Interval=${intervalDays}d...`);
  
  const { error } = await supabase
    .from('scrape_metadata')
    .upsert({
      id: 1,
      last_run_at: nowIso,
      record_count: recordCount,
      filled_count: filledCount,
      vacant_count: vacantCount,
      abolished_count: abolishedCount,
      failed_count: failedCount,
      schedule_interval_days: intervalDays,
      status: 'idle',
      updated_at: nowIso
    }, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase] Failed to update scrape_metadata:', error.message);
  } else {
    console.log('[Supabase] scrape_metadata successfully updated & broadcasted.');
  }
}