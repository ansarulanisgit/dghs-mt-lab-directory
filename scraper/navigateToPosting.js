import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, STORAGE_STATE_PATH } from './login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const POSTING_URLS = [
  'https://hrm.dghs.gov.bd/postings/create?provider_id=159165',
  'https://hrm.dghs.gov.bd/postings/create?provider_id=14436',
  'https://hrm.dghs.gov.bd/postings/create?provider_id=6363',
  'https://hrm.dghs.gov.bd/postings/create?provider_id=194744'
];

export async function navigateToPosting(browserContext) {
  const page = await browserContext.newPage();
  let successfulUrl = null;

  for (const url of POSTING_URLS) {
    try {
      console.log(`[navigateToPosting] Attempting navigation to: ${url}`);
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const status = response ? response.status() : 0;
      const currentUrl = page.url();

      if (status >= 200 && status < 400 && !currentUrl.includes('/login') && !currentUrl.includes('/error')) {
        // Check if page has posting form elements
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log(`[navigateToPosting] Successfully loaded posting page: ${url} (HTTP ${status})`);
        successfulUrl = url;
        break;
      } else {
        console.warn(`[navigateToPosting] URL ${url} returned status ${status} or redirected to ${currentUrl}`);
      }
    } catch (err) {
      console.warn(`[navigateToPosting] Failed loading ${url}: ${err.message}. Trying next fallback...`);
    }
  }

  if (!successfulUrl) {
    throw new Error('[navigateToPosting] None of the fallback posting URLs could be loaded successfully.');
  }

  return { page, successfulUrl };
}

export async function openPostSearchModal(page) {
  console.log('[navigateToPosting] Locating search icon under "Post"...');

  // Let us find elements matching search icons, modal triggers, or "Post" labels
  // Common patterns in AdminLTE/Bootstrap HRIS: a.btn with fa-search, modal trigger buttons next to Post input
  const searchButton = page.locator(
    'button:has(i.fa-search), a:has(i.fa-search), .input-group-btn button, .input-group-addon, a[data-target*="modal"], button[data-target*="modal"], a[data-toggle="modal"], [data-target="#postModal"], [data-target="#designationModal"], [data-target="#searchModal"], .fa-search'
  ).first();

  await searchButton.waitFor({ state: 'visible', timeout: 15000 });
  console.log('[navigateToPosting] Found search button. Clicking to open modal...');
  await searchButton.click();

  // Wait for modal to become visible
  const modal = page.locator('.modal.in, .modal.show, .modal[style*="display: block"], div.modal:visible').first();
  await modal.waitFor({ state: 'visible', timeout: 15000 });
  console.log('[navigateToPosting] Modal is now open and visible.');
  return modal;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const storageStatePath = await login(false);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageStatePath });

    try {
      const { page, successfulUrl } = await navigateToPosting(context);
      console.log(`Posting page loaded successfully from: ${successfulUrl}`);
      await page.screenshot({ path: path.join(__dirname, 'posting_page.png') });

      const modal = await openPostSearchModal(page);
      await page.screenshot({ path: path.join(__dirname, 'modal_opened.png') });
      console.log('Modal opened successfully. Test complete.');
    } catch (e) {
      console.error('Error in navigateToPosting test:', e);
    } finally {
      await browser.close();
    }
  })();
}