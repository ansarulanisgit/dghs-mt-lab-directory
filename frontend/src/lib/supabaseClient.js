import { createClient } from '@supabase/supabase-js';
import scrapedData from './scraped_records.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Complete dataset of scraped staff records used for local offline preview / demo mode
export const MOCK_STAFF = scrapedData && scrapedData.length > 0 ? scrapedData : [];

export const MOCK_METADATA = {
  last_run_at: new Date().toISOString(),
  record_count: MOCK_STAFF.length,
  failed_count: 0
};