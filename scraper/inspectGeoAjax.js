import { chromium } from 'playwright';
import { login } from './login.js';
import { navigateToPosting } from './navigateToPosting.js';

async function inspectGeoAjax() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const { page } = await navigateToPosting(context);

  // Intercept all requests
  page.on('request', req => {
    if (req.url().includes('district') || req.url().includes('division') || req.url().includes('upazila') || req.url().includes('facility')) {
      console.log(`[REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('district') || url.includes('upazila') || url.includes('facility') || url.includes('city-corporation')) {
      console.log(`[RES] ${res.status()} ${url}`);
      try {
        const json = await res.json();
        console.log('Response sample:', Array.isArray(json) ? json.slice(0, 5) : Object.keys(json));
      } catch (e) {}
    }
  });

  const modalBtn = page.locator('[data-target="#ajax_search_modal_sanctionedPostIdModal"]');
  await modalBtn.click();

  const modal = page.locator('#ajax_search_modal_sanctionedPostIdModal');
  await modal.waitFor({ state: 'visible', timeout: 15000 });

  // Select Division 3 (Rajshahi)
  console.log('Selecting Division 3 (Rajshahi)...');
  await page.evaluate(() => {
    const divSelect = document.querySelector('#filter_division_id');
    divSelect.value = '3';
    $(divSelect).trigger('change');
  });

  await page.waitForTimeout(3000);

  // Check district options now
  const distOptions = await page.evaluate(() => {
    const distSelect = document.querySelector('#filter_district_id');
    return Array.from(distSelect.options).map(o => ({ value: o.value, text: o.text }));
  });
  console.log('Districts for Rajshahi (Div 3):', distOptions);

  await browser.close();
}

inspectGeoAjax().catch(console.error);