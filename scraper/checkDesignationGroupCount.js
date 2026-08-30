import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { login } from './login.js';
import { navigateToPosting, openPostSearchModal } from './navigateToPosting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCheck() {
  console.log('[check] Logging in to DGHS portal...');
  const storageStatePath = await login(false);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  let finalDataTableResponse = null;

  // Monitor network requests for datatable or post-search
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('post-search') || url.includes('datatable') || url.includes('sanctioned-posts')) {
      try {
        const text = await response.text();
        if (text.startsWith('{') && text.includes('records')) {
          const json = JSON.parse(text);
          console.log(`>>> [DataTable AJAX] URL: ${url.slice(0, 100)}`);
          console.log(`>>> [DataTable AJAX] recordsTotal: ${json.recordsTotal}, recordsFiltered: ${json.recordsFiltered}`);
          finalDataTableResponse = json;
        }
      } catch (e) {}
    }
  });

  console.log('[check] Navigating to posting page...');
  await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  console.log('[check] Opening Sanctioned Post search modal...');
  const modal = await openPostSearchModal(page);
  await page.waitForTimeout(2000);

  // Inspect all select elements and labels in the modal
  const formDetails = await modal.evaluate((modalEl) => {
    const selects = Array.from(modalEl.querySelectorAll('select')).map(s => ({
      name: s.name,
      id: s.id,
      className: s.className,
      multiple: s.multiple,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() }))
    }));

    const labels = Array.from(modalEl.querySelectorAll('label')).map(l => l.innerText.trim());

    return { selects, labels };
  });

  console.log('[check] Found Select Dropdowns in Modal:');
  for (const s of formDetails.selects) {
    console.log(`- ID: "${s.id}", Name: "${s.name}", Multiple: ${s.multiple}, Options count: ${s.options.length}`);
    const matches = s.options.filter(o => 
      o.text.toLowerCase().includes('technologist') || 
      o.text.toLowerCase().includes('pharmacist')
    );
    if (matches.length > 0) {
      console.log(`  Matching options in ${s.id || s.name}:`, matches);
    }
  }

  // Find designation group select
  const designationGroupSelect = formDetails.selects.find(s => 
    s.name?.toLowerCase().includes('designation_group') || 
    s.id?.toLowerCase().includes('designation_group') ||
    s.options.some(o => o.text.includes('Medical Technologist'))
  );

  console.log('[check] Target designation group select:', designationGroupSelect ? { id: designationGroupSelect.id, name: designationGroupSelect.name } : 'Not found by exact name');

  if (designationGroupSelect) {
    const targetTexts = ['Pharmacist', 'Medical Technologist', 'Sr. Medical Technologist', 'Chief Medical Technologist'];
    const targetValues = designationGroupSelect.options
      .filter(o => targetTexts.some(t => o.text.toLowerCase() === t.toLowerCase()))
      .map(o => ({ value: o.value, text: o.text }));

    console.log('[check] Target options to select:', targetValues);

    // Select them via page.evaluate
    await page.evaluate(({ selectId, selectName, values }) => {
      const el = selectId ? document.getElementById(selectId) : document.querySelector(`select[name="${selectName}"]`);
      if (!el) return;

      const valArr = values.map(v => v.value);
      for (const opt of el.options) {
        opt.selected = valArr.includes(opt.value);
      }

      // Trigger jQuery / select2 change if available
      if (window.$) {
        $(el).val(valArr).trigger('change');
      } else {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, {
      selectId: designationGroupSelect.id,
      selectName: designationGroupSelect.name,
      values: targetValues
    });

    console.log('[check] Values selected and change event triggered.');
    await page.waitForTimeout(3000);

    // Look for submit or filter button inside the modal
    const filterBtn = modal.locator('button:has-text("Filter"), button:has-text("Search"), input[type="submit"]').first();
    if (await filterBtn.count() > 0 && await filterBtn.isVisible()) {
      console.log('[check] Clicking Filter / Search button...');
      await filterBtn.click();
      await page.waitForTimeout(4000);
    }

    // Capture datatable info string
    const infoText = await modal.locator('.dataTables_info, [id*="info"]').allInnerTexts().catch(() => []);
    console.log('[check] DataTable Info Texts:', infoText);

    // Save screenshot
    const screenshotPath = path.join(__dirname, 'designation_groups_result.png');
    await modal.screenshot({ path: screenshotPath });
    console.log('[check] Saved screenshot to:', screenshotPath);
  }

  await browser.close();
}

runCheck().catch(err => {
  console.error('[check] Error:', err);
  process.exit(1);
});
