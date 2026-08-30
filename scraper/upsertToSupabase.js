import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Skipping remote database upsert.');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

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

  console.log(`[Supabase] Upserting ${records.length} records into 'mt_lab_staff' (keyed on post_id)...`);

  // Batch in chunks of 100 for reliable database network transactions
  const chunkSize = 100;
  let totalUpserted = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('mt_lab_staff')
      .upsert(chunk, { onConflict: 'post_id', ignoreDuplicates: false });

    if (error) {
      console.error(`[Supabase] Error upserting chunk ${i / chunkSize + 1}:`, error.message);
      throw error;
    }
    totalUpserted += chunk.length;
  }

  console.log(`[Supabase] Successfully upserted ${totalUpserted} records.`);
  return { count: totalUpserted };
}

export async function updateScrapeMetadata(recordCount, failedCount) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log(`[Supabase] Metadata update skipped (dry-run): Records=${recordCount}, Failed=${failedCount}`);
    return;
  }

  console.log(`[Supabase] Updating 'scrape_metadata': Records=${recordCount}, Failed=${failedCount}...`);
  const { error } = await supabase
    .from('scrape_metadata')
    .upsert({
      id: 1,
      last_run_at: new Date().toISOString(),
      record_count: recordCount,
      failed_count: failedCount
    }, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase] Failed to update scrape_metadata:', error.message);
  } else {
    console.log('[Supabase] scrape_metadata successfully updated.');
  }
}