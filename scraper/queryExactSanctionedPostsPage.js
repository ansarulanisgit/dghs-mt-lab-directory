import { chromium } from 'playwright';
import { login } from './login.js';

async function checkSanctionedPostsPage() {
  console.log('[Check] Logging in...');
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[Check] Navigating to /sanctioned-posts...');
  await page.goto('https://hrm.dghs.gov.bd/sanctioned-posts', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Check what filters exist on the page
  const pageInfo = await page.evaluate(async () => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() }))
    }));

    return {
      title: document.title,
      url: window.location.href,
      selects
    };
  });

  console.log('Sanctioned Posts Page Selects:', JSON.stringify(pageInfo, null, 2));

  // Let's test the datatable URL on /sanctioned-posts if any
  const dtResult = await page.evaluate(async () => {
    // Check if there is a datatable URL on this page
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
    const dtScript = scripts.find(s => s.includes('datatable') || s.includes('DataTable') || s.includes('ajax'));
    return dtScript ? dtScript.slice(0, 1000) : 'No dt script found';
  });

  console.log('DT Script snippet:', dtResult);

  await browser.close();
}

checkSanctionedPostsPage().catch(console.error);
