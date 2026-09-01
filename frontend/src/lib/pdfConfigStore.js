// PDF Column Configuration Store
// Synchronized globally across all devices & Vercel deployment with Supabase real-time cloud support

import { supabase, isSupabaseConfigured } from './supabaseClient';

export const AVAILABLE_PDF_COLUMNS = [
  { id: 'sl', label: 'SL', default: true, description: 'Serial row number (1, 2, 3...)' },
  { id: 'post_id', label: 'POST ID', default: true, description: 'Sanctioned Post identification number' },
  { id: 'name', label: 'NAME', default: true, description: 'Full staff name / post state' },
  { id: 'designation', label: 'DESIGNATION', default: true, description: 'Official designation title' },
  { id: 'status', label: 'STATUS', default: true, description: 'Filled, Vacant or Abolished status' },
  { id: 'hris_id', label: 'HRIS ID', default: true, description: 'Government HRIS account number' },
  { id: 'contact_no', label: 'CONTACT NO', default: true, description: 'Contact phone / mobile number' },
  { id: 'nid', label: 'NID', default: false, description: 'National Identification number' },
  { id: 'address', label: 'ADDRESS', default: false, description: 'Upazila, District, Division posting location' },
  { id: 'institute', label: 'INSTITUTE / FACILITY', default: true, description: 'Current posted healthcare facility / institute' },
  { id: 'prl_date', label: 'PRL DATE', default: true, description: 'Post-retirement leave effective date' }
];

export const DEFAULT_COLUMN_ORDER = [
  'sl', 'post_id', 'name', 'designation', 'status', 'hris_id', 'contact_no', 'nid', 'address', 'institute', 'prl_date'
];

export const DEFAULT_PDF_CONFIG = {
  selectedColumns: ['sl', 'post_id', 'name', 'designation', 'status', 'hris_id', 'contact_no', 'institute', 'prl_date'],
  columnOrder: ['sl', 'post_id', 'name', 'designation', 'status', 'hris_id', 'contact_no', 'nid', 'address', 'institute', 'prl_date']
};

const STORAGE_PDF_CONFIG_KEY = 'dghs_pdf_column_config_v2';
let inMemoryPdfConfigCache = null;

export function getPdfColumnsConfig() {
  if (inMemoryPdfConfigCache) return inMemoryPdfConfigCache;
  try {
    const raw = localStorage.getItem(STORAGE_PDF_CONFIG_KEY);
    if (!raw) {
      inMemoryPdfConfigCache = DEFAULT_PDF_CONFIG;
      return DEFAULT_PDF_CONFIG;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.selectedColumns || !Array.isArray(parsed.selectedColumns) || parsed.selectedColumns.length === 0) {
      inMemoryPdfConfigCache = DEFAULT_PDF_CONFIG;
      return DEFAULT_PDF_CONFIG;
    }

    const order = Array.isArray(parsed.columnOrder) && parsed.columnOrder.length > 0
      ? parsed.columnOrder
      : DEFAULT_COLUMN_ORDER;

    const completeOrder = [...order];
    AVAILABLE_PDF_COLUMNS.forEach(c => {
      if (!completeOrder.includes(c.id)) completeOrder.push(c.id);
    });

    inMemoryPdfConfigCache = {
      ...DEFAULT_PDF_CONFIG,
      ...parsed,
      columnOrder: completeOrder
    };
    return inMemoryPdfConfigCache;
  } catch {
    return DEFAULT_PDF_CONFIG;
  }
}

export function savePdfColumnsConfig(newConfig) {
  const merged = { ...DEFAULT_PDF_CONFIG, ...newConfig };
  inMemoryPdfConfigCache = merged;
  localStorage.setItem(STORAGE_PDF_CONFIG_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('dghs_pdf_columns_updated', { detail: merged }));

  // Asynchronously sync to Supabase cloud if connected
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('pdf_columns_config')
      .upsert({
        id: 1,
        config_data: merged,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('Supabase pdf config sync skipped:', error.message);
      })
      .catch((err) => console.warn('Supabase pdf config sync exception:', err));
  }
}

export async function syncPdfColumnsWithCloud() {
  if (!isSupabaseConfigured || !supabase) {
    return getPdfColumnsConfig();
  }

  try {
    const { data, error } = await supabase
      .from('pdf_columns_config')
      .select('config_data')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data?.config_data?.selectedColumns) {
      const merged = { ...DEFAULT_PDF_CONFIG, ...data.config_data };
      inMemoryPdfConfigCache = merged;
      localStorage.setItem(STORAGE_PDF_CONFIG_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('dghs_pdf_columns_updated', { detail: merged }));
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch cloud pdf column config, using local cache:', err);
  }

  return getPdfColumnsConfig();
}

export function resetPdfColumnsConfig() {
  inMemoryPdfConfigCache = DEFAULT_PDF_CONFIG;
  localStorage.setItem(STORAGE_PDF_CONFIG_KEY, JSON.stringify(DEFAULT_PDF_CONFIG));
  window.dispatchEvent(new CustomEvent('dghs_pdf_columns_updated', { detail: DEFAULT_PDF_CONFIG }));

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('pdf_columns_config')
      .upsert({
        id: 1,
        config_data: DEFAULT_PDF_CONFIG,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .catch((err) => console.warn('Supabase reset exception:', err));
  }

  return DEFAULT_PDF_CONFIG;
}
