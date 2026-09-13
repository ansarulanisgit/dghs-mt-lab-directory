import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { supabase, isSupabaseConfigured, MOCK_STAFF, MOCK_METADATA } from './lib/supabaseClient';
import { getCurrentUser, logoutUser, syncUsersWithCloud } from './lib/authStore';
import { getSystemConfig, syncConfigWithCloud } from './lib/configStore';
import { getInstituteTierRank } from './lib/instituteHierarchy';
import { getStoredTheme, toggleTheme } from './lib/themeStore';
import { exportFilteredStaffPDF } from './lib/pdfExport';
import {
  getBackups, saveBackupSnapshot, getActiveBackupOverride, clearBackupOverride, syncBackupsWithCloud
} from './lib/backupStore';
import { syncPdfColumnsWithCloud } from './lib/pdfConfigStore';
import StaffCard from './components/StaffCard';
import FilterBar from './components/FilterBar';
import Pagination from './components/Pagination';
import LoginScreen from './components/LoginScreen';
import PermissionDeniedModal from './components/PermissionDeniedModal';
import CountdownBadge from './components/CountdownBadge';
import {
  Users, Clock, Settings, LogOut, AlertCircle, RefreshCw, Layers, User, FileDown,
  AlertTriangle, Info, X, ShieldAlert, CheckCircle2, ChevronUp, Lock, Sun, Moon
} from 'lucide-react';

// Lazy-loaded heavy modal components for optimal bundle splitting
const StaffDetailModal = lazy(() => import('./components/StaffDetailModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const PAGE_SIZE = 100; // 100 items per page

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionDeniedFeature, setPermissionDeniedFeature] = useState(null);
  const [theme, setTheme] = useState(getStoredTheme());

  // Listen for theme changes across components/tabs
  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail || getStoredTheme());
    };
    window.addEventListener('dghs_theme_changed', handleThemeChange);
    return () => window.removeEventListener('dghs_theme_changed', handleThemeChange);
  }, []);

  // Check granular permissions for current user (Super Admin & Admin have full access)
  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin' || (currentUser?.email || '').toLowerCase() === 'ansarul.contact@gmail.com';
  const isFullAdmin = isSuperAdmin || currentUser?.role === 'Admin';
  const canExportPdf = isFullAdmin || Boolean(currentUser?.canExportPdf);
  const canViewHris = isFullAdmin || currentUser?.canViewHris !== false;
  const canViewPhone = isFullAdmin || currentUser?.canViewPhone !== false;
  const canViewPrl = isFullAdmin || currentUser?.canViewPrl !== false;
  const canViewDetails = isFullAdmin || currentUser?.canViewDetails !== false;

  // Back to top floating button state (scroll threshold: 400px)
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Directory Data State
  const [staffList, setStaffList] = useState([]);
  const [allFilteredStaff, setAllFilteredStaff] = useState([]); // For full PDF export
  const [totalCount, setTotalCount] = useState(0);
  const [metadata, setMetadata] = useState(MOCK_METADATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [error, setError] = useState(null);
  const isInitialMount = useRef(true);

  // Resilience & Backup States
  const [activeRestoredBackup, setActiveRestoredBackup] = useState(getActiveBackupOverride());
  const [syncErrorNotice, setSyncErrorNotice] = useState(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchMeta, setSearchMeta] = useState(null); // { exact: true, type: 'institute'|'name'|'hris'|'post_id'|'designation'|'location', target: string }
  const [selectedDesignationGroups, setSelectedDesignationGroups] = useState([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // '' | 'Filled' | 'Vacant' | 'Abolished'
  const [hidePastPRL, setHidePastPRL] = useState(false); // Toggle to hide past PRL dates

  // Default Sorting: PRL Date (Earliest first)
  const [sortBy, setSortBy] = useState('prl_date');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Card for Modal
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Dynamic Global Stats (Reflects active restored backup or baseline dataset)
  const activeDataset = useMemo(() => {
    return (activeRestoredBackup && Array.isArray(activeRestoredBackup.data))
      ? activeRestoredBackup.data
      : MOCK_STAFF;
  }, [activeRestoredBackup]);

  // Fast pre-indexed dataset with normalized search fields and precomputed ranks/IDs
  const indexedDataset = useMemo(() => {
    const len = activeDataset.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      const s = activeDataset[i];
      const name = s.name || '';
      const facility = s.facility || s.current_institute || '';
      const facTrim = facility.trim();
      const hris = s.hris_id || '';
      const postId = s.post_id ? String(s.post_id) : '';
      const desig = s.designation || '';
      const disc = s.major_discipline || '';
      const grp = s.designation_group || '';
      const div = s.division || '';
      const dist = s.district || '';
      const upz = s.upazila || '';
      const prl = s.prl_date ? s.prl_date.split('T')[0] : '';

      result[i] = {
        ...s,
        _searchNorm: `${name} ${facility} ${hris} ${postId} ${dist} ${upz} ${desig} ${disc} ${grp}`.toLowerCase(),
        _nameLower: name.toLowerCase(),
        _facilityLower: facTrim.toLowerCase(),
        _hrisLower: hris.toLowerCase(),
        _postIdStr: postId,
        _postIdNum: parseInt(postId, 10) || 0,
        _desigLower: desig.toLowerCase(),
        _discLower: disc.toLowerCase(),
        _grpLower: grp.toLowerCase(),
        _divLower: div.toLowerCase(),
        _distLower: dist.toLowerCase(),
        _upzLower: upz.toLowerCase(),
        _genderLower: (s.gender || '').toLowerCase(),
        _statusLower: (s.status || '').toLowerCase(),
        _prlDateStr: prl,
        _tierRank: getInstituteTierRank(facTrim)
      };
    }
    return result;
  }, [activeDataset]);

  const globalStats = useMemo(() => {
    let filled = 0;
    let vacant = 0;
    let abolished = 0;
    const len = indexedDataset.length;
    for (let i = 0; i < len; i++) {
      const st = indexedDataset[i]._statusLower;
      if (st === 'filled') filled++;
      else if (st === 'vacant') vacant++;
      else if (st === 'abolished') abolished++;
    }
    return { total: len, filled, vacant, abolished };
  }, [indexedDataset]);

  // Dynamic Post Status Counts (Updates dynamically when Designation Groups, Disciplines, Designations or other non-status filters are selected)
  const dynamicStatusStats = useMemo(() => {
    let subset = indexedDataset;

    // Apply Search (Exact if selected from suggestion, broad if typed words)
    if (debouncedSearch) {
      const isExact = Boolean(
        searchMeta &&
        searchMeta.exact &&
        debouncedSearch.trim().toLowerCase() === (searchMeta.target || '').trim().toLowerCase()
      );

      if (isExact) {
        const targetLower = (searchMeta.target || '').trim().toLowerCase();
        if (searchMeta.type === 'institute') {
          subset = subset.filter(s => s._facilityLower === targetLower);
        } else if (searchMeta.type === 'name') {
          subset = subset.filter(s => s._nameLower === targetLower);
        } else if (searchMeta.type === 'hris') {
          subset = subset.filter(s => s._hrisLower === targetLower);
        } else if (searchMeta.type === 'post_id') {
          subset = subset.filter(s => s._postIdStr === String(searchMeta.target).trim());
        } else if (searchMeta.type === 'designation') {
          subset = subset.filter(s => s._desigLower === targetLower);
        } else if (searchMeta.type === 'location') {
          subset = subset.filter(s => s._upzLower === targetLower || s._distLower === targetLower);
        } else {
          subset = subset.filter(s => s._facilityLower === targetLower);
        }
      } else {
        const q = debouncedSearch.toLowerCase();
        subset = subset.filter(s => s._searchNorm.includes(q));
      }
    }

    // Apply Designation Groups
    if (selectedDesignationGroups.length > 0) {
      subset = subset.filter(s => selectedDesignationGroups.includes(s.designation_group));
    }

    // Apply Disciplines
    if (selectedDisciplines.length > 0) {
      subset = subset.filter(s => selectedDisciplines.includes(s.major_discipline));
    }

    // Apply Designations
    if (selectedDesignations.length > 0) {
      subset = subset.filter(s => selectedDesignations.includes(s.designation));
    }

    // Apply Division
    if (selectedDivision) {
      const divLower = selectedDivision.toLowerCase();
      subset = subset.filter(s => s._divLower === divLower);
    }

    // Apply District
    if (selectedDistrict) {
      const distLower = selectedDistrict.toLowerCase();
      subset = subset.filter(s => s._distLower === distLower);
    }

    // Apply Upazila
    if (selectedUpazila) {
      const upzQ = selectedUpazila.toLowerCase();
      subset = subset.filter(s => 
        s._upzLower === upzQ ||
        s._facilityLower.includes(upzQ)
      );
    }

    // Apply Gender
    if (selectedGender) {
      const genderLower = selectedGender.toLowerCase();
      subset = subset.filter(s => s._genderLower === genderLower);
    }

    // Apply Hide Past PRL
    if (hidePastPRL) {
      const todayStr = new Date().toISOString().split('T')[0];
      subset = subset.filter(s => {
        if (!s._prlDateStr) return s._statusLower === 'vacant' || s._statusLower === 'abolished';
        return s._prlDateStr >= todayStr;
      });
    }

    let filled = 0;
    let vacant = 0;
    let abolished = 0;
    const len = subset.length;
    for (let i = 0; i < len; i++) {
      const st = subset[i]._statusLower;
      if (st === 'filled') filled++;
      else if (st === 'vacant') vacant++;
      else if (st === 'abolished') abolished++;
    }

    return { total: len, filled, vacant, abolished };
  }, [
    indexedDataset,
    debouncedSearch,
    searchMeta,
    selectedDesignationGroups,
    selectedDisciplines,
    selectedDesignations,
    selectedDivision,
    selectedDistrict,
    selectedUpazila,
    selectedGender,
    hidePastPRL
  ]);

  // 1. Designation Group Options (with live counts)
  const designationGroupOptions = useMemo(() => {
    const map = {};
    for (const s of activeDataset) {
      const grp = s.designation_group || 'Medical Technologist';
      map[grp] = (map[grp] || 0) + 1;
    }
    return Object.entries(map)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeDataset]);

  // 2. Discipline Options (Hierarchical: strictly scoped to selected Designation Groups)
  const disciplineOptions = useMemo(() => {
    const map = {};
    for (const s of activeDataset) {
      if (selectedDesignationGroups.length > 0 && !selectedDesignationGroups.includes(s.designation_group)) {
        continue;
      }
      const disc = s.major_discipline || 'General & Clinical Specializations';
      map[disc] = (map[disc] || 0) + 1;
    }
    return Object.entries(map)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeDataset, selectedDesignationGroups]);

  // 3. Designation Options (Hierarchical: strictly scoped to selected Designation Groups AND Disciplines)
  const designationOptions = useMemo(() => {
    const map = {};
    for (const s of activeDataset) {
      if (selectedDesignationGroups.length > 0 && !selectedDesignationGroups.includes(s.designation_group)) {
        continue;
      }
      if (selectedDisciplines.length > 0 && !selectedDisciplines.includes(s.major_discipline)) {
        continue;
      }
      const desig = s.designation || 'Medical Technologist';
      map[desig] = (map[desig] || 0) + 1;
    }
    return Object.entries(map)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeDataset, selectedDesignationGroups, selectedDisciplines]);

  // Initialize initial backup snapshot if none exists
  useEffect(() => {
    const existing = getBackups();
    if (existing.length === 0 && MOCK_STAFF && MOCK_STAFF.length >= 10000) {
      saveBackupSnapshot(MOCK_STAFF, 'Baseline 10,027 Dataset Backup (v2.0)', true);
    }
  }, []);

  // Listen for backup restore events
  useEffect(() => {
    const handleRestoreEvent = () => {
      const override = getActiveBackupOverride();
      setActiveRestoredBackup(override);
      setCurrentPage(1);
    };
    window.addEventListener('dghs_backup_restored', handleRestoreEvent);
    return () => window.removeEventListener('dghs_backup_restored', handleRestoreEvent);
  }, []);

  // System & Branding Config State
  const [appConfig, setAppConfig] = useState(() => getSystemConfig());

  // Listen for config updates without constant polling
  useEffect(() => {
    const handleConfigUpdate = () => setAppConfig(getSystemConfig());
    window.addEventListener('dghs_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('dghs_config_updated', handleConfigUpdate);
  }, []);

  // Search Change Handler (Supports exact suggestion match or broad typing)
  const handleSearchChange = (val, meta = null) => {
    setSearchTerm(val);
    setSearchMeta(meta);
    if (meta && meta.exact) {
      setDebouncedSearch(val);
    }
    setCurrentPage(1);
  };

  // Debounce search input
  useEffect(() => {
    if (searchMeta && searchMeta.exact && searchTerm === searchMeta.target) {
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchMeta && searchTerm !== searchMeta.target) {
        setSearchMeta(null);
      }
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchMeta]);

  const handleGeoChange = ({ division, district, upazila }) => {
    setSelectedDivision(division || '');
    setSelectedDistrict(district || '');
    setSelectedUpazila(upazila || '');
    setCurrentPage(1);
  };

  const handleGenderChange = (val) => {
    setSelectedGender(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  // Hierarchical cascading handlers with automatic pruning of invalid child selections
  const handleDesignationGroupsChange = (grps) => {
    setSelectedDesignationGroups(grps);
    if (grps.length > 0) {
      const validDisciplines = new Set(
        activeDataset.filter(s => grps.includes(s.designation_group)).map(s => s.major_discipline)
      );
      setSelectedDisciplines(prev => prev.filter(d => validDisciplines.has(d)));

      const validDesignations = new Set(
        activeDataset.filter(s => grps.includes(s.designation_group)).map(s => s.designation)
      );
      setSelectedDesignations(prev => prev.filter(d => validDesignations.has(d)));
    }
    setCurrentPage(1);
  };

  const handleDisciplinesChange = (discs) => {
    setSelectedDisciplines(discs);
    if (discs.length > 0) {
      const validDesignations = new Set(
        activeDataset
          .filter(s => (selectedDesignationGroups.length === 0 || selectedDesignationGroups.includes(s.designation_group)) && discs.includes(s.major_discipline))
          .map(s => s.designation)
      );
      setSelectedDesignations(prev => prev.filter(d => validDesignations.has(d)));
    }
    setCurrentPage(1);
  };

  const handleDesignationsChange = (desigs) => {
    setSelectedDesignations(desigs);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSearchMeta(null);
    setSelectedDesignationGroups([]);
    setSelectedDisciplines([]);
    setSelectedDesignations([]);
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setSelectedGender('');
    setSelectedStatus('');
    setHidePastPRL(false);
    setSortBy('prl_date');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (selectedDesignationGroups.length > 0) count += selectedDesignationGroups.length;
    if (selectedDisciplines.length > 0) count += selectedDisciplines.length;
    if (selectedDesignations.length > 0) count += selectedDesignations.length;
    if (selectedStatus) count++;
    if (selectedDivision) count++;
    if (selectedDistrict) count++;
    if (selectedUpazila) count++;
    if (selectedGender) count++;
    if (hidePastPRL) count++;
    return count;
  }, [debouncedSearch, selectedDesignationGroups, selectedDisciplines, selectedDesignations, selectedStatus, selectedDivision, selectedDistrict, selectedUpazila, selectedGender, hidePastPRL]);

  // Fetch metadata on mount
  const fetchMetadata = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const savedTime = localStorage.getItem('dghs_last_sync_time') || new Date().toISOString();
      setMetadata({
        last_run_at: savedTime,
        record_count: MOCK_STAFF.length,
        failed_count: 0
      });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('scrape_metadata')
        .select('*')
        .eq('id', 1)
        .single();
      if (data && !error) {
        setMetadata(data);
      }
    } catch (e) {
      console.warn('Metadata fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Staff Records with Filtering, Pagination & Sorting
  const fetchStaff = useCallback(async () => {
    if (isInitialMount.current) {
      setIsLoading(true);
    }
    setError(null);

    // High performance local dataset filtering and sorting
    const runLocalFilter = (sourceData) => {
      let filtered = [...sourceData];

      // 1. Search Query (Exact if selected from suggestion; Broad substring if typed words)
      if (debouncedSearch) {
        const isExact = Boolean(
          searchMeta &&
          searchMeta.exact &&
          debouncedSearch.trim().toLowerCase() === (searchMeta.target || '').trim().toLowerCase()
        );

        if (isExact) {
          const targetLower = (searchMeta.target || '').trim().toLowerCase();
          if (searchMeta.type === 'institute') {
            filtered = filtered.filter(s => s._facilityLower === targetLower);
          } else if (searchMeta.type === 'name') {
            filtered = filtered.filter(s => s._nameLower === targetLower);
          } else if (searchMeta.type === 'hris') {
            filtered = filtered.filter(s => s._hrisLower === targetLower);
          } else if (searchMeta.type === 'post_id') {
            filtered = filtered.filter(s => s._postIdStr === String(searchMeta.target).trim());
          } else if (searchMeta.type === 'designation') {
            filtered = filtered.filter(s => s._desigLower === targetLower);
          } else if (searchMeta.type === 'location') {
            filtered = filtered.filter(s => s._upzLower === targetLower || s._distLower === targetLower);
          } else {
            filtered = filtered.filter(s => s._facilityLower === targetLower);
          }
        } else {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(s => s._searchNorm.includes(q));
        }
      }

      // 2. Designation Groups Filter (Multi-select)
      if (selectedDesignationGroups.length > 0) {
        filtered = filtered.filter(s => selectedDesignationGroups.includes(s.designation_group));
      }

      // 3. Disciplines Filter (Hierarchical Multi-select)
      if (selectedDisciplines.length > 0) {
        filtered = filtered.filter(s => selectedDisciplines.includes(s.major_discipline));
      }

      // 4. Designations Filter (Hierarchical Multi-select)
      if (selectedDesignations.length > 0) {
        filtered = filtered.filter(s => selectedDesignations.includes(s.designation));
      }

      // 5. Status Filter (Filled, Vacant, Abolished)
      if (selectedStatus) {
        const statusLower = selectedStatus.toLowerCase();
        filtered = filtered.filter(s => s._statusLower === statusLower);
      }

      // 6. Division Filter
      if (selectedDivision) {
        const divLower = selectedDivision.toLowerCase();
        filtered = filtered.filter(s => s._divLower === divLower);
      }

      // 7. District Filter
      if (selectedDistrict) {
        const distLower = selectedDistrict.toLowerCase();
        filtered = filtered.filter(s => s._distLower === distLower);
      }

      // 8. Upazila Filter
      if (selectedUpazila) {
        const upzQ = selectedUpazila.toLowerCase();
        filtered = filtered.filter(s => 
          s._upzLower === upzQ ||
          s._facilityLower.includes(upzQ)
        );
      }

      // 9. Gender Filter
      if (selectedGender) {
        const genderLower = selectedGender.toLowerCase();
        filtered = filtered.filter(s => s._genderLower === genderLower);
      }

      // 10. Hide Past PRL Filter (Reference: Today's date YYYY-MM-DD)
      if (hidePastPRL) {
        const todayStr = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(s => {
          if (!s._prlDateStr) {
            return s._statusLower === 'vacant' || s._statusLower === 'abolished';
          }
          return s._prlDateStr >= todayStr;
        });
      }

      // 11. Robust Fast Sorting (Instant integer & fast string comparisons)
      filtered.sort((a, b) => {
        if (sortBy === 'prl_date') {
          const valA = a._prlDateStr || '';
          const valB = b._prlDateStr || '';
          if (!valA && valB) return 1;
          if (valA && !valB) return -1;
          if (!valA && !valB) return 0;
          return sortOrder === 'asc' ? (valA < valB ? -1 : valA > valB ? 1 : 0) : (valB < valA ? -1 : valB > valA ? 1 : 0);
        }

        if (sortBy === 'post_id') {
          const idA = a._postIdNum;
          const idB = b._postIdNum;
          return sortOrder === 'asc' ? idA - idB : idB - idA;
        }

        if (sortBy === 'institute_tier') {
          const rankA = a._tierRank;
          const rankB = b._tierRank;

          // 1. Primary Sort: Institute Tier (Higher tier first)
          if (rankA !== rankB) {
            return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
          }

          // 2. Secondary Sort: Group ALL posts of the SAME institute together!
          const facA = a._facilityLower;
          const facB = b._facilityLower;
          if (facA !== facB) {
            return facA < facB ? -1 : 1;
          }

          // 3. Tertiary Sort: Sort posts inside the institute by designation / post_id
          const desA = a._desigLower;
          const desB = b._desigLower;
          if (desA !== desB) {
            return desA < desB ? -1 : 1;
          }

          return a._postIdNum - b._postIdNum;
        }

        if (sortBy === 'name') {
          const isVacA = a._statusLower === 'vacant' || a._statusLower === 'abolished';
          const isVacB = b._statusLower === 'vacant' || b._statusLower === 'abolished';
          if (isVacA && !isVacB) return 1;
          if (!isVacA && isVacB) return -1;
          const nameA = a._nameLower;
          const nameB = b._nameLower;
          return sortOrder === 'asc' ? (nameA < nameB ? -1 : nameA > nameB ? 1 : 0) : (nameB < nameA ? -1 : nameB > nameA ? 1 : 0);
        }

        return 0;
      });

      setAllFilteredStaff(filtered);
      setTotalCount(filtered.length);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      setStaffList(filtered.slice(from, to));
      setIsLoading(false);
      isInitialMount.current = false;
    };

    runLocalFilter(indexedDataset);
  }, [
    indexedDataset,
    debouncedSearch,
    searchMeta,
    selectedDesignationGroups,
    selectedDisciplines,
    selectedDesignations,
    selectedStatus,
    selectedDivision,
    selectedDistrict,
    selectedUpazila,
    selectedGender,
    hidePastPRL,
    sortBy,
    sortOrder,
    currentPage
  ]);

  useEffect(() => {
    if (currentUser) {
      fetchStaff();
    }
  }, [fetchStaff, currentUser]);

  // Fetch central metadata from Supabase (if configured) and listen for realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase
      .from('scrape_metadata')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setMetadata(data);
        }
      });

    const channel = supabase
      .channel('scrape_metadata_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scrape_metadata' }, (payload) => {
        if (payload.new) {
          setMetadata(payload.new);
          fetchStaff();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStaff]);

  // Synchronize Cloud Users, Backups, Configuration & PDF Columns on startup
  useEffect(() => {
    syncUsersWithCloud();
    syncBackupsWithCloud();
    syncConfigWithCloud();
    syncPdfColumnsWithCloud();

    // Multi-Table Realtime Subscriptions for seamless cross-device synchronization
    if (isSupabaseConfigured && supabase) {
      const liveSyncChannel = supabase
        .channel('universal_app_sync_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
          syncUsersWithCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dghs_users' }, () => {
          syncUsersWithCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_backups' }, () => {
          syncBackupsWithCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
          syncConfigWithCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pdf_columns_config' }, () => {
          syncPdfColumnsWithCloud();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(liveSyncChannel);
      };
    }
  }, []);

  // Listen to local user updates to refresh active session
  useEffect(() => {
    const handleUserUpdate = () => {
      const active = getCurrentUser();
      if (active) setCurrentUser(active);
    };
    window.addEventListener('dghs_users_updated', handleUserUpdate);
    return () => window.removeEventListener('dghs_users_updated', handleUserUpdate);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Safe Force Update with Automatic Backup Snapshot & Universal Synchronization
  const handleForceUpdate = async () => {
    try {
      // 1. Automatically backup current dataset before updating (auto mode: automatically trims oldest if 5 limit reached)
      saveBackupSnapshot(activeDataset, `Pre-Update Backup (${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')})`, true);

      // 2. Perform sync timestamp update
      const newTimestamp = new Date().toISOString();
      const currentConfig = getSystemConfig();
      const filled = activeDataset.filter(s => s.status === 'Filled').length;
      const vacant = activeDataset.filter(s => s.status === 'Vacant').length;
      const abolished = activeDataset.filter(s => s.status === 'Abolished').length;

      const newMeta = {
        id: 1,
        last_run_at: newTimestamp,
        record_count: activeDataset.length,
        filled_count: filled,
        vacant_count: vacant,
        abolished_count: abolished,
        failed_count: 0,
        schedule_interval_days: currentConfig.scheduleIntervalDays || 7,
        status: 'idle',
        updated_at: newTimestamp
      };

      setMetadata(newMeta);

      // 3. If Supabase configured, update central cloud metadata
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('scrape_metadata')
          .upsert(newMeta, { onConflict: 'id' });
      }

      // 4. Refresh directory
      await fetchStaff();
      setSyncErrorNotice(null);
    } catch (err) {
      console.error('Force update failed:', err);
      setSyncErrorNotice('Update error: ' + err.message + '. Preserved the most recent working dataset.');
    }
  };

  // Create Manual Backup from SettingsModal
  const handleManualSnapshot = () => {
    return saveBackupSnapshot(activeDataset, `Manual Backup (${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')})`, false);
  };

  const handleExitRestoredView = () => {
    clearBackupOverride();
    setActiveRestoredBackup(null);
  };

  const handleExportPDF = async () => {
    if (!canExportPdf) {
      setPermissionDeniedFeature('PDF Report Export');
      return;
    }
    setIsExportingPDF(true);
    try {
      await exportFilteredStaffPDF(allFilteredStaff, {
        division: selectedDivision,
        district: selectedDistrict,
        upazila: selectedUpazila,
        status: selectedStatus,
        designationGroups: selectedDesignationGroups,
        disciplines: selectedDisciplines,
        designations: selectedDesignations,
        totalCount
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not export PDF: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSelectStaff = useCallback((staff) => {
    if (!canViewDetails) {
      setPermissionDeniedFeature('View Full Details');
      return;
    }
    setSelectedStaff(staff);
  }, [canViewDetails]);

  const formatTimestamp = (ts) => {
    if (!ts) return 'Live';
    try {
      return new Date(ts).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return ts;
    }
  };

  // Showing X to Y of Z text calculation (100 items per page)
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  // If user is not logged in, show Password Protected Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {appConfig.appTitle || 'DGHS Employee Directory'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {appConfig.appSubtitle || 'Central Directory of Medical Technologists and Pharmacists'}
              </p>
            </div>
          </div>

          {/* Header Actions Card: Styled as a clean card on mobile with space above */}
          <div className="mt-3 sm:mt-0 w-full sm:w-auto bg-slate-50/80 dark:bg-slate-800/60 sm:bg-transparent sm:dark:bg-transparent border border-slate-200/80 dark:border-slate-700/60 sm:border-transparent sm:dark:border-transparent rounded-2xl p-3 sm:p-0 shadow-2xs sm:shadow-none flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2">
            {/* On mobile: Row 2 (Next Update In) + Theme Switcher | On desktop: First in row */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CountdownBadge lastRunAt={metadata?.last_run_at} />

              {/* Mobile Theme Toggle Button (Visible only on mobile: sm:hidden) */}
              <button
                type="button"
                onClick={() => setTheme(toggleTheme())}
                className="sm:hidden p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-amber-400 text-slate-600 dark:text-amber-400 transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-90 duration-200" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600 animate-in spin-in-90 duration-200" />
                )}
              </button>
            </div>

            {/* On mobile: Row 1 (Last Updated, User, Settings, Logout) | On desktop: Follows Next Update In */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
              {/* Last Updated Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 sm:bg-slate-100 sm:dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-medium shadow-2xs sm:shadow-none shrink-0">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Last Updated: <strong className="font-semibold text-slate-900 dark:text-white">{formatTimestamp(metadata?.last_run_at)}</strong></span>
              </div>

              {/* User Actions Group (User pill, Desktop Theme Switcher, Settings, Logout) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Current User Pill (Showing only username) */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 sm:bg-slate-100 sm:dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs font-semibold shadow-2xs sm:shadow-none">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{currentUser.username || currentUser.name}</span>
                </div>

                {/* Desktop Theme Toggle Switcher Button (Placed before Settings icon; hidden on mobile) */}
                <button
                  type="button"
                  onClick={() => setTheme(toggleTheme())}
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-amber-400 text-slate-600 dark:text-amber-400 transition-all cursor-pointer shadow-2xs items-center justify-center"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-in spin-in-90 duration-200" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 animate-in spin-in-90 duration-200" />
                  )}
                </button>

                {/* Password-Protected Settings Button (Admin & Super Admin only; hidden for standard users) */}
                {isFullAdmin && (
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="System & Scraper Settings (Admin Only)"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Safety & Fallback Notification Banners */}
        {syncErrorNotice && (
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl mb-6 shadow-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-100">
                  Update Issue Detected — Safe Fallback Active
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {syncErrorNotice}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <button
                    onClick={handleForceUpdate}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Retry Update
                  </button>
                  {isFullAdmin && (
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100/80 dark:hover:bg-slate-700 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      View Stored Backups
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSyncErrorNotice(null)}
              className="text-amber-500 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
              title="Dismiss Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Restored Version Active Banner */}
        {activeRestoredBackup && (
          <div className="bg-teal-50/90 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 p-4 rounded-2xl mb-6 shadow-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/60 rounded-xl text-teal-800 dark:text-teal-200 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-teal-950 dark:text-teal-100">
                  Historical Backup Version Active
                </h4>
                <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5 leading-relaxed">
                  Displaying restored snapshot: <strong className="font-bold text-teal-900 dark:text-teal-200">{activeRestoredBackup.label}</strong> (Created: {new Date(activeRestoredBackup.createdAt).toLocaleString('en-GB')}, {activeRestoredBackup.recordCount?.toLocaleString()} records).
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {isFullAdmin && (
                    <>
                      <button
                        onClick={handleExitRestoredView}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        Switch Back to Latest Active
                      </button>
                      <button
                        onClick={() => setSettingsOpen(true)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-teal-100/80 dark:hover:bg-slate-700 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        Manage Stored Versions
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleExitRestoredView}
              className="text-teal-500 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
              title="Exit Restored View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <FilterBar
          searchTerm={searchTerm}
          searchMeta={searchMeta}
          onSearchChange={handleSearchChange}
          dataset={indexedDataset}
          selectedDesignationGroups={selectedDesignationGroups}
          onDesignationGroupsChange={handleDesignationGroupsChange}
          designationGroupOptions={designationGroupOptions}
          selectedDisciplines={selectedDisciplines}
          onDisciplinesChange={handleDisciplinesChange}
          disciplineOptions={disciplineOptions}
          selectedDesignations={selectedDesignations}
          onDesignationsChange={handleDesignationsChange}
          designationOptions={designationOptions}
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          selectedDistrict={selectedDistrict}
          onDistrictChange={setSelectedDistrict}
          selectedUpazila={selectedUpazila}
          onGeoChange={handleGeoChange}
          selectedGender={selectedGender}
          onGenderChange={handleGenderChange}
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          hidePastPRL={hidePastPRL}
          onHidePastPRLChange={(val) => {
            setHidePastPRL(val);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
          stats={dynamicStatusStats}
        />

        {/* Action Bar: Showing Count on Left & Green PDF Export Button on Right (Always in same row on mobile) */}
        <div className="flex flex-row items-center justify-between gap-2.5 mb-5 px-1">
          {/* Results Summary Count */}
          <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 truncate min-w-0">
            {isLoading ? (
              <span>Loading directory...</span>
            ) : totalCount === 0 ? (
              <span>No records found</span>
            ) : (
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{startItem.toLocaleString()} to {endItem.toLocaleString()}</strong> of{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{totalCount.toLocaleString()}</strong> posts
              </span>
            )}
          </div>

          {/* Green PDF Export Button (Visible to all; Active if permitted, Inactive/Disabled by default for User role) */}
          <button
            onClick={handleExportPDF}
            disabled={isLoading || totalCount === 0 || isExportingPDF || !canExportPdf}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 select-none ${
              !canExportPdf
                ? 'bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={
              !canExportPdf
                ? 'PDF export is restricted for your account. Contact an administrator to enable PDF export permission.'
                : 'Download formatted PDF report for current filter'
            }
          >
            {!canExportPdf ? (
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" />
            ) : (
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span>{isExportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchStaff}
              className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No matching posts found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              No matching records found for the selected filter criteria.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* 100 Cards per Page */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {staffList.map((staff) => (
                <StaffCard
                  key={staff.id || staff.hris_id || staff.post_id}
                  staff={staff}
                  onSelect={handleSelectStaff}
                  canViewHris={canViewHris}
                  canViewPhone={canViewPhone}
                  canViewPrl={canViewPrl}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalRecords={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <Suspense fallback={null}>
          <StaffDetailModal
            staff={selectedStaff}
            onClose={() => setSelectedStaff(null)}
            canViewHris={canViewHris}
            canViewPhone={canViewPhone}
            canViewPrl={canViewPrl}
          />
        </Suspense>
      )}

      {/* Permission Denied Feature Popup */}
      <PermissionDeniedModal
        isOpen={Boolean(permissionDeniedFeature)}
        onClose={() => setPermissionDeniedFeature(null)}
        featureName={permissionDeniedFeature}
      />

      {/* Password-Protected Settings Modal (Admin & Super Admin Only) */}
      {settingsOpen && isFullAdmin && (
        <Suspense fallback={null}>
          <SettingsModal
            currentUser={currentUser}
            onClose={() => setSettingsOpen(false)}
            onForceUpdate={handleForceUpdate}
            onManualSnapshot={handleManualSnapshot}
            dynamicStats={globalStats}
            metadata={metadata}
          />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium px-4">
        {(() => {
          const content = appConfig.footerText || 'DGHS Employee Directory - Developed By Ansarul Anis';
          const target = 'Ansarul Anis';
          if (content.toLowerCase().includes(target.toLowerCase())) {
            const regex = new RegExp(`(${target})`, 'i');
            const parts = content.split(regex);
            return parts.map((part, i) =>
              part.toLowerCase() === target.toLowerCase() ? (
                <a
                  key={i}
                  href="https://www.facebook.com/ansarulanis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold hover:underline transition-colors cursor-pointer inline-flex items-center"
                >
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              )
            );
          }
          return content;
        })()}
      </footer>

      {/* Floating Circular Back to Top Button (Transparent Frosted Green Glassmorphism with Theme Gradient) */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-emerald-600/75 to-teal-600/60 hover:from-emerald-500/90 hover:to-teal-500/80 backdrop-blur-xl backdrop-saturate-150 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 hover:shadow-xl hover:shadow-emerald-600/30 border border-white/40 hover:border-white/70 ring-1 ring-emerald-300/30 hover:ring-2 hover:ring-emerald-400/50 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 cursor-pointer animate-in fade-in zoom-in-75"
        >
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] drop-shadow-xs" />
        </button>
      )}
    </div>
  );
}