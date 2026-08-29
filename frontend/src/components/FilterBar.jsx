import React, { useMemo } from 'react';
import { Search, RotateCcw, ArrowUpDown, ChevronDown, Calendar } from 'lucide-react';
import { 
  BANGLADESH_DIVISIONS, 
  BANGLADESH_DISTRICTS, 
  BANGLADESH_UPAZILAS,
  DISTRICT_TO_DIVISION_MAP 
} from '../lib/bangladeshGeo';

export default function FilterBar({
  searchTerm,
  onSearchChange,
  selectedDivision,
  selectedDistrict,
  selectedUpazila,
  onGeoChange,
  selectedGender,
  onGenderChange,
  selectedStatus,
  onStatusChange,
  hidePastPRL,
  onHidePastPRLChange,
  sortBy,
  sortOrder,
  onSortChange,
  onResetFilters,
  activeFilterCount,
  stats
}) {
  // Compute available districts dynamically based on selected division
  const availableDistricts = useMemo(() => {
    if (!selectedDivision) {
      return Object.values(BANGLADESH_DISTRICTS).flat().sort();
    }
    return BANGLADESH_DISTRICTS[selectedDivision] || [];
  }, [selectedDivision]);

  // Compute available upazilas dynamically based on selected district
  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) {
      return [];
    }
    return BANGLADESH_UPAZILAS[selectedDistrict] || [];
  }, [selectedDistrict]);

  const handleDivisionChange = (div) => {
    onGeoChange({
      division: div,
      district: '',
      upazila: ''
    });
  };

  const handleDistrictChange = (dist) => {
    if (!dist) {
      onGeoChange({
        division: selectedDivision,
        district: '',
        upazila: ''
      });
      return;
    }

    const parentDiv = DISTRICT_TO_DIVISION_MAP[dist.toLowerCase()] || selectedDivision;
    onGeoChange({
      division: parentDiv,
      district: dist,
      upazila: ''
    });
  };

  const handleUpazilaChange = (upz) => {
    onGeoChange({
      division: selectedDivision,
      district: selectedDistrict,
      upazila: upz
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-6 space-y-4">
      {/* Top Search & Primary Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, institute, post ID, or HRIS ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Right Controls: Hide Past PRL Toggle + Sort Dropdown & Reset */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* Hide Past PRL Toggle Button */}
          <button
            type="button"
            onClick={() => onHidePastPRLChange(!hidePastPRL)}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer select-none shrink-0 ${
              hidePastPRL
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs ring-1 ring-emerald-500/20 font-bold'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-600'
            }`}
            title={hidePastPRL ? 'Showing upcoming & future PRL only (past PRL hidden)' : 'Click to hide personnel whose PRL date has already passed today'}
          >
            <Calendar className={`w-3.5 h-3.5 ${hidePastPRL ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="inline">Hide Past PRL</span>
            {/* Toggle switch pill */}
            <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
              hidePastPRL ? 'bg-emerald-600' : 'bg-slate-300'
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                hidePastPRL ? 'translate-x-3' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex-1 sm:w-56">
            <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                onSortChange(sb, so);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="prl_date-asc">PRL Date (Earliest first)</option>
              <option value="prl_date-desc">PRL Date (Latest first)</option>
              <option value="post_id-asc">Post ID (Ascending ↑)</option>
              <option value="post_id-desc">Post ID (Descending ↓)</option>
              <option value="name-asc">Name (A → Z)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Cascading Filter Controls Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
        {/* Post Status Filter */}
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Post Status
          </label>
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">All Status ({stats.total})</option>
              <option value="Filled">Filled Posts ({stats.filled})</option>
              <option value="Vacant">Vacant Posts ({stats.vacant})</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Division Dropdown */}
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Division
          </label>
          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">All Divisions</option>
              {BANGLADESH_DIVISIONS.map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* District Dropdown */}
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            District
          </label>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">{selectedDivision ? `All Districts in ${selectedDivision}` : 'All Districts'}</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Upazila Dropdown */}
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Upazila
          </label>
          <div className="relative">
            <select
              value={selectedUpazila}
              onChange={(e) => handleUpazilaChange(e.target.value)}
              disabled={!selectedDistrict}
              className={`w-full px-3 py-2 border rounded-xl text-xs font-medium appearance-none ${
                selectedDistrict
                  ? 'bg-slate-50 border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer'
                  : 'bg-slate-100 border-slate-200/60 text-slate-400 cursor-not-allowed'
              }`}
            >
              <option value="">{selectedDistrict ? `All Upazilas in ${selectedDistrict}` : 'Select District first'}</option>
              {availableUpazilas.map((upz) => (
                <option key={upz} value={upz}>{upz}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Gender Filter */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Gender
          </label>
          <div className="relative">
            <select
              value={selectedGender}
              onChange={(e) => onGenderChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}