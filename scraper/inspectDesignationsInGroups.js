import { chromium } from 'playwright';
import { login } from './login.js';

async function inspectDesignations() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[inspect] Navigating to posting page for nationwide distinct designations...');
  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const queries = ['Pharmacist', 'Medical Technologist', 'Sr. Medical Technologist', 'Chief Medical Technologist'];
  
  const distinctDesignations = await page.evaluate(async (queries) => {
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

    const designationMap = {}; // designationName -> count

    for (const q of queries) {
      let start = 0;
      const batch = 500;
      
      const initRes = await fetch(buildUrl(q, 0, batch), { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const initJson = await initRes.json();
      const total = initJson.recordsFiltered || 0;

      if (initJson.data) {
        for (const item of initJson.data) {
          const desig = (item.designation_name || '').replace(/<[^>]*>/g, '').trim();
          if (desig) {
            designationMap[desig] = (designationMap[desig] || 0) + 1;
          }
        }
      }

      start += batch;
      while (start < total) {
        const pRes = await fetch(buildUrl(q, start, batch), { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const pJson = await pRes.json();
        if (!pJson.data || pJson.data.length === 0) break;

        for (const item of pJson.data) {
          const desig = (item.designation_name || '').replace(/<[^>]*>/g, '').trim();
          if (desig) {
            designationMap[desig] = (designationMap[desig] || 0) + 1;
          }
        }
        start += batch;
      }
    }

    return designationMap;
  }, queries);

  console.log('\n=============================================================');
  console.log(`TOTAL DISTINCT DESIGNATIONS: ${Object.keys(distinctDesignations).length}`);
  console.log('=============================================================');
  
  const sorted = Object.entries(distinctDesignations).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([desig, count], idx) => {
    console.log(`${String(idx + 1).padStart(2, ' ')}. ${desig} => ${count.toLocaleString()} posts`);
  });

  await browser.close();
}

inspectDesignations().catch(console.error);
