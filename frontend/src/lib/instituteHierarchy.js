export function getInstituteTierRank(facilityName = '') {
  const f = (facilityName || '').toLowerCase().trim();
  if (!f) return 99;

  // Tier 7: Union sub-centers, rural dispensaries, community clinics, port/school health
  if (
    f.includes('union') ||
    f.includes('sub center') ||
    f.includes('sub-center') ||
    f.includes('sub centre') ||
    f.includes('sub-centre') ||
    f.includes('community clinic') ||
    f.includes('rural dispensary') ||
    f.includes('school health') ||
    f.includes('port health')
  ) {
    return 7;
  }

  // Tier 1: DGHS HQ / Directorate / Central Agencies
  if (
    f.includes('directorate general of health services') ||
    /\bdghs\b/i.test(f) ||
    f.includes('central medical stores depot') ||
    /\bcmsd\b/i.test(f) ||
    f.includes('epidemiology, disease control') ||
    /\biedcr\b/i.test(f) ||
    f.includes('preventive and social medicine') ||
    /\bnipsom\b/i.test(f) ||
    /\bdgda\b/i.test(f) ||
    /\bbmrc\b/i.test(f) ||
    f.includes('epi bhavan') ||
    (f.includes('ministry of health') && !f.includes('handed over'))
  ) {
    return 1;
  }

  // Tier 2: Specialized Hospitals & National Tertiary Institutes
  if (
    f.includes('specialized') ||
    f.includes('specialised') ||
    f.includes('national institute') ||
    f.includes('cardio') ||
    /\bnicvd\b/i.test(f) ||
    f.includes('cancer') ||
    /\bnicrh\b/i.test(f) ||
    f.includes('neuro') ||
    /\bnins\b/i.test(f) ||
    f.includes('orthopaedic') ||
    f.includes('traumatology') ||
    /\bnitor\b/i.test(f) ||
    f.includes('kidney') ||
    /\bnikdu\b/i.test(f) ||
    f.includes('ophthalmology') ||
    /\bnio\b/i.test(f) ||
    f.includes('eye hospital') ||
    f.includes('mental health') ||
    f.includes('mental hospital') ||
    f.includes('chest disease') ||
    /\bnidch\b/i.test(f) ||
    f.includes('tb hospital') ||
    f.includes('tuberculosis') ||
    f.includes('leprosy') ||
    f.includes('infectious disease') ||
    f.includes('burn & plastic') ||
    f.includes('burn and plastic') ||
    f.includes('child health') ||
    f.includes('shishu hospital') ||
    f.includes('shishu sastho') ||
    f.includes('institute of ent') ||
    f.includes('ent hospital') ||
    f.includes('gastrointestinal') ||
    f.includes('gastroenterology')
  ) {
    return 2;
  }

  // Tier 3: Medical College Hospitals & Dental College Hospitals
  if (
    f.includes('medical college hospital') ||
    f.includes('dental college hospital') ||
    f.includes('mitford hospital') ||
    /\bdmch\b/i.test(f) ||
    /\bcmch\b/i.test(f) ||
    /\brmch\b/i.test(f) ||
    /\bkmch\b/i.test(f) ||
    /\bmmch\b/i.test(f) ||
    /\bsomch\b/i.test(f) ||
    /\bssmc\b/i.test(f)
  ) {
    return 3;
  }

  // Tier 4: Medical Colleges, Institutes, Training Schools (MATS, IHT, Nursing)
  if (
    f.includes('medical college') ||
    f.includes('dental college') ||
    f.includes('health technology') ||
    /\biht\b/i.test(f) ||
    /\bmats\b/i.test(f) ||
    f.includes('medical assistant training') ||
    f.includes('nursing college') ||
    f.includes('nursing institute') ||
    f.includes('college of nursing') ||
    f.includes('institute of health')
  ) {
    return 4;
  }

  // Tier 5: District Hospitals, General Hospitals, 250/100 Bed Hospitals, Sadar Hospitals, Civil Surgeon Offices
  if (
    f.includes('district hospital') ||
    f.includes('general hospital') ||
    f.includes('sadar hospital') ||
    f.includes('250 bed') ||
    f.includes('100 bed') ||
    f.includes('500 bed') ||
    f.includes('civil surgeon') ||
    f.includes('district health office') ||
    f.includes('police hospital') ||
    f.includes('jail hospital')
  ) {
    return 5;
  }

  // Tier 6: Upazila Health Complexes & Upazila-Level Facilities
  if (
    f.includes('upazila health complex') ||
    f.includes('health complex') ||
    f.includes('upazila health office') ||
    /\buhc\b/i.test(f) ||
    f.includes('50 bed') ||
    f.includes('31 bed') ||
    f.includes('20 bed') ||
    f.includes('10 bed') ||
    f.includes('upazila hospital')
  ) {
    return 6;
  }

  // Tier 7: Union, Community & Primary Centers
  return 7;
}

export const TIER_NAMES = {
  1: 'DGHS / National Headquarters',
  2: 'Specialized Hospital / National Institute',
  3: 'Medical College Hospital',
  4: 'Medical College / Institute / MATS / IHT',
  5: 'District Hospital / General Hospital',
  6: 'Upazila Health Complex',
  7: 'Primary / Community Health Center'
};