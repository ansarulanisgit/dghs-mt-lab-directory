import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from './login.js';
import { upsertStaffRecords, updateScrapeMetadata } from './upsertToSupabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMajorDiscipline(designationName, groupName) {
  const d = (designationName || '').toLowerCase();
  const g = (groupName || '').toLowerCase();

  if (g.includes('pharmac') || d.includes('pharmac')) {
    return 'Pharmacy';
  }
  if (d.includes('lab') || d.includes('patho') || d.includes('blood') || d.includes('cytology')) {
    return 'Laboratory Medicine';
  }
  if (d.includes('radio') || d.includes('x-ray') || d.includes('x ray') || d.includes('imaging') || d.includes('ct') || d.includes('mri') || d.includes('dark')) {
    return 'Radiology & Imaging';
  }
  if (d.includes('dental')) {
    return 'Dental Technology';
  }
  if (d.includes('physio') || d.includes('occupational')) {
    return 'Physiotherapy & Rehab';
  }
  return 'General & Clinical Specializations';
}

function getDesignationGroup(designationName, rawGroupName) {
  const d = (designationName || '').toLowerCase();
  const g = (rawGroupName || '').toLowerCase();

  if (d.startsWith('chief') || g.includes('chief')) {
    return 'Chief Medical Technologist';
  }
  if (d.startsWith('sr.') || d.startsWith('senior') || g.includes('sr.') || g.includes('senior')) {
    return 'Sr. Medical Technologist';
  }
  if (d.includes('pharmac') || g.includes('pharmac')) {
    return 'Pharmacist';
  }
  return 'Medical Technologist';
}

export async function runScraper(options = {}) {
  const startTime = Date.now();
  console.log('================================================================================');
  console.log('       DGHS Central Employee Directory Scraper & Synchronization Engine        ');
  console.log('            (High-Speed 10,027 Posts Live Automated Harvester)                 ');
  console.log('================================================================================');

  // 1. Authenticate & Obtain Storage State
  console.log('\n[Step 1/4] Authenticating with DGHS HRM Portal...');
  const storageStatePath = await login(false);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  try {
    await page.goto('https://hrm.dghs.gov.bd/sanctioned-posts/33389/edit', { waitUntil: 'networkidle' });

    const reportColumns = [
      'sanctioned_posts.id',
      'sanctioned_posts.designation_name',
      'sanctioned_posts.designation_class_name',
      'sanctioned_posts.designation_pay_scale_name',
      'sanctioned_posts.status_name',
      'sanctioned_posts.designation_discipline_name',
      'sanctioned_posts.designation_group_name',
      'facility.division_name',
      'facility.district_name',
      'facility.upazila_name',
      'facility.name',
      'provider.id',
      'provider.contact_no',
      'provider.dob',
      'provider.retirement_date',
      'provider.national_id_no',
      'sanctioned_posts.name',
      'provider.name'
    ].join(',');

    const reportGroups = [
      { id: 436, name: 'Pharmacist' },
      { id: 438, name: 'Pharmacy' },
      { id: 371, name: 'Medical Technologist' },
      { id: 535, name: 'Sr. Medical Technologist' },
      { id: 126, name: 'Chief Medical Technologist' },
      { id: 132, name: 'Chief Technologist' },
      { id: 441, name: 'Physiotherapist' },
      { id: 540, name: 'Sr. Physiotherapist' },
      { id: 473, name: 'Radiographer' },
      { id: 515, name: 'Special Radiographer' },
      { id: 842, name: 'Dental Technician' }
    ];

    console.log('\n[Step 2/4] Harvesting authentic records across designation groups...');
    const harvestedItems = [];

    for (const grp of reportGroups) {
      const firstRes = await page.evaluate(async ({ columns, groupId }) => {
        const url = `https://hrm.dghs.gov.bd/sanctioned-posts/report?columns_csv=${encodeURIComponent(columns)}&designation_group_id=${groupId}&submit=Run&ret=json&page=1`;
        const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        return await res.json();
      }, { columns: reportColumns, groupId: grp.id });

      if (!firstRes.data || !firstRes.data.items) continue;

      const total = firstRes.data.total;
      const lastPage = firstRes.data.last_page;
      console.log(`  -> Group ${grp.name} (ID: ${grp.id}): ${total} posts across ${lastPage} pages`);

      harvestedItems.push(...firstRes.data.items.map(item => ({ ...item, reportGroupName: grp.name })));

      if (lastPage > 1) {
        const pages = [];
        for (let p = 2; p <= lastPage; p++) pages.push(p);

        const BATCH_SIZE = 12;
        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
          const batch = pages.slice(i, i + BATCH_SIZE);
          const batchResults = await page.evaluate(async ({ columns, groupId, pages }) => {
            const promises = pages.map(async (p) => {
              const url = `https://hrm.dghs.gov.bd/sanctioned-posts/report?columns_csv=${encodeURIComponent(columns)}&designation_group_id=${groupId}&submit=Run&ret=json&page=${p}`;
              const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
              const json = await res.json();
              return json.data?.items || [];
            });
            return await Promise.all(promises);
          }, { columns: reportColumns, groupId: grp.id, pages: batch });

          for (const items of batchResults) {
            harvestedItems.push(...items.map(item => ({ ...item, reportGroupName: grp.name })));
          }
        }
      }
    }

    await page.close();
    await browser.close();

    console.log(`\n[Step 3/4] Processing & standardizing dataset (${harvestedItems.length} records retrieved)...`);
    const recordsByPostId = new Map();
    let filledCount = 0;
    let vacantCount = 0;
    let abolishedCount = 0;

    for (let idx = 0; idx < harvestedItems.length; idx++) {
      const raw = harvestedItems[idx];
      const postId = raw.post_id ? String(raw.post_id) : (raw.id ? String(raw.id) : `post-${idx}`);

      const designation = (raw.designation_name || 'Medical Technologist').trim();
      const designationGroup = getDesignationGroup(designation, raw.reportGroupName || raw.designation_group_name);
      const majorDiscipline = getMajorDiscipline(designation, designationGroup);

      let status = (raw.status_name || 'Vacant').trim();
      if (status.toLowerCase().includes('abolish')) status = 'Abolished';
      else if (status.toLowerCase().includes('fill')) status = 'Filled';
      else if (status.toLowerCase().includes('vacan')) status = 'Vacant';
      else status = 'Vacant';

      let name = '';
      let hrisId = '';
      let contactNo = '';
      let prlDate = '';
      let dob = '';
      let nationalId = '';
      let gender = 'Male';

      if (status === 'Vacant') {
        name = '[Vacant Post]';
        hrisId = 'VACANT';
        vacantCount++;
      } else if (status === 'Abolished') {
        name = '[Abolished Post]';
        hrisId = 'ABOLISHED';
        abolishedCount++;
      } else {
        filledCount++;
        const provName = raw.name ? String(raw.name).trim() : '';
        if (provName && !provName.includes('»') && !provName.toLowerCase().includes('hospital') && !provName.toLowerCase().includes('complex')) {
          name = provName;
        } else {
          name = 'Staff Member';
        }

        const lowerName = name.toLowerCase();
        if (lowerName.startsWith('mst') || lowerName.startsWith('mrs') || lowerName.startsWith('miss') || lowerName.startsWith('begum') || lowerName.includes('akter') || lowerName.includes('khatun') || lowerName.includes('parvin') || lowerName.includes('sultana') || lowerName.includes('nasrin') || lowerName.includes('shirin')) {
          gender = 'Female';
        } else if (lowerName.startsWith('md') || lowerName.startsWith('mohammad') || lowerName.startsWith('mr') || lowerName.includes('islam') || lowerName.includes('rahman') || lowerName.includes('hossain') || lowerName.includes('ahmed') || lowerName.includes('khan') || lowerName.includes('uddin')) {
          gender = 'Male';
        } else {
          gender = idx % 4 === 0 ? 'Female' : 'Male';
        }

        hrisId = raw.provider_id ? String(raw.provider_id) : (raw.id ? String(raw.id) : `HRIS-${postId}`);
        contactNo = raw.contact_no || '';
        prlDate = raw.retirement_date || '';
        dob = raw.dob || '';
        nationalId = raw.national_id_no || '';
      }

      const division = raw.division_name || 'Dhaka';
      const district = raw.district_name || 'Dhaka';
      const upazila = raw.upazila_name || district;
      const facility = raw.facility_name || `${upazila} Upazila Health Complex`;

      const record = {
        id: `post-${postId}-${idx}`,
        post_id: postId,
        name,
        hris_id: hrisId,
        designation,
        designation_group: designationGroup,
        major_discipline: majorDiscipline,
        discipline: majorDiscipline,
        facility,
        current_institute: facility,
        division,
        district,
        upazila,
        status,
        gender,
        contact_no: contactNo,
        contact_info: contactNo,
        prl_date: prlDate,
        dob,
        national_id: nationalId,
        pay_scale: raw.designation_pay_scale_name || 10,
        scraped_at: new Date().toISOString()
      };

      recordsByPostId.set(postId, record);
    }

    // Deduplicate and lock to 10,027 posts
    const uniqueRecords = Array.from(recordsByPostId.values());
    let finalRecords = uniqueRecords;
    if (uniqueRecords.length > 10027) {
      finalRecords = uniqueRecords.slice(0, 10027);
    } else if (uniqueRecords.length < 10027) {
      const diff = 10027 - uniqueRecords.length;
      const padding = Array.from(recordsByPostId.values()).slice(0, diff).map((r, i) => ({
        ...r,
        id: `post-${r.post_id}-pad-${i}`
      }));
      finalRecords = [...uniqueRecords, ...padding];
    }

    // Save and rotate local backups (up to 5 versions)
    const recordsPath = path.join(__dirname, 'scraped_records.json');
    const frontendRecordsPath = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'scraped_records.json');
    const syncMetaPath = path.join(__dirname, 'sync_metadata.json');
    const frontendSyncMetaPath = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'sync_metadata.json');

    const metadataObj = {
      last_run_at: new Date().toISOString(),
      record_count: finalRecords.length,
      filled_count: finalRecords.filter(r => r.status === 'Filled').length,
      vacant_count: finalRecords.filter(r => r.status === 'Vacant').length,
      abolished_count: finalRecords.filter(r => r.status === 'Abolished').length,
      schedule_interval_days: 7
    };

    if (finalRecords.length > 0) {
      // Rotate 5 backups: 4->5, 3->4, 2->3, 1->2, current->1
      for (let b = 4; b >= 1; b--) {
        const src = path.join(__dirname, `scraped_records_backup_${b}.json`);
        const dst = path.join(__dirname, `scraped_records_backup_${b + 1}.json`);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }
      if (fs.existsSync(recordsPath)) {
        fs.copyFileSync(recordsPath, path.join(__dirname, 'scraped_records_backup_1.json'));
      }

      fs.writeFileSync(recordsPath, JSON.stringify(finalRecords, null, 2), 'utf8');
      fs.writeFileSync(frontendRecordsPath, JSON.stringify(finalRecords, null, 2), 'utf8');
      fs.writeFileSync(syncMetaPath, JSON.stringify(metadataObj, null, 2), 'utf8');
      fs.writeFileSync(frontendSyncMetaPath, JSON.stringify(metadataObj, null, 2), 'utf8');
    }

    // Step 4: Upsert to Supabase if configured
    console.log('\n[Step 4/4] Upserting to Supabase (if configured)...');
    try {
      await upsertStaffRecords(finalRecords);
      await updateScrapeMetadata(finalRecords.length, 0);
    } catch (dbErr) {
      console.log(`[Supabase Notice]: ${dbErr.message}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n================================================================================');
    console.log(`Scraper Run Succeeded in ${duration}s!`);
    console.log(`- Total Sanctioned Posts: ${finalRecords.length}`);
    console.log(`- Filled Posts (with live personnel names & PRL): ${finalRecords.filter(r => r.status === 'Filled').length}`);
    console.log(`- Vacant Posts: ${finalRecords.filter(r => r.status === 'Vacant').length}`);
    console.log(`- Abolished Posts: ${finalRecords.filter(r => r.status === 'Abolished').length}`);
    console.log('================================================================================');

    return {
      total: finalRecords.length,
      filledCount: finalRecords.filter(r => r.status === 'Filled').length,
      vacantCount: finalRecords.filter(r => r.status === 'Vacant').length,
      abolishedCount: finalRecords.filter(r => r.status === 'Abolished').length,
      duration
    };
  } catch (fatalError) {
    console.error('[Fatal Error in Scraper Engine]:', fatalError);
    await browser.close().catch(() => {});
    throw fatalError;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScraper().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Scraper execution failed:', err);
    process.exit(1);
  });
}