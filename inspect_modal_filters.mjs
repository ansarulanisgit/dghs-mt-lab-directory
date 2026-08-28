import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { login } from './scraper/login.js';
import { navigateToPosting } from './scraper/navigateToPosting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectModalFilters() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  
  const { page } = await navigateToPosting(context);

  // Open modal
  const modalBtn = page.locator('[data-target="#ajax_search_modal_sanctionedPostIdModal"]');
  await modalBtn.waitFor({ state: 'visible', timeout: 15000 });
  await modalBtn.click();

  const modal = page.locator('#ajax_search_modal_sanctionedPostIdModal');
  await modal.waitFor({ state: 'visible', timeout: 15000 });

  // Get all select dropdowns and their names/IDs/classes
  const selects = await modal.locator('select').evaluateAll(els => {
    return els.map(el => ({
      name: el.name,
      id: el.id,
      className: el.className,
      options: Array.from(el.options).map(o => ({ value: o.value, text: o.text })).slice(0, 15)
    }));
  });

  console.log('--- Modal Dropdowns ---');
  console.log(JSON.stringify(selects, null, 2));

  // Also check form HTML
  const formHtml = await modal.locator('form').evaluate(el => el ? el.outerHTML.slice(0, 3000) : 'No form tag');
  console.log('--- Modal Form HTML ---');
  console.log(formHtml);

  await browser.close();
}

inspectModalFilters().catch(console.error);