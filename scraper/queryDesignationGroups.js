import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { login } from './login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function queryDesignationGroups() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  let dataTableResponse = null;

  // Intercept and log AJAX responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('sanctioned') || url.includes('datatable') || url.includes('post')) {
      try {
        const text = await response.text();
        if (text.startsWith('{') && (text.includes('recordsTotal') || text.includes('recordsFiltered'))) {
          const json = JSON.parse(text);
          console.log(`\n========================================`);
          console.log(`>>> [AJAX Response] ${url.slice(0, 120)}`);
          console.log(`>>> recordsTotal: ${json.recordsTotal}`);
          console.log(`>>> recordsFiltered: ${json.recordsFiltered}`);
          console.log(`>>> data rows returned in this batch: ${json.data?.length}`);
          console.log(`========================================\n`);
          dataTableResponse = json;
        }
      } catch (e) {}
    }
  });

  const targetUrl = 'https://hrm.dghs.gov.bd/sanctioned-posts';
  console.log(`[query] Navigating to: ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

  // Get all options in designation_group_ids
  const groupOptions = await page.evaluate(() => {
    const select = document.getElementById('designation_group_ids');
    if (!select) return [];
    return Array.from(select.options).map(o => ({ value: o.value, text: o.text.trim() }));
  });

  console.log(`[query] Found ${groupOptions.length} designation group options.`);

  const searchNames = [
    'Pharmacist',
    'Medical Technologist',
    'Sr. Medical Technologist',
    'Chief Medical Technologist'
  ];

  const matchedOptions = [];
  for (const name of searchNames) {
    const match = groupOptions.find(o => o.text.toLowerCase() === name.toLowerCase());
    if (match) {
      matchedOptions.push(match);
      console.log(`✓ Found option: "${match.text}" -> value: ${match.value}`);
    } else {
      // Find partial matches
      const partials = groupOptions.filter(o => o.text.toLowerCase().includes(name.toLowerCase()));
      console.log(`? Partial matches for "${name}":`, partials);
      if (partials.length > 0) {
        matchedOptions.push(partials[0]);
      }
    }
  }

  console.log('\n[query] Selecting these 4 options in designation_group_ids:', matchedOptions);

  // Select the values via Select2 / jQuery / standard DOM
  await page.evaluate((options) => {
    const select = document.getElementById('designation_group_ids');
    if (!select) return;

    const values = options.map(o => o.value);
    
    // Select options in DOM
    for (const opt of select.options) {
      opt.selected = values.includes(opt.value);
    }

    // Trigger Select2 / bootstrap-select / chosen / jQuery change
    if (window.$ && $(select).data('select2')) {
      $(select).val(values).trigger('change');
    } else if (window.$ && $(select).data('selectpicker')) {
      $(select).selectpicker('val', values);
    } else if (window.$) {
      $(select).val(values).trigger('change');
    } else {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, matchedOptions);

  console.log('[query] Values selected. Waiting 2 seconds...');
  await page.waitForTimeout(2000);

  // Click the Filter button
  console.log('[query] Clicking Filter button...');
  const filterBtn = page.locator('button:has-text("Filter"), input[value="Filter"], button[type="submit"]').first();
  await filterBtn.click();

  console.log('[query] Filter button clicked. Waiting for DataTable to load...');
  await page.waitForTimeout(5000);

  // Get info text from page (e.g. "Showing 1 to 25 of 10,020 entries")
  const dataTablesInfo = await page.evaluate(() => {
    const els = document.querySelectorAll('.dataTables_info, [id*="info"]');
    return Array.from(els).map(el => el.innerText.trim());
  });

  console.log('[query] Page DataTable Info text:', dataTablesInfo);

  // Take screenshot
  const screenshotPath = path.join(__dirname, 'designation_groups_filtered_count.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('[query] Saved full page screenshot to:', screenshotPath);

  // Also check individual counts for each of the 4 designation groups
  console.log('\n======================================================');
  console.log('--- INDIVIDUAL COUNTS FOR EACH DESIGNATION GROUP ---');
  for (const opt of matchedOptions) {
    console.log(`\n[query] Testing single filter: "${opt.text}" (value: ${opt.value})...`);
    await page.evaluate((val) => {
      const select = document.getElementById('designation_group_ids');
      if (!select) return;
      for (const o of select.options) {
        o.selected = o.value === val;
      }
      if (window.$) {
        $(select).val([val]).trigger('change');
      } else {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, opt.value);

    await page.waitForTimeout(1000);
    await filterBtn.click();
    await page.waitForTimeout(3000);

    const singleInfo = await page.evaluate(() => {
      const el = document.querySelector('.dataTables_info, [id*="info"]');
      return el ? el.innerText.trim() : 'N/A';
    });
    console.log(`-> "${opt.text}": ${singleInfo}`);
  }
  console.log('======================================================\n');

  await browser.close();
}

queryDesignationGroups().catch(console.error);
