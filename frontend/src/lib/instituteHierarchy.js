// Bangladesh Government Health System Taxonomy & Hierarchy
// Direct implementation of the official Bangladesh Health System Hierarchy
// Administrative, Management, Health Service & Institution Hierarchy:
//
// Tier 1: National Government & Central Health Services Administration (MoHFW, DGHS HQ, DGDA, DGFP, DGME, DGNM, IEDCR, IPH, IPHN, NIPSOM, NIPORT, CMSD, EPI)
// Tier 2: Divisional Health Administration (Divisional Director Health, Divisional Health Office)
// Tier 3: National Specialized & Postgraduate Institutes / Hospitals (BSMMU, NICVD, NINS, NIKDU, NICRH, NIDCH, NIO, NITOR, NIMH, Burn Institute, NIRM, NILMRC, Chest Disease / TB / Infectious / Mental / Specialized Hospitals)
// Tier 4: Medical College Hospitals & Teaching Hospitals (DMCH, CMCH, RMCH, KMCH, MMCH, SOMCH, SSMC Mitford, Dental College Hospitals)
// Tier 5: Medical Colleges, Dental Colleges & Allied Health Education (Government Medical Colleges, Dental Colleges, IHT, MATS, Nursing Colleges/Institutes)
// Tier 6: District Health Administration & District / General Hospitals (Civil Surgeon Office, 250-bed General Hospital, Sadar Hospital, District Hospital, 100/500 Bed)
// Tier 7: Upazila Health Administration & Upazila Health Complexes (Upazila Health & Family Planning Officer, UHC, Upazila Health Office, 10/20/31/50 Bed Hospitals)
// Tier 8: Union & Community Health Services (UH&FWC, Union Sub-Center, Rural Health Center, Family Welfare Center, Community Clinic, Urban Dispensary, School/Port Health)

export function getInstituteTierRank(facilityName = '') {
  const f = (facilityName || '').toLowerCase().trim();
  if (!f) return 99;

  // Tier 8: Union & Community Health Services (PDF Section 6 & 19)
  if (
    f.includes('union') ||
    f.includes('sub center') ||
    f.includes('sub-center') ||
    f.includes('sub centre') ||
    f.includes('sub-centre') ||
    f.includes('community clinic') ||
    f.includes('rural dispensary') ||
    f.includes('rural health') ||
    f.includes('family welfare') ||
    f.includes('uh&fwc') ||
    f.includes('uhfwc') ||
    f.includes('school health') ||
    f.includes('port health') ||
    f.includes('urban dispensary')
  ) {
    return 8;
  }

  // Tier 1: National Government & Central Health Services Administration (PDF Section 1 & 2)
  if (
    f.includes('directorate general of health services') ||
    /\bdghs\b/i.test(f) ||
    f.includes('ministry of health') ||
    /\bmohfw\b/i.test(f) ||
    f.includes('central medical stores depot') ||
    /\bcmsd\b/i.test(f) ||
    f.includes('epidemiology, disease control') ||
    /\biedcr\b/i.test(f) ||
    f.includes('preventive and social medicine') ||
    /\bnipsom\b/i.test(f) ||
    f.includes('institute of public health') ||
    /\biph\b/i.test(f) ||
    f.includes('public health nutrition') ||
    /\biphn\b/i.test(f) ||
    f.includes('population research and training') ||
    /\bniport\b/i.test(f) ||
    /\bdgda\b/i.test(f) ||
    /\bdgfp\b/i.test(f) ||
    /\bdgme\b/i.test(f) ||
    /\bdgnm\b/i.test(f) ||
    /\bbmrc\b/i.test(f) ||
    f.includes('epi bhavan')
  ) {
    return 1;
  }

  // Tier 2: Divisional Health Administration (PDF Section 1 & 3)
  if (
    f.includes('divisional director') ||
    f.includes('divisional health office') ||
    f.includes('divisional health')
  ) {
    return 2;
  }

  // Tier 3: National Specialized & Postgraduate Institutes / Hospitals (PDF Section 7 & 19)
  if (
    f.includes('specialized') ||
    f.includes('specialised') ||
    f.includes('national institute') ||
    f.includes('postgraduate institute') ||
    f.includes('bsmmu') ||
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
    f.includes('ispat eye') ||
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
    f.includes('rehabilitation medicine') ||
    /\bnirm\b/i.test(f) ||
    f.includes('laboratory medicine & referral') ||
    f.includes('laboratory medicine and referral') ||
    /\bnilmrc\b/i.test(f) ||
    f.includes('child health') ||
    f.includes('shishu hospital') ||
    f.includes('shishu sastho') ||
    f.includes('institute of ent') ||
    f.includes('ent hospital') ||
    f.includes('gastrointestinal') ||
    f.includes('gastroenterology') ||
    f.includes('skin & social hygiene')
  ) {
    return 3;
  }

  // Tier 4: Medical College Hospitals & Teaching Hospitals (PDF Section 3 & 8)
  if (
    f.includes('medical college hospital') ||
    f.includes('dental college hospital') ||
    f.includes('mitford hospital') ||
    f.includes('burn unit at dmch') ||
    /\bdmch\b/i.test(f) ||
    /\bcmch\b/i.test(f) ||
    /\brmch\b/i.test(f) ||
    /\bkmch\b/i.test(f) ||
    /\bmmch\b/i.test(f) ||
    /\bsomch\b/i.test(f) ||
    /\bssmc\b/i.test(f)
  ) {
    return 4;
  }

  // Tier 5: Medical Colleges, Dental Colleges & Allied Health Education (PDF Section 8, 9, 13, 14)
  if (
    f.includes('medical college') ||
    f.includes('dental college') ||
    f.includes('health technology') ||
    /\biht\b/i.test(f) ||
    /\bmats\b/i.test(f) ||
    f.includes('medical assistant') ||
    f.includes('nursing college') ||
    f.includes('nursing institute') ||
    f.includes('midwifery institute') ||
    f.includes('college of nursing') ||
    f.includes('institute of health')
  ) {
    return 5;
  }

  // Tier 6: District Health Administration & District / General Hospitals (PDF Section 4 & 10)
  if (
    f.includes('civil surgeon') ||
    f.includes('district health') ||
    f.includes('district hospital') ||
    f.includes('general hospital') ||
    f.includes('sadar hospital') ||
    f.includes('250 bed') ||
    f.includes('100 bed') ||
    f.includes('500 bed') ||
    f.includes('police hospital') ||
    f.includes('jail hospital')
  ) {
    return 6;
  }

  // Tier 7: Upazila Health Administration & Upazila Health Complexes (PDF Section 5)
  if (
    f.includes('upazila health') ||
    f.includes('health complex') ||
    /\buhc\b/i.test(f) ||
    /\buhfpo\b/i.test(f) ||
    f.includes('mcwc') ||
    f.includes('maternal & child welfare') ||
    f.includes('50 bed') ||
    f.includes('31 bed') ||
    f.includes('20 bed') ||
    f.includes('10 bed') ||
    f.includes('upazila hospital')
  ) {
    return 7;
  }

  // Fallback -> Tier 8: Union & Community Health Services
  return 8;
}

export const TIER_NAMES = {
  1: 'National Government & Central DGHS Administration',
  2: 'Divisional Health Administration',
  3: 'National Specialized & Postgraduate Institutes / Hospitals',
  4: 'Medical College Hospitals & Teaching Hospitals',
  5: 'Medical Colleges, Dental Colleges & Allied Health Education (IHT/MATS/Nursing)',
  6: 'District Health Administration & District / General Hospitals (Civil Surgeon / 250 Bed)',
  7: 'Upazila Health Administration & Upazila Health Complexes (UHC / UHFPO)',
  8: 'Union & Community Health Services (UH&FWC / USC / Clinics)'
};