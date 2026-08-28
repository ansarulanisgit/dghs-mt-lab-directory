const BANGLADESH_GEO = {
  "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokathi", "Patuakhali", "Pirojpur"],
  "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
  "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  "Khulna": ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  "Rajshahi": ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
  "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"]
};

const DISTRICT_TO_DIVISION = {};
for (const [div, dists] of Object.entries(BANGLADESH_GEO)) {
  for (const dist of dists) {
    DISTRICT_TO_DIVISION[dist.toLowerCase()] = div;
  }
}

const SPELLING_MAP = {
  "barisal": "Barishal",
  "chittagong": "Chattogram",
  "comilla": "Cumilla",
  "jessore": "Jashore",
  "bogra": "Bogura",
  "chapai nawabganj": "Chapainawabganj",
  "nawabganj": "Chapainawabganj",
  "maulvibazar": "Moulvibazar",
  "moulvibazar": "Moulvibazar",
  "cox&#039;s bazar": "Cox's Bazar",
  "cox's bazar": "Cox's Bazar",
  "coxsbazar": "Cox's Bazar"
};

function cleanStr(str) {
  if (!str) return '';
  return str.replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
}

function normalizeGeo(rawDiv, rawDist, rawUpz, institute = '') {
  let div = cleanStr(rawDiv);
  let dist = cleanStr(rawDist);
  let upz = cleanStr(rawUpz);

  const checkNormalized = (s) => {
    if (!s) return null;
    const lower = s.toLowerCase();
    if (SPELLING_MAP[lower]) return SPELLING_MAP[lower];
    for (const [canonicalDist, parentDiv] of Object.entries(DISTRICT_TO_DIVISION)) {
      if (lower === canonicalDist.toLowerCase()) {
        return canonicalDist.charAt(0).toUpperCase() + canonicalDist.slice(1);
      }
    }
    return null;
  };

  const distInDiv = checkNormalized(div);
  if (distInDiv && DISTRICT_TO_DIVISION[distInDiv.toLowerCase()]) {
    const realDiv = DISTRICT_TO_DIVISION[distInDiv.toLowerCase()];
    if (!dist || dist.toLowerCase() === div.toLowerCase()) {
      dist = distInDiv;
    } else {
      upz = dist;
      dist = distInDiv;
    }
    div = realDiv;
  }

  const normDist = checkNormalized(dist);
  if (normDist) {
    dist = normDist;
    if (!div || !BANGLADESH_GEO[div]) {
      div = DISTRICT_TO_DIVISION[normDist.toLowerCase()] || div;
    }
  }

  if (div) {
    const divLower = div.toLowerCase();
    if (divLower === 'barisal') div = 'Barishal';
    else if (divLower === 'chittagong') div = 'Chattogram';
  }

  if (!BANGLADESH_GEO[div]) {
    for (const [canonicalDist, parentDiv] of Object.entries(DISTRICT_TO_DIVISION)) {
      if (dist.toLowerCase().includes(canonicalDist.toLowerCase()) || institute.toLowerCase().includes(canonicalDist.toLowerCase())) {
        div = parentDiv;
        dist = canonicalDist.charAt(0).toUpperCase() + canonicalDist.slice(1);
        break;
      }
    }
  }

  return { division: div || null, district: dist || null, upazila: upz || null };
}

export function normalizeRecord(raw) {
  if (!raw || raw.isVacant) {
    return null;
  }

  const name = cleanStr(raw.name);
  const hris_id = cleanStr(raw.hris_id);

  if (!name || !hris_id) {
    return null;
  }

  const provider_id = cleanStr(raw.provider_id || hris_id);
  const gender = cleanStr(raw.gender);
  const post_id = cleanStr(raw.post_id || raw.postId);
  const designation = cleanStr(raw.designation);
  const current_institute = cleanStr(raw.current_institute);

  // Normalize Geo Hierarchy (8 Divisions, 64 Districts)
  const geo = normalizeGeo(raw.division, raw.district, raw.upazila, current_institute);

  let contact_info = cleanStr(raw.contact_info);
  if (contact_info) {
    contact_info = contact_info.replace(/[^\d\+,\/\s@\.-]/g, '').trim();
  }

  let dob = null;
  let prl_date = null;

  if (raw.dob_raw) {
    const cleanDate = raw.dob_raw.trim().replace(/\//g, '-');
    const parts = cleanDate.split('-').map(Number);
    
    let day, month, year;
    if (parts.length === 3) {
      if (parts[0] > 1900) {
        [year, month, day] = parts;
      } else {
        [day, month, year] = parts;
      }

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const prlYear = year + 59;
        prl_date = `${prlYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return {
    hris_id,
    provider_id,
    name,
    contact_info: contact_info || null,
    dob,
    gender: gender || null,
    post_id: post_id || null,
    designation: designation || null,
    current_institute: current_institute || null,
    division: geo.division,
    district: geo.district,
    upazila: geo.upazila,
    prl_date,
    last_scraped_at: new Date().toISOString()
  };
}