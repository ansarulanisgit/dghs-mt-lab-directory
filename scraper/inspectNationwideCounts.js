import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from './login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectNationwideCounts() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[inspect] Navigating to posting page...');
  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Test the post-search-datatable endpoint with different searches
  const queries = [
    'Pharmacist',
    'Medical Technologist',
    'Sr. Medical Technologist',
    'Chief Medical Technologist',
    'Medical Technologist (Lab)',
    'Medical Technologist (Dental)',
    'Medical Technologist (Radiology)',
    'Medical Technologist (Physiotherapy)',
    'Medical Technologist (Radiotherapy)',
    'Medical Technologist (Blood Bank)'
  ];

  console.log('\n===============================================================');
  console.log('--- NATIONWIDE SANCTIONED POST SEARCH (All Bangladesh: 214,662 Posts) ---');
  console.log('===============================================================');

  for (const q of queries) {
    const result = await page.evaluate(async (searchQuery) => {
      const params = new URLSearchParams({
        'draw': '1',
        'start': '0',
        'length': '1',
        'search[value]': searchQuery,
        'search[regex]': 'false',
        'provider_id': '159165'
      });
      const url = `https://hrm.dghs.gov.bd/datatable/post-search-datatable?${params.toString()}`;
      const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const json = await res.json();
      return {
        recordsTotal: json.recordsTotal,
        recordsFiltered: json.recordsFiltered
      };
    }, q);

    console.log(`-> Query: "${q}" => Total Nationwide Entries: ${result.recordsFiltered?.toLocaleString()}`);
  }

  // Also check if there are other report endpoints
  const reportUrls = [
    'https://hrm.dghs.gov.bd/reports/sanctioned-post-summary',
    'https://hrm.dghs.gov.bd/reports/sanctioned-posts',
    'https://hrm.dghs.gov.bd/reports/designations',
    'https://hrm.dghs.gov.bd/reports/staff-summary'
  ];

  console.log('\n--- Checking Reports URLs ---');
  for (const url of reportUrls) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`URL: ${url} -> Status: ${res.status()}`);
    } catch (e) {
      console.log(`URL: ${url} -> Failed: ${e.message}`);
    }
  }

  await browser.close();
}

inspectNationwideCounts().catch(console.error);
