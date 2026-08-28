import { openPostSearchModal } from './navigateToPosting.js';

export function buildDataTableUrl(query, start = 0, length = 100) {
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
  return `https://hrm.dghs.gov.bd/datatable/post-search-datatable?${params.toString()}`;
}

export async function searchModal(page, query = 'Medical Technologist (Lab)') {
  console.log(`[searchModal] Opening Sanctioned Post search modal...`);
  const modal = await openPostSearchModal(page);

  console.log(`[searchModal] Searching for: "${query}" in DataTable...`);
  const searchInput = modal.locator('input[type="search"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill(query);

  await page.waitForTimeout(2500);

  const summary = await page.evaluate(async (dtUrl) => {
    const res = await fetch(dtUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const json = await res.json();
    return {
      recordsTotal: json.recordsTotal,
      recordsFiltered: json.recordsFiltered
    };
  }, buildDataTableUrl(query, 0, 10));

  console.log(`[searchModal] Total matching records: ${summary.recordsFiltered} (Total unfiltered in system: ${summary.recordsTotal})`);
  return { modal, totalCount: summary.recordsFiltered };
}

export async function collectAllPostIds(page, query = 'Medical Technologist (Lab)', batchSize = 250, maxLimit = null) {
  console.log(`[searchModal] Collecting post entries for query: "${query}"${maxLimit ? ` (Limit: ${maxLimit})` : ''}...`);
  
  const allPosts = await page.evaluate(async ({ query, batchSize, maxLimit, buildUrlCode }) => {
    const buildUrl = new Function('query', 'start', 'length', buildUrlCode);
    const list = [];
    let start = 0;
    const effectiveBatch = maxLimit && maxLimit < batchSize ? maxLimit : batchSize;

    const initialUrl = buildUrl(query, 0, effectiveBatch);
    const initialRes = await fetch(initialUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const initialJson = await initialRes.json();
    
    const total = initialJson.recordsFiltered || 0;
    if (initialJson.data) {
      for (const item of initialJson.data) {
        const idMatch = (item.id || '').match(/\/sanctioned-posts\/(\d+)\/edit/);
        list.push({
          postId: idMatch ? idMatch[1] : null,
          title: (item.name || '').replace(/<[^>]*>/g, '').trim(),
          designationName: (item.designation_name || '').replace(/<[^>]*>/g, '').trim(),
          status: item.status_name || '',
          facilityId: item.facility_id
        });
        if (maxLimit && list.length >= maxLimit) break;
      }
    }

    start += effectiveBatch;

    while (start < total && (!maxLimit || list.length < maxLimit)) {
      const fetchCount = maxLimit ? Math.min(batchSize, maxLimit - list.length) : batchSize;
      const pageUrl = buildUrl(query, start, fetchCount);
      const pageRes = await fetch(pageUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const pageJson = await pageRes.json();
      if (!pageJson.data || pageJson.data.length === 0) break;

      for (const item of pageJson.data) {
        const idMatch = (item.id || '').match(/\/sanctioned-posts\/(\d+)\/edit/);
        list.push({
          postId: idMatch ? idMatch[1] : null,
          title: (item.name || '').replace(/<[^>]*>/g, '').trim(),
          designationName: (item.designation_name || '').replace(/<[^>]*>/g, '').trim(),
          status: item.status_name || '',
          facilityId: item.facility_id
        });
        if (maxLimit && list.length >= maxLimit) break;
      }

      start += fetchCount;
    }

    return { total, list: list.filter(p => p.postId) };
  }, {
    query,
    batchSize,
    maxLimit,
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

  console.log(`[searchModal] Successfully collected ${allPosts.list.length} post IDs out of ${allPosts.total} filtered entries.`);
  return allPosts.list;
}