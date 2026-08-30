import { chromium } from 'playwright';
import { login } from './login.js';

async function calculateUnionCount() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const queries = ['Pharmacist', 'Medical Technologist', 'Sr. Medical Technologist', 'Chief Medical Technologist'];
  
  const results = await page.evaluate(async (queries) => {
    const buildUrl = (query, start = 0, length = 100) => {
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
    };

    const counts = {};
    for (const q of queries) {
      const res = await fetch(buildUrl(q, 0, 10), { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const json = await res.json();
      counts[q] = json.recordsFiltered || 0;
    }

    return counts;
  }, queries);

  console.log('Results breakdown:', results);
  await browser.close();
}

calculateUnionCount().catch(console.error);
