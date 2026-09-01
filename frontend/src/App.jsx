import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured, MOCK_STAFF, MOCK_METADATA } from './lib/supabaseClient';
import { getCurrentUser, logoutUser } from './lib/authStore';
import { getSystemConfig } from './lib/configStore';
import { calculateTimeRemaining } from './lib/countdownUtil';
import { exportFilteredStaffPDF } from './lib/pdfExport';
import {
  getBackups, saveBackupSnapshot, getActiveBackupOverride, clearBackupOverride
} from './lib/backupStore';
import { syncPdfColumnsWithCloud } from './lib/pdfConfigStore';
import StaffCard from './components/StaffCard';
import FilterBar from './components/FilterBar';
import Pagination from './components/Pagination';
import StaffDetailModal from './components/StaffDetailModal';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import PermissionDeniedModal from './components/PermissionDeniedModal';
import {
  Users, Clock, Settings, LogOut, AlertCircle, RefreshCw, Layers, User, FileDown, Timer,
  AlertTriangle, Info, X, ShieldAlert, CheckCircle2, ChevronUp, Lock
} from 'lucide-react';

const PAGE_SIZE = 100; // 100 items per page

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionDeniedFeature, setPermissionDeniedFeature] = useState(null);

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
  const [countdownText, setCountdownText] = useState('');

  // Resilience & Backup States
  const [activeRestoredBackup, setActiveRestoredBackup] = useState(getActiveBackupOverride());
  const [syncErrorNotice, setSyncErrorNotice] = useState(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  const globalStats = useMemo(() => {
    const total = activeDataset.length || 0;
    const filled = activeDataset.filter(s => s.status === 'Filled').length || 0;
    const vacant = activeDataset.filter(s => s.status === 'Vacant').length || 0;
    const abolished = activeDataset.filter(s => s.status === 'Abolished').length || 0;
    return { total, filled, vacant, abolished };
  }, [activeDataset]);

  // Dynamic Post Status Counts (Updates dynamically when Designation Groups, Disciplines, Designations or other non-status filters are selected)
  const dynamicStatusStats = useMemo(() => {
    let subset = activeDataset;

    // Apply Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      subset = subset.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.current_institute || '').toLowerCase().includes(q) ||
        (s.hris_id || '').toLowerCase().includes(q) ||
        (s.post_id || '').includes(q) ||
        (s.district || '').toLowerCase().includes(q) ||
        (s.upazila || '').toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q) ||
        (s.major_discipline || '').toLowerCase().includes(q) ||
        (s.designation_group || '').toLowerCase().includes(q)
      );
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
      subset = subset.filter(s => (s.division || '').toLowerCase() === selectedDivision.toLowerCase());
    }

    // Apply District
    if (selectedDistrict) {
      subset = subset.filter(s => (s.district || '').toLowerCase() === selectedDistrict.toLowerCase());
    }

    // Apply Upazila
    if (selectedUpazila) {
      const upzQ = selectedUpazila.toLowerCase();
      subset = subset.filter(s => 
        (s.upazila && s.upazila.toLowerCase() === upzQ) ||
        (s.current_institute && s.current_institute.toLowerCase().includes(upzQ))
      );
    }

    // Apply Gender
    if (selectedGender) {
      subset = subset.filter(s => (s.gender || '').toLowerCase() === selectedGender.toLowerCase());
    }

    // Apply Hide Past PRL
    if (hidePastPRL) {
      const todayStr = new Date().toISOString().split('T')[0];
      subset = subset.filter(s => {
        if (!s.prl_date) return s.status === 'Vacant' || s.status === 'Abolished';
        return s.prl_date.split('T')[0] >= todayStr;
      });
    }

    const total = subset.length;
    const filled = subset.filter(s => s.status === 'Filled').length;
    const vacant = subset.filter(s => s.status === 'Vacant').length;
    const abolished = subset.filter(s => s.status === 'Abolished').length;

    return { total, filled, vacant, abolished };
  }, [
    activeDataset,
    debouncedSearch,
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
  const [appConfig, setAppConfig] = useState(getSystemConfig());

  // Universal Central Live Countdown based on configured interval days & central anchor timestamp
  useEffect(() => {
    function updateCountdown() {
      const config = getSystemConfig();
      setAppConfig(config);
      const text = calculateTimeRemaining(config.scheduleIntervalDays || 7, metadata?.last_run_at || MOCK_METADATA.last_run_at);
      setCountdownText(text);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    const handleConfigUpdate = () => updateCountdown();
    window.addEventListener('dghs_config_updated', handleConfigUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dghs_config_updated', handleConfigUpdate);
    };
  }, [metadata]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    setIsLoading(true);
    setError(null);

    // Fallback or Local / Restored Dataset Filtering
    const runLocalFilter = (sourceData) => {
      let filtered = [...sourceData];

      // 1. Search Query
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.current_institute || '').toLowerCase().includes(q) ||
          (s.hris_id || '').toLowerCase().includes(q) ||
          (s.post_id || '').includes(q) ||
          (s.district || '').toLowerCase().includes(q) ||
          (s.upazila || '').toLowerCase().includes(q) ||
          (s.designation || '').toLowerCase().includes(q) ||
          (s.major_discipline || '').toLowerCase().includes(q) ||
          (s.designation_group || '').toLowerCase().includes(q)
        );
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
        filtered = filtered.filter(s => (s.status || '').toLowerCase() === selectedStatus.toLowerCase());
      }

      // 6. Division Filter
      if (selectedDivision) {
        filtered = filtered.filter(s => (s.division || '').toLowerCase() === selectedDivision.toLowerCase());
      }

      // 7. District Filter
      if (selectedDistrict) {
        filtered = filtered.filter(s => (s.district || '').toLowerCase() === selectedDistrict.toLowerCase());
      }

      // 8. Upazila Filter
      if (selectedUpazila) {
        const upzQ = selectedUpazila.toLowerCase();
        filtered = filtered.filter(s => 
          (s.upazila && s.upazila.toLowerCase() === upzQ) ||
          (s.current_institute && s.current_institute.toLowerCase().includes(upzQ))
        );
      }

      // 9. Gender Filter
      if (selectedGender) {
        filtered = filtered.filter(s => (s.gender || '').toLowerCase() === selectedGender.toLowerCase());
      }

      // 10. Hide Past PRL Filter (Reference: Today's date YYYY-MM-DD)
      if (hidePastPRL) {
        const todayStr = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(s => {
          if (!s.prl_date) {
            return s.status === 'Vacant' || s.status === 'Abolished';
          }
          const itemDate = s.prl_date.split('T')[0];
          return itemDate >= todayStr;
        });
      }

      // 11. Robust Sorting
      filtered.sort((a, b) => {
        if (sortBy === 'prl_date') {
          const valA = a.prl_date || '';
          const valB = b.prl_date || '';
          if (!valA && valB) return 1;
          if (valA && !valB) return -1;
          if (!valA && !valB) return 0;
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (sortBy === 'post_id') {
          const idA = parseInt(a.post_id, 10) || 0;
          const idB = parseInt(b.post_id, 10) || 0;
          return sortOrder === 'asc' ? idA - idB : idB - idA;
        }

        if (sortBy === 'name') {
          const isVacA = a.status === 'Vacant' || a.status === 'Abolished';
          const isVacB = b.status === 'Vacant' || b.status === 'Abolished';
          if (isVacA && !isVacB) return 1;
          if (!isVacA && isVacB) return -1;
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }

        return 0;
      });

      setAllFilteredStaff(filtered);
      setTotalCount(filtered.length);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      setStaffList(filtered.slice(from, to));
      setIsLoading(false);
    };

    if (!isSupabaseConfigured || activeRestoredBackup) {
      runLocalFilter(activeDataset);
      return;
    }

    try {
      let query = supabase
        .from('mt_lab_staff')
        .select('*', { count: 'exact' });

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,current_institute.ilike.%${debouncedSearch}%,hris_id.ilike.%${debouncedSearch}%,post_id.ilike.%${debouncedSearch}%`);
      }
      if (selectedStatus) query = query.ilike('status', selectedStatus);
      if (selectedDivision) query = query.ilike('division', selectedDivision);
      if (selectedDistrict) query = query.ilike('district', selectedDistrict);
      if (selectedUpazila) query = query.ilike('upazila', selectedUpazila);
      if (selectedGender) query = query.ilike('gender', selectedGender);
      if (hidePastPRL) {
        const todayStr = new Date().toISOString().split('T')[0];
        query = query.gte('prl_date', todayStr);
      }

      const isAsc = sortOrder === 'asc';
      query = query.order(sortBy, { ascending: isAsc, nullsFirst: false });

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;
      if (queryError) throw queryError;

      setStaffList(data || []);
      setTotalCount(count || 0);

      // Fetch all matching records for full PDF export
      let allQuery = supabase
        .from('mt_lab_staff')
        .select('*');
      if (debouncedSearch) allQuery = allQuery.or(`name.ilike.%${debouncedSearch}%,current_institute.ilike.%${debouncedSearch}%,hris_id.ilike.%${debouncedSearch}%,post_id.ilike.%${debouncedSearch}%`);
      if (selectedStatus) allQuery = allQuery.ilike('status', selectedStatus);
      if (selectedDivision) allQuery = allQuery.ilike('division', selectedDivision);
      if (selectedDistrict) allQuery = allQuery.ilike('district', selectedDistrict);
      if (selectedUpazila) allQuery = allQuery.ilike('upazila', selectedUpazila);
      if (selectedGender) allQuery = allQuery.ilike('gender', selectedGender);
      if (hidePastPRL) {
        const todayStr = new Date().toISOString().split('T')[0];
        allQuery = allQuery.gte('prl_date', todayStr);
      }
      allQuery = allQuery.order(sortBy, { ascending: isAsc, nullsFirst: false });
      const { data: allData } = await allQuery;
      setAllFilteredStaff(allData || data || []);
      setSyncErrorNotice(null);
    } catch (err) {
      console.error('Error fetching staff from cloud:', err);
      setSyncErrorNotice('Update/Sync issue encountered: Unable to reach portal database. Keeping most recent cached dataset intact.');
      runLocalFilter(activeDataset);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeDataset,
    activeRestoredBackup,
    debouncedSearch,
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

  // Synchronize PDF columns configuration from cloud on startup
  useEffect(() => {
    syncPdfColumnsWithCloud();
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
      setMetadata(prev => ({
        ...prev,
        last_run_at: newTimestamp
      }));

      // 3. If Supabase configured, update central cloud metadata
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('scrape_metadata')
          .upsert({
            id: 1,
            last_run_at: newTimestamp,
            record_count: activeDataset.length,
            failed_count: 0
          }, { onConflict: 'id' });
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

  const handleExportPDF = () => {
    if (!canExportPdf) {
      setPermissionDeniedFeature('PDF Report Export');
      return;
    }
    setIsExportingPDF(true);
    try {
      exportFilteredStaffPDF(allFilteredStaff, {
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

  const handleSelectStaff = (staff) => {
    if (!canViewDetails) {
      setPermissionDeniedFeature('View Full Details');
      return;
    }
    setSelectedStaff(staff);
  };

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {appConfig.appTitle || 'DGHS Employee Directory'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {appConfig.appSubtitle || 'Central Directory of Medical Technologists and Pharmacists'}
              </p>
            </div>
          </div>

          {/* Header Actions Card: Styled as a clean card on mobile with space above */}
          <div className="mt-3 sm:mt-0 w-full sm:w-auto bg-slate-50/80 sm:bg-transparent border border-slate-200/80 sm:border-transparent rounded-2xl p-3 sm:p-0 shadow-2xs sm:shadow-none flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2">
            {/* On mobile: Row 2 (Next Update In - content width) | On desktop: First in row */}
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-semibold shadow-2xs w-fit self-start sm:self-auto shrink-0">
              <Timer className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Next Update In: <strong className="font-mono font-bold text-emerald-900">{countdownText || 'Calculating...'}</strong></span>
            </div>

            {/* On mobile: Row 1 (Last Updated, User, Settings, Logout in single row) | On desktop: Follows Next Update In */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
              {/* Last Updated Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white sm:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium shadow-2xs sm:shadow-none shrink-0">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Last Updated: <strong className="font-semibold text-slate-900">{formatTimestamp(metadata?.last_run_at)}</strong></span>
              </div>

              {/* User Actions Group (User pill, Settings, Logout) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Current User Pill (Showing only username) */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white sm:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] sm:text-xs font-semibold shadow-2xs sm:shadow-none">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{currentUser.username || currentUser.name}</span>
                </div>

                {/* Password-Protected Settings Button */}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                  title="System & Scraper Settings (Password Protected)"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 transition-colors cursor-pointer shadow-2xs"
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
          <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl mb-6 shadow-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  Update Issue Detected — Safe Fallback Active
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  {syncErrorNotice}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <button
                    onClick={handleForceUpdate}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Retry Update
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    View Stored Backups
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSyncErrorNotice(null)}
              className="text-amber-500 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
              title="Dismiss Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Restored Version Active Banner */}
        {activeRestoredBackup && (
          <div className="bg-teal-50/90 border border-teal-300 p-4 rounded-2xl mb-6 shadow-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 rounded-xl text-teal-800 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-teal-950">
                  Historical Backup Version Active
                </h4>
                <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                  Displaying restored snapshot: <strong className="font-bold text-teal-900">{activeRestoredBackup.label}</strong> (Created: {new Date(activeRestoredBackup.createdAt).toLocaleString('en-GB')}, {activeRestoredBackup.recordCount?.toLocaleString()} records).
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <button
                    onClick={handleExitRestoredView}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Switch Back to Latest Active
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-teal-100/80 border border-teal-300 text-teal-900 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Manage Stored Versions
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleExitRestoredView}
              className="text-teal-500 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
              title="Exit Restored View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dataset={activeDataset}
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
          <div className="text-xs sm:text-sm font-semibold text-slate-600 truncate min-w-0">
            {isLoading ? (
              <span>Loading directory...</span>
            ) : totalCount === 0 ? (
              <span>No records found</span>
            ) : (
              <span>
                Showing <strong className="text-slate-900">{startItem.toLocaleString()} to {endItem.toLocaleString()}</strong> of{' '}
                <strong className="text-emerald-700 font-extrabold">{totalCount.toLocaleString()}</strong> posts
              </span>
            )}
          </div>

          {/* Green PDF Export Button (Visible to all; Active if permitted, Inactive/Disabled by default for User role) */}
          <button
            onClick={handleExportPDF}
            disabled={isLoading || totalCount === 0 || isExportingPDF || !canExportPdf}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 select-none ${
              !canExportPdf
                ? 'bg-slate-200/90 border border-slate-300 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={
              !canExportPdf
                ? 'PDF export is restricted for your account. Contact an administrator to enable PDF export permission.'
                : 'Download formatted PDF report for current filter'
            }
          >
            {!canExportPdf ? (
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span>{isExportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchStaff}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
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
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching posts found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
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
        <StaffDetailModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          canViewHris={canViewHris}
          canViewPhone={canViewPhone}
          canViewPrl={canViewPrl}
        />
      )}

      {/* Permission Denied Feature Popup */}
      <PermissionDeniedModal
        isOpen={Boolean(permissionDeniedFeature)}
        onClose={() => setPermissionDeniedFeature(null)}
        featureName={permissionDeniedFeature}
      />

      {/* Password-Protected Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setSettingsOpen(false)}
          onForceUpdate={handleForceUpdate}
          onManualSnapshot={handleManualSnapshot}
          dynamicStats={globalStats}
          metadata={metadata}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium px-4">
        {appConfig.footerText || 'DGHS Employee Directory - Developed By Ansarul Anis'}
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