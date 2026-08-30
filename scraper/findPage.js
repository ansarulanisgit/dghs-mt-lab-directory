import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { login } from './login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findDesignationGroupPage() {
  const storageStatePath = await login(false);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  console.log('[find] Visiting homepage...');
  await page.goto('https://hrm.dghs.gov.bd/', { waitUntil: 'networkidle', timeout: 60000 });

  // Get all navigation links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      href: a.href,
      text: a.innerText.trim()
    })).filter(l => l.href.startsWith('https://hrm.dghs.gov.bd') && !l.href.includes('logout') && l.text);
  });

  console.log('[find] Found menu links:', links);

  // Let's also check common report / post URLs:
  const candidateUrls = [
    'https://hrm.dghs.gov.bd/sanctioned-posts',
    'https://hrm.dghs.gov.bd/reports/sanctioned-posts',
    'https://hrm.dghs.gov.bd/reports/staff-profiles',
    'https://hrm.dghs.gov.bd/reports',
    'https://hrm.dghs.gov.bd/staff-profiles',
    'https://hrm.dghs.gov.bd/postings',
    'https://hrm.dghs.gov.bd/providers'
  ];

  for (const link of links) {
    if (!candidateUrls.includes(link.href)) candidateUrls.push(link.href);
  }

  for (const url of candidateUrls) {
    try {
      console.log(`\n[find] Checking: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);

      const pageText = await page.evaluate(() => document.body.innerText);
      const hasDesignationGroup = pageText.toLowerCase().includes('designation group');
      const hasDesignationDiscipline = pageText.toLowerCase().includes('designation discipline');

      console.log(`-> Has "Designation Group": ${hasDesignationGroup}, Has "Designation Discipline": ${hasDesignationDiscipline}`);

      if (hasDesignationGroup) {
        console.log(`>>> MATCH FOUND AT: ${url} <<<`);
        
        // Inspect the form and dropdowns on this page
        const details = await page.evaluate(() => {
          return {
            title: document.title,
            selects: Array.from(document.querySelectorAll('select')).map(s => ({
              id: s.id,
              name: s.name,
              multiple: s.multiple,
              optionsCount: s.options.length,
              sampleOptions: Array.from(s.options).slice(0, 10).map(o => ({ value: o.value, text: o.text.trim() }))
            })),
            labels: Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim()),
            buttons: Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
          };
        });

        console.log('Details:', JSON.stringify(details, null, 2));

        const scPath = path.join(__dirname, 'matched_page.png');
        await page.screenshot({ path: scPath, fullPage: true });
        console.log('Saved screenshot to:', scPath);
        break;
      }
    } catch (e) {
      console.log(`Error checking ${url}:`, e.message);
    }
  }

  await browser.close();
}

findDesignationGroupPage().catch(console.error);
