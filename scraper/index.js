import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from './login.js';
import { navigateToPosting } from './navigateToPosting.js';
import { collectAllPostIds } from './searchModal.js';
import { scrapeProvider } from './scrapeProvider.js';
import { normalizeRecord } from './normalize.js';
import { upsertStaffRecords, updateScrapeMetadata } from './upsertToSupabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runScraper(options = {}) {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('       DGHS MT-Lab Staff Directory Scraper         ');
  console.log('            (High-Speed Optimized Engine)          ');
  console.log('====================================================');

  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const concurrencyArg = process.argv.find(arg => arg.startsWith('--concurrency='));
  
  const limit = options.limit || (limitArg ? parseInt(limitArg.split('=')[1], 10) : null);
  const concurrency = options.concurrency || (concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 10);

  console.log(`[Config] Concurrency: ${concurrency} workers | Limit: ${limit ? limit + ' records' : 'All (~2,506)'}`);

  // 1. Authenticate & Obtain Storage State
  console.log('\n[Step 1/5] Authenticating session...');
  const storageStatePath = await login(false);
  const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'));
  const cookieString = storageState.cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });

  try {
    // 2. Navigate to Posting Profile
    console.log('\n[Step 2/5] Navigating to active posting page...');
    const { page, successfulUrl } = await navigateToPosting(context);
    console.log(`Using active posting endpoint: ${successfulUrl}`);

    // 3. Search Modal & Collect Post IDs
    console.log('\n[Step 3/5] Querying "Medical Technologist (Lab)" in Sanctioned Post search...');
    const postItems = await collectAllPostIds(page, 'Medical Technologist (Lab)', 250, limit);
    await page.close();
    await browser.close();

    console.log(`Total Sanctioned Posts to process: ${postItems.length}`);

    // 4. Fast Concurrent Scraping
    console.log(`\n[Step 4/5] Scraping staff profiles with ${concurrency} parallel workers...`);
    const normalizedStaff = [];
    const failedPosts = [];
    let vacantCount = 0;
    let processed = 0;

    // Worker pool queue
    const queue = [...postItems];

    async function worker(workerId) {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const postId = item.postId;

        try {
          const raw = await scrapeProvider(cookieString, postId);
          if (raw.isVacant) {
            vacantCount++;
          } else {
            const normalized = normalizeRecord(raw);
            if (normalized) {
              normalizedStaff.push(normalized);
            } else {
              failedPosts.push({ postId, reason: 'Missing required fields (name/hris_id)' });
            }
          }
        } catch (err) {
          console.warn(`[Worker ${workerId}] Failed Post ID ${postId}: ${err.message}`);
          failedPosts.push({ postId, error: err.message });
        }

        processed++;
        if (processed % 100 === 0 || processed === postItems.length) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (processed / (Date.now() - startTime) * 1000).toFixed(1);
          console.log(`[Progress] Scraped ${processed}/${postItems.length} (${rate} req/s, ${elapsed}s elapsed) | Active Staff: ${normalizedStaff.length} | Vacant: ${vacantCount} | Failed: ${failedPosts.length}`);
        }

        await sleep(20);
      }
    }

    // Launch worker pool
    const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    // Rotate and save local 2-version JSON backups
    const recordsPath = path.join(__dirname, 'scraped_records.json');
    const backup1Path = path.join(__dirname, 'scraped_records_backup_1.json');
    const backup2Path = path.join(__dirname, 'scraped_records_backup_2.json');

    // Validation Guard: Only rotate and overwrite if we received valid records
    if (normalizedStaff.length > 0) {
      if (fs.existsSync(backup1Path)) {
        fs.copyFileSync(backup1Path, backup2Path);
        console.log(`[Backup System] Rotated Backup 1 -> Backup 2 (${backup2Path})`);
      }
      if (fs.existsSync(recordsPath)) {
        fs.copyFileSync(recordsPath, backup1Path);
        console.log(`[Backup System] Created Backup 1 (${backup1Path})`);
      }
      fs.writeFileSync(recordsPath, JSON.stringify(normalizedStaff, null, 2), 'utf8');
      console.log(`\nSaved ${normalizedStaff.length} active staff records to: ${recordsPath}`);
    } else {
      console.warn('[Safety Guard] No records scraped. Preserved existing dataset without overwriting.');
    }

    // Save failed records log
    const failedLogPath = path.join(__dirname, 'failed_providers.json');
    fs.writeFileSync(failedLogPath, JSON.stringify(failedPosts, null, 2), 'utf8');
    if (failedPosts.length > 0) {
      console.log(`Logged ${failedPosts.length} failed posts to: ${failedLogPath}`);
    }

    // 5. Upsert to Supabase
    console.log('\n[Step 5/5] Upserting records into Supabase...');
    if (normalizedStaff.length > 0) {
      await upsertStaffRecords(normalizedStaff);
      await updateScrapeMetadata(normalizedStaff.length, failedPosts.length);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n====================================================');
    console.log(`Scraping Run Completed in ${duration}s! (${(duration / 60).toFixed(2)} minutes)`);
    console.log(`- Total Posts Processed: ${postItems.length}`);
    console.log(`- Active Staff Records: ${normalizedStaff.length}`);
    console.log(`- Vacant Posts: ${vacantCount}`);
    console.log(`- Failed Posts: ${failedPosts.length}`);
    console.log(`- Overall Speed: ${(postItems.length / duration).toFixed(1)} posts/second`);
    console.log('====================================================');

    return {
      total: postItems.length,
      staffCount: normalizedStaff.length,
      vacantCount,
      failedCount: failedPosts.length,
      duration
    };
  } catch (fatalError) {
    console.error('[Fatal Error in Scraper Engine]:', fatalError);
    console.warn('[Safety Guard] Preserved existing working dataset. No corrupt data was written.');
    await browser.close().catch(() => {});
    throw fatalError;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScraper().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Scraper execution failed:', err);
    process.exit(1);
  });
}