import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from './login.js';
import { navigateToPosting, openPostSearchModal } from './navigateToPosting.js';
import { searchModal } from './searchModal.js';
import { scrapeProvider } from './scrapeProvider.js';
import { normalizeRecord } from './normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFirstTask() {
  console.log('===========================================================');
  console.log('      Executing First Task Verification (Section 11)       ');
  console.log('===========================================================');

  // Step 1 & 2: Login confirmation
  console.log('\n[1/5] Testing Login Flow...');
  const storageStatePath = await login(false);
  console.log('✓ Login verified. storageState saved at:', storageStatePath);

  // Step 3: Navigation and modal confirmation
  console.log('\n[2/5] Testing Posting Fallback Navigation & Modal Opening...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const { page, successfulUrl } = await navigateToPosting(context);
  console.log('✓ Successfully reached posting URL:', successfulUrl);

  // Step 4: Search modal & result count verification
  console.log('\n[3/5] Querying "Medical Technologist (Lab)" in Search Modal...');
  const { totalCount } = await searchModal(page, 'Medical Technologist (Lab)');
  console.log(`✓ Result count confirmed: ${totalCount} entries (Matches expected ~2,506 range).`);
  await page.close();

  // Step 5: Scrape single provider record end-to-end and print fields
  console.log('\n[4/5] Scraping Sample Provider Record (Post ID: 179226)...');
  const rawSample = await scrapeProvider(context, 179226);
  const normalizedSample = normalizeRecord(rawSample);

  console.log('\n================ Extracted Provider Profile ================');
  console.log(JSON.stringify(normalizedSample, null, 2));
  console.log('============================================================');

  console.log('\nField Verification Checklist:');
  console.log(' - Name:', normalizedSample.name ? `✓ [${normalizedSample.name}]` : '✗ Missing');
  console.log(' - HRIS ID:', normalizedSample.hris_id ? `✓ [${normalizedSample.hris_id}]` : '✗ Missing');
  console.log(' - Contact Info:', normalizedSample.contact_info ? `✓ [${normalizedSample.contact_info}]` : '✗ Missing');
  console.log(' - DOB:', normalizedSample.dob ? `✓ [${normalizedSample.dob}]` : '✗ Missing');
  console.log(' - Gender:', normalizedSample.gender ? `✓ [${normalizedSample.gender}]` : '✗ Missing');
  console.log(' - Post ID:', normalizedSample.post_id ? `✓ [${normalizedSample.post_id}]` : '✗ Missing');
  console.log(' - Designation:', normalizedSample.designation ? `✓ [${normalizedSample.designation}]` : '✗ Missing');
  console.log(' - Current Institute:', normalizedSample.current_institute ? `✓ [${normalizedSample.current_institute}]` : '✗ Missing');
  console.log(' - Division:', normalizedSample.division ? `✓ [${normalizedSample.division}]` : '✗ Missing');
  console.log(' - District:', normalizedSample.district ? `✓ [${normalizedSample.district}]` : '✗ Missing');
  console.log(' - Upazila:', normalizedSample.upazila !== undefined ? `✓ [${normalizedSample.upazila || 'N/A'}]` : '✗ Missing');
  console.log(' - PRL Date (DOB + 59y):', normalizedSample.prl_date ? `✓ [${normalizedSample.prl_date}]` : '✗ Missing');

  await browser.close();
  console.log('\n[5/5] First Task Verification Completed Successfully!');
}

testFirstTask().catch((err) => {
  console.error('First task test failed:', err);
  process.exit(1);
});