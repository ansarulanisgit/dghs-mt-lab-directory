// Application System & Scraper Configuration Store

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
  designatedSearchQuery: 'Medical Technologist (Lab)',
  adminEmail: 'ansarul.contact@gmail.com',
  adminPassword: 'Ansarul@233'
};

const STORAGE_CONFIG_KEY = 'dghs_system_config_v1';

export function getSystemConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSystemConfig(newConfig) {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
  window.dispatchEvent(new Event('dghs_config_updated'));
}

export function resetSystemConfig() {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  window.dispatchEvent(new Event('dghs_config_updated'));
  return DEFAULT_CONFIG;
}