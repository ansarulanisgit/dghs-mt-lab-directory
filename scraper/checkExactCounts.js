import { chromium } from 'playwright';
import { login } from './login.js';
import { buildDataTableUrl } from './searchModal.js';

async function checkExactCounts() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[check] Opening posting page to authorize session...');
  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const searchQueries = [
    'Pharmacist',
    'Medical Technologist',
    'Sr. Medical Technologist',
    'Chief Medical Technologist',
    'Medical Technologist (Lab)'
  ];

  console.log('\n===============================================================');
  console.log('--- NATIONWIDE DATA COUNTS VIA POST-SEARCH DATATABLE ---');
  console.log('===============================================================');

  for (const q of searchQueries) {
    const res = await page.evaluate(async ({ query, buildUrlCode }) => {
      const buildUrl = new Function('query', 'start', 'length', buildUrlCode);
      const url = buildUrl(query, 0, 10);
      const response = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const json = await response.json();
      return {
        recordsTotal: json.recordsTotal,
        recordsFiltered: json.recordsFiltered,
        sampleDesignations: (json.data || []).map(d => (d.designation_name || '').replace(/<[^>]*>/g, '').trim())
      };
    }, {
      query: q,
      buildUrlCode: `
        const params = new URLSearchParams({
          'draw': '1',
          'start': String(start),
          'length': String(length),
          'search[value]': query,
          'search[regex]': 'false',
          'columns[0][data]': 'id',
          'columns[0][name]': 'sanctioned_posts.id',
          'columns[0][searchable]': 'true',
          'columns[0][orderable]': 'true',
          'columns[1][data]': 'name',
          'columns[1][name]': 'sanctioned_posts.name',
          'columns[1][searchable]': 'true',
          'columns[1][orderable]': 'true',
          'columns[2][data]': 'designation_name',
          'columns[2][name]': 'sanctioned_posts.designation_name',
          'columns[2][searchable]': 'true',
          'columns[2][orderable]': 'true',
          'columns[3][data]': 'designation_pay_scale_name',
          'columns[3][name]': 'sanctioned_posts.designation_pay_scale_name',
          'columns[3][searchable]': 'true',
          'columns[4][data]': 'status_name',
          'columns[4][name]': 'sanctioned_posts.status_name',
          'columns[4][searchable]': 'true',
          'columns[5][data]': 'action',
          'columns[5][name]': 'sanctioned_posts.id',
          'columns[5][searchable]': 'true',
          'order[0][column]': '0',
          'order[0][dir]': 'desc'
        });
        return 'https://hrm.dghs.gov.bd/datatable/post-search-datatable?' + params.toString();
      `
    });

    console.log(`-> "${q}": ${res.recordsFiltered?.toLocaleString()} records (Sample: ${res.sampleDesignations.slice(0, 3).join(', ')})`);
  }

  // Also check reports menu on the portal
  console.log('\n--- Checking Left Sidebar Reports ---');
  const reportLinks = [
    'https://hrm.dghs.gov.bd/reports/hr-status',
    'https://hrm.dghs.gov.bd/reports/post-summary',
    'https://hrm.dghs.gov.bd/reports/retirement-summary',
    'https://hrm.dghs.gov.bd/upcoming-retirements'
  ];

  for (const url of reportLinks) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`URL: ${url} -> Status: ${res.status()}`);
    } catch (e) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }

  await browser.close();
}

checkExactCounts().catch(console.error);
