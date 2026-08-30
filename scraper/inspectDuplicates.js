import { chromium } from 'playwright';
import { login } from './login.js';
import { cleanText } from './harvestAll10027Posts.js';

async function inspectOverlap() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const overlapData = await page.evaluate(async () => {
    const buildUrl = (query, start = 0, length = 500) => {
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

    const fetchAll = async (query) => {
      const list = [];
      let start = 0;
      const batchSize = 500;
      const initUrl = buildUrl(query, 0, batchSize);
      const initRes = await fetch(initUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const initJson = await initRes.json();
      const total = initJson.recordsFiltered || 0;
      if (initJson.data) list.push(...initJson.data);
      start += batchSize;
      while (start < total) {
        const pUrl = buildUrl(query, start, batchSize);
        const pRes = await fetch(pUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const pJson = await pRes.json();
        if (!pJson.data || pJson.data.length === 0) break;
        list.push(...pJson.data);
        start += batchSize;
      }
      return { total, list };
    };

    const pharm = await fetchAll('Pharmacist');
    const mt = await fetchAll('Medical Technologist');

    const pharmPostIds = new Set(pharm.list.map(r => (r.id.match(/\/sanctioned-posts\/(\d+)\/edit/) || [])[1]));
    const mtPostIds = new Set(mt.list.map(r => (r.id.match(/\/sanctioned-posts\/(\d+)\/edit/) || [])[1]));

    const overlap = [];
    for (const item of pharm.list) {
      const id = (item.id.match(/\/sanctioned-posts\/(\d+)\/edit/) || [])[1];
      if (id && mtPostIds.has(id)) {
        overlap.push({
          id,
          name: item.name.replace(/<[^>]*>/g, '').trim(),
          designation: item.designation_name.replace(/<[^>]*>/g, '').trim(),
          status: item.status_name
        });
      }
    }

    return {
      pharmTotal: pharm.total,
      mtTotal: mt.total,
      sum: pharm.total + mt.total,
      overlapCount: overlap.length,
      overlapSample: overlap.slice(0, 10),
      uniqueCount: new Set([...pharmPostIds, ...mtPostIds]).size
    };
  });

  console.log('Overlap Analysis:', JSON.stringify(overlapData, null, 2));
  await browser.close();
}

inspectOverlap().catch(console.error);
