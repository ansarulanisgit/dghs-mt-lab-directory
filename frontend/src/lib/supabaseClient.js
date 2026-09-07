import { createClient } from '@supabase/supabase-js';
import scrapedData from './scraped_records.json';
import syncMetadata from './sync_metadata.json';

const DEFAULT_SUPABASE_URL = 'https://xiwrfifchvfrjdwyolif.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd3JmaWZjaHZmcmpkd3lvbGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjQzNDUsImV4cCI6MjEwMzg0MDM0NX0.mBSI2P32tlL4CQfm2MZ0Gqy8nXAVoCZqZsPvDJWjFdY';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Complete dataset of scraped staff records used for local offline preview / demo mode
export const MOCK_STAFF = scrapedData && scrapedData.length > 0 ? scrapedData : [];

// Canonical centralized synchronization metadata with persistent anchor timestamp
export const MOCK_METADATA = syncMetadata && syncMetadata.last_run_at ? syncMetadata : {
  last_run_at: '2026-08-30T19:50:00.000Z',
  record_count: MOCK_STAFF.length,
  filled_count: 6516,
  vacant_count: 3259,
  abolished_count: 252,
  failed_count: 0,
  schedule_interval_days: 7
};