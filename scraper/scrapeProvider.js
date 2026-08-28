function parseProviderPreview(html, postId) {
  if (!html || !html.includes('table')) return null;

  const getCellAfter = (label) => {
    const re = new RegExp(`<td[^>]*>\\s*${label}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
    const m = html.match(re);
    if (!m) return '';
    return m[1].replace(/<[^>]*>/g, '').trim();
  };

  const name = getCellAfter('Name');
  const dob = getCellAfter('DOB');
  const hris_id = getCellAfter('HRIS ID');
  const gender = getCellAfter('Gender');
  const contact_info = getCellAfter('Contact No');

  // Extract current location line
  const currentMatch = html.match(/sanctioned-posts\/\d+\/edit[^>]*>([\s\S]*?)<\/a>/i);
  let currentRaw = '';
  if (currentMatch) {
    currentRaw = currentMatch[1].replace(/\s+/g, ' ').trim();
  }

  const parts = currentRaw.split('»').map(s => s.trim()).filter(Boolean);

  return {
    postId: String(postId),
    name,
    dob_raw: dob,
    hris_id,
    gender,
    contact_info,
    post_id: parts[0] || String(postId),
    designation: parts[1] || '',
    current_institute: parts[2] || '',
    division: parts[3] || '',
    district: parts[4] || '',
    upazila: parts[5] || '',
    isVacant: !name && !hris_id
  };
}

export async function scrapeProvider(sessionOrContext, postId) {
  // Check if sessionOrContext has cookie string (Fast HTTP mode)
  if (typeof sessionOrContext === 'string') {
    const cookies = sessionOrContext;
    const headers = {
      'Cookie': cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 1. Fetch Post Page
    const postRes = await fetch(`https://hrm.dghs.gov.bd/sanctioned-posts/${postId}/edit`, { headers });
    const postHtml = await postRes.text();

    const providerIdMatch = postHtml.match(/name="provider_id"\s+type="text"\s+value="(\d+)"/) ||
                            postHtml.match(/id="provider_id"[^>]*value="(\d+)"/) ||
                            postHtml.match(/providers\/(\d+)\/edit/);

    if (!providerIdMatch || !providerIdMatch[1]) {
      return { postId, isVacant: true };
    }

    const providerId = providerIdMatch[1];

    // 2. Fetch Provider Preview
    const prevRes = await fetch(`https://hrm.dghs.gov.bd/partials/provider-preview?id=${providerId}`, {
      headers: { ...headers, 'X-Requested-With': 'XMLHttpRequest' }
    });
    const prevHtml = await prevRes.text();

    const record = parseProviderPreview(prevHtml, postId);
    if (!record) {
      return { postId, isVacant: true };
    }
    record.provider_id = providerId;
    return record;
  }

  // Fallback to Playwright browser context if passed directly
  const context = sessionOrContext;
  const page = await context.newPage();
  try {
    const url = `https://hrm.dghs.gov.bd/sanctioned-posts/${postId}/edit`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.form-group:has-text("Provider/Staff")', { timeout: 10000 }).catch(() => {});

    const rawData = await page.evaluate(() => {
      const providerGroup = Array.from(document.querySelectorAll('.form-group')).find(fg => {
        const label = fg.querySelector('label')?.innerText?.trim() || '';
        return label.includes('Provider/Staff');
      });

      if (!providerGroup) return null;
      const table = providerGroup.querySelector('table');
      if (!table) return { isVacant: true };

      const getTdValue = (regex) => {
        const tds = Array.from(table.querySelectorAll('td'));
        for (let i = 0; i < tds.length; i++) {
          if (regex.test(tds[i].innerText.trim())) {
            return tds[i + 1]?.innerText?.trim() || '';
          }
        }
        return '';
      };

      const name = getTdValue(/^Name$/i);
      const dob = getTdValue(/^DOB$/i);
      const hris_id = getTdValue(/^HRIS ID$/i);
      const gender = getTdValue(/^Gender$/i);
      const contact_info = getTdValue(/^Contact No$/i);
      const currentCell = Array.from(table.querySelectorAll('td')).find(td => td.innerText.includes('Current'));
      const currentRaw = currentCell ? currentCell.innerText.trim() : '';

      const providerLink = Array.from(table.querySelectorAll('a[href*="/providers/"]')).find(a => a.href.includes('/edit') || a.href.includes('/full-bio'));
      const provider_id = providerLink ? providerLink.href.match(/providers\/(\d+)/)?.[1] : null;

      return {
        name,
        dob,
        hris_id,
        gender,
        contact_info,
        provider_id: provider_id || hris_id,
        currentRaw,
        isVacant: !name && !hris_id
      };
    });

    await page.close();
    if (!rawData || rawData.isVacant) return { postId, isVacant: true };

    const currentLine = (rawData.currentRaw || '').split('\n')[0].replace(/^Current\s*/, '');
    const parts = currentLine.split('»').map(s => s.trim()).filter(Boolean);

    return {
      postId: String(postId),
      provider_id: rawData.provider_id || rawData.hris_id,
      hris_id: rawData.hris_id,
      name: rawData.name,
      contact_info: rawData.contact_info,
      dob_raw: rawData.dob,
      gender: rawData.gender,
      post_id: parts[0] || String(postId),
      designation: parts[1] || '',
      current_institute: parts[2] || '',
      division: parts[3] || '',
      district: parts[4] || '',
      upazila: parts[5] || '',
      isVacant: false
    };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}