import { chromium } from 'playwright';
import { login } from './login.js';

async function inspectSanctionedPostsDt() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  let datatableUrl = '';
  let datatableResponse = null;

  page.on('request', req => {
    if (req.url().includes('datatable') || req.url().includes('sanctioned-posts')) {
      console.log('[Req]', req.method(), req.url());
    }
  });

  page.on('response', async res => {
    if (res.url().includes('datatable')) {
      datatableUrl = res.url();
      try {
        datatableResponse = await res.json();
        console.log('[Res]', res.url(), 'recordsTotal:', datatableResponse.recordsTotal, 'recordsFiltered:', datatableResponse.recordsFiltered);
      } catch (e) {}
    }
  });

  await page.goto('https://hrm.dghs.gov.bd/sanctioned-posts', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Now let's select the 4 designation groups and submit search
  const countResult = await page.evaluate(async () => {
    // Check form fields
    const form = document.querySelector('form#search-form') || document.querySelector('form');
    // designation_group_ids: 5 (Medical Technologist), 6 (Pharmacist), 15 (Chief Medical Technologist), 16 (Sr. Medical Technologist)
    const grpSelect = document.querySelector('select[name="designation_group_ids[]"]');
    if (grpSelect) {
      Array.from(grpSelect.options).forEach(opt => {
        if (['5', '6', '15', '16'].includes(opt.value)) {
          opt.selected = true;
        }
      });
      $(grpSelect).trigger('change');
    }

    // Trigger datatable draw
    if (window.sanctionedPostDatatableDt) {
      window.sanctionedPostDatatableDt.draw();
    } else if (window.LaravelDataTables) {
      const dt = Object.values(window.LaravelDataTables)[0];
      if (dt) dt.draw();
    }

    return 'Triggered';
  });

  await page.waitForTimeout(5000);

  // Check the table row count or summary text
  const tableSummary = await page.evaluate(() => {
    const info = document.querySelector('.dataTables_info');
    return info ? info.innerText : 'No info found';
  });

  console.log('Table Summary Text on Portal:', tableSummary);
  console.log('Last DT URL:', datatableUrl);
  console.log('DT Response:', JSON.stringify(datatableResponse, null, 2)?.slice(0, 500));

  await browser.close();
}

inspectSanctionedPostsDt().catch(console.error);
