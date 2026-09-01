// Application System & Scraper Configuration Store
// Synchronized globally across all devices & Vercel deployment with Supabase real-time cloud support

import { supabase, isSupabaseConfigured } from './supabaseClient';

export const DEFAULT_CONFIG = {
  portalLoginUrl: 'https://hrm.dghs.gov.bd/login',
  portalUsername: 'neyamatpur@uhfpo.dghs.gov.bd',
  portalPassword: 'uhcN#2023',
  postingUrls: [
    'https://hrm.dghs.gov.bd/postings/create?provider_id=159165',
    'https://hrm.dghs.gov.bd/postings/create?provider_id=14436',
    'https://hrm.dghs.gov.bd/postings/create?provider_id=6363',
    'https://hrm.dghs.gov.bd/postings/create?provider_id=194744'
  ],
  scheduleIntervalDays: 7, // Configurable interval in days
  appTitle: 'DGHS Employee Directory',
  appSubtitle: 'Central Directory of Medical Technologists and Pharmacists',
  footerText: 'DGHS Employee Directory - Developed By Ansarul Anis',
  designatedSearchQuery: 'Medical Technologist',
  adminEmail: 'ansarul.contact@gmail.com',
  adminPassword: 'Ansarul@233'
};

const STORAGE_CONFIG_KEY = 'dghs_system_config_v2';
let inMemoryConfigCache = null;

export function getSystemConfig() {
  if (inMemoryConfigCache) return inMemoryConfigCache;
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) {
      inMemoryConfigCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
    const parsed = JSON.parse(raw);
    inMemoryConfigCache = { ...DEFAULT_CONFIG, ...parsed };
    return inMemoryConfigCache;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSystemConfig(newConfig) {
  const merged = { ...DEFAULT_CONFIG, ...newConfig };
  inMemoryConfigCache = merged;
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('dghs_config_updated', { detail: merged }));

  // Asynchronously sync to Supabase cloud if connected
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('system_config')
      .upsert({
        id: 1,
        config_data: merged,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('Supabase config sync skipped:', error.message);
      })
      .catch((err) => console.warn('Supabase config sync exception:', err));
  }
}

export async function syncConfigWithCloud() {
  if (!isSupabaseConfigured || !supabase) {
    return getSystemConfig();
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_data')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data?.config_data) {
      const merged = { ...DEFAULT_CONFIG, ...data.config_data };
      inMemoryConfigCache = merged;
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('dghs_config_updated', { detail: merged }));
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch cloud config, using local cache:', err);
  }

  return getSystemConfig();
}

export function resetSystemConfig() {
  inMemoryConfigCache = DEFAULT_CONFIG;
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  window.dispatchEvent(new CustomEvent('dghs_config_updated', { detail: DEFAULT_CONFIG }));

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('system_config')
      .upsert({
        id: 1,
        config_data: DEFAULT_CONFIG,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .catch((err) => console.warn('Supabase reset exception:', err));
  }

  return DEFAULT_CONFIG;
}