import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export const STORAGE_STATE_PATH = path.join(__dirname, 'storageState.json');
export const LOGIN_URL = 'https://hrm.dghs.gov.bd/login';

export async function login(forceRelogin = false) {
  const username = process.env.HRM_USERNAME?.trim();
  const password = process.env.HRM_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('HRM_USERNAME or HRM_PASSWORD is not set in environment.');
  }

  const browser = await chromium.launch({ headless: true });

  if (!forceRelogin && fs.existsSync(STORAGE_STATE_PATH)) {
    try {
      console.log('[login] Testing existing session from storageState.json...');
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      const page = await context.newPage();
      
      // Test with an actual authenticated posting URL to verify session freshness
      await page.goto('https://hrm.dghs.gov.bd/postings/create?provider_id=159165', { waitUntil: 'domcontentloaded', timeout: 30000 });
      const currentUrl = page.url();
      
      if (!currentUrl.includes('/login')) {
        console.log('[login] Existing session is valid! Current URL:', currentUrl);
        await context.close();
        await browser.close();
        return STORAGE_STATE_PATH;
      }
      console.log('[login] Session expired (redirected to /login), re-authenticating...');
      await context.close();
    } catch (e) {
      console.log('[login] Error checking existing session:', e.message, '- re-authenticating...');
    }
  }

  console.log('[login] Navigating to login page:', LOGIN_URL);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[login] Page loaded, filling credentials for user:', username);

    const emailInput = page.locator('form input[name="email"], form input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill(username);

    const passwordInput = page.locator('form input[name="password"], form input[type="password"]').first();
    await passwordInput.fill(password);

    console.log('[login] Submitting login form...');
    const submitBtn = page.locator('button.login, button:has-text("Login")').first();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}),
      submitBtn.click()
    ]);

    await page.waitForTimeout(3000);
    const postLoginUrl = page.url();
    console.log('[login] Post-login URL:', postLoginUrl);

    if (postLoginUrl.includes('/login')) {
      const errorText = await page.locator('.alert, .error, .invalid-feedback, .text-danger, strong').allInnerTexts().catch(() => []);
      throw new Error('Login failed. Still on login page. Details: ' + errorText.join(' '));
    }

    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log('[login] Login successful! Saved storageState to:', STORAGE_STATE_PATH);
    await browser.close();
    return STORAGE_STATE_PATH;
  } catch (error) {
    console.error('[login] Fatal error during login:', error.message);
    await page.screenshot({ path: path.join(__dirname, 'login_error.png') }).catch(() => {});
    await browser.close();
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  login(true).then(() => {
    console.log('[login] Login process completed successfully.');
    process.exit(0);
  }).catch((err) => {
    console.error('[login] Script failed:', err.message);
    process.exit(1);
  });
}