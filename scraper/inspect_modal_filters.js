import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { login } from './login.js';
import { navigateToPosting } from './navigateToPosting.js';

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

  // Get all select dropdowns
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

  // Check form submit params or DataTable parameters when filters are used
  const scriptContent = await modal.locator('script').evaluateAll(els => els.map(e => e.innerText).join('\n'));
  console.log('--- Modal Scripts (1000 chars) ---');
  console.log(scriptContent.slice(0, 1000));

  await browser.close();
}

inspectModalFilters().catch(console.error);