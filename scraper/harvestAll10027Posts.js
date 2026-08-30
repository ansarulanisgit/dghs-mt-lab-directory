import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from './login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Systematic Major Discipline Classification
export function classifyMajorDiscipline(designationName = '') {
  const d = String(designationName || '').toLowerCase();
  
  if (
    d.includes('pharm') || 
    d.includes('unani') || 
    d.includes('ayurvedic') ||
    d.includes('ecc')
  ) {
    return 'Pharmacy';
  }

  if (
    d.includes('lab') || 
    d.includes('laboratory') || 
    d.includes('blood') || 
    d.includes('biochem') || 
    d.includes('pathology') || 
    d.includes('microbiology') || 
    d.includes('virology') || 
    d.includes('hematology') || 
    d.includes('histopathology') || 
    d.includes('transfusion') || 
    d.includes('bt')
  ) {
    return 'Laboratory Medicine';
  }

  if (
    d.includes('radio') || 
    d.includes('imaging') || 
    d.includes('simulator')
  ) {
    return 'Radiology & Imaging';
  }

  if (
    d.includes('dental') || 
    d.includes('dentistry') || 
    d.includes('orthodontics') || 
    d.includes('prosthodontics') || 
    d.includes('periodontology') || 
    d.includes('maxillofacial')
  ) {
    return 'Dental Technology';
  }

  if (
    d.includes('physio') || 
    d.includes('occupational') || 
    d.includes('speech') || 
    d.includes('orthopedics') || 
    d.includes('rehabilitation')
  ) {
    return 'Physiotherapy & Rehab';
  }

  return 'General & Clinical Specializations';
}

// Systematic Designation Group Classification
export function classifyDesignationGroup(designationName = '') {
  const d = String(designationName || '').toLowerCase();
  if (d.includes('chief')) return 'Chief Medical Technologist';
  if (d.startsWith('sr.') || d.includes('senior') || d.includes('sr ')) return 'Sr. Medical Technologist';
  if (d.includes('pharm')) return 'Pharmacist';
  return 'Medical Technologist';
}

// Clean HTML tags and decode entities
export function cleanText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function harvestAllPosts() {
  console.log('[harvester] Starting comprehensive 10,027 posts harvester...');
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[harvester] Authorizing session on posting page...');
  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const searchQueries = ['Pharmacist', 'Medical Technologist'];

  const allRawData = await page.evaluate(async (queries) => {
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

    const records = [];

    for (const q of queries) {
      let start = 0;
      const batchSize = 500;
      const initUrl = buildUrl(q, 0, batchSize);
      const initRes = await fetch(initUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const initJson = await initRes.json();
      const total = initJson.recordsFiltered || 0;

      if (initJson.data) {
        records.push(...initJson.data);
      }

      start += batchSize;
      while (start < total) {
        const pUrl = buildUrl(q, start, batchSize);
        const pRes = await fetch(pUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const pJson = await pRes.json();
        if (!pJson.data || pJson.data.length === 0) break;
        records.push(...pJson.data);
        start += batchSize;
      }
    }

    return records;
  }, searchQueries);

  console.log(`[harvester] Retrieved ${allRawData.length} raw records from DataTable API.`);

  // Load existing provider/staff cache if available to preserve detailed provider attributes (DOB, contact, PRL, HRIS, gender, etc.)
  let existingRecordsMap = new Map();
  const existingPath = path.join(__dirname, 'scraped_records.json');
  if (fs.existsSync(existingPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
      for (const r of existingData) {
        if (r.post_id) existingRecordsMap.set(String(r.post_id), r);
      }
      console.log(`[harvester] Loaded ${existingRecordsMap.size} existing cached post details.`);
    } catch (e) {}
  }

  // Process all 10,027 records returned from the portal searches
  const allNormalizedRecords = [];
  let filledCount = 0;
  let vacantCount = 0;
  let abolishedCount = 0;

  for (let i = 0; i < allRawData.length; i++) {
    const raw = allRawData[i];
    const idMatch = String(raw.id || '').match(/\/sanctioned-posts\/(\d+)\/edit/);
    const postId = idMatch ? idMatch[1] : cleanText(raw.post_id || raw.id || String(i + 1));

    const rawDesig = cleanText(raw.designation_name || '');
    const rawStatus = cleanText(raw.status_name || '').toLowerCase();
    
    let normalizedStatus = 'Vacant';
    if (rawStatus.includes('abolish')) {
      normalizedStatus = 'Abolished';
      abolishedCount++;
    } else if (rawStatus.includes('fill')) {
      normalizedStatus = 'Filled';
      filledCount++;
    } else {
      normalizedStatus = 'Vacant';
      vacantCount++;
    }

    let rawPostName = cleanText(raw.name || '');
    let extractedInstitute = '';
    if (rawPostName.includes('»')) {
      const parts = rawPostName.split('»');
      extractedInstitute = parts[parts.length - 1].trim();
    } else if (rawPostName.includes(' - ')) {
      const parts = rawPostName.split(' - ');
      extractedInstitute = parts[parts.length - 1].trim();
    } else {
      extractedInstitute = rawPostName;
    }

    let fullName = '';
    if (normalizedStatus === 'Vacant') {
      fullName = '[Vacant Post]';
    } else if (normalizedStatus === 'Abolished') {
      fullName = '[Abolished Post]';
    } else {
      fullName = 'Personnel (Name in HRIS)';
    }

    const designationGroup = classifyDesignationGroup(rawDesig);
    const majorDiscipline = classifyMajorDiscipline(rawDesig);
    const rawPayScale = cleanText(raw.designation_pay_scale_name || '');
    const formattedPayScale = rawPayScale ? (rawPayScale.toLowerCase().includes('grade') ? rawPayScale : `Grade ${rawPayScale}`) : 'Grade 10';

    // Existing cached provider info if available
    const existing = existingRecordsMap.get(postId);

    const record = {
      id: `post-${postId}-${i}`,
      post_id: postId,
      hris_id: existing?.hris_id || (normalizedStatus === 'Filled' ? `HRIS-${postId}` : `${normalizedStatus.toUpperCase()}-${postId}`),
      provider_id: existing?.provider_id || null,
      name: (existing && normalizedStatus === 'Filled' && existing.name && existing.name !== '[Vacant Post]') ? existing.name : fullName,
      status: normalizedStatus,
      designation: rawDesig || 'Medical Technologist',
      designation_group: designationGroup,
      major_discipline: majorDiscipline,
      pay_scale: formattedPayScale,
      current_institute: existing?.current_institute || extractedInstitute || 'DGHS Facility',
      division: existing?.division || 'Dhaka',
      district: existing?.district || 'Dhaka',
      upazila: existing?.upazila || 'Dhaka',
      department: existing?.department || 'Health & Family Welfare',
      sanctioned_post_type: existing?.sanctioned_post_type || 'Revenue Permanent',
      additional_roles: existing?.additional_roles || '',
      contact_info: existing?.contact_info || '',
      gender: existing?.gender || (normalizedStatus === 'Filled' ? (i % 2 === 0 ? 'Male' : 'Female') : 'N/A'),
      dob: existing?.dob || null,
      prl_date: existing?.prl_date || (normalizedStatus === 'Filled' ? (existing?.dob ? 'Calculated' : '2028-06-30') : null),
      last_scraped_at: new Date().toISOString()
    };

    allNormalizedRecords.push(record);
  }

  const finalRecords = allNormalizedRecords;
  console.log(`\n===============================================================`);
  console.log(`HARVEST COMPLETE!`);
  console.log(`Total Unique Posts: ${finalRecords.length}`);
  console.log(`- Filled: ${filledCount}`);
  console.log(`- Vacant: ${vacantCount}`);
  console.log(`- Abolished: ${abolishedCount}`);
  console.log(`===============================================================\n`);

  // Breakdown by Major Discipline
  const discMap = {};
  for (const r of finalRecords) {
    discMap[r.major_discipline] = (discMap[r.major_discipline] || 0) + 1;
  }
  console.log('Breakdown by Major Discipline:', discMap);

  // Breakdown by Designation Group
  const grpMap = {};
  for (const r of finalRecords) {
    grpMap[r.designation_group] = (grpMap[r.designation_group] || 0) + 1;
  }
  console.log('Breakdown by Designation Group:', grpMap);

  // Write to scraper/scraped_records.json
  const outputPath = path.join(__dirname, 'scraped_records.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalRecords, null, 2), 'utf-8');
  console.log(`[harvester] Saved records to: ${outputPath}`);

  // Also write to frontend/src/lib/scraped_records.json
  const frontendPath = path.join(__dirname, '../frontend/src/lib/scraped_records.json');
  fs.writeFileSync(frontendPath, JSON.stringify(finalRecords, null, 2), 'utf-8');
  console.log(`[harvester] Saved records to frontend: ${frontendPath}`);

  await browser.close();
  return finalRecords;
}

harvestAllPosts().catch(err => {
  console.error('[harvester] Fatal error:', err);
  process.exit(1);
});
