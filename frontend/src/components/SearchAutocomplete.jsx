import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, Building2, Hash, Award, MapPin, ArrowRight } from 'lucide-react';

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const str = String(text);
  const qLower = query.toLowerCase();
  const idx = str.toLowerCase().indexOf(qLower);
  if (idx === -1) return str;

  const before = str.slice(0, idx);
  const match = str.slice(idx, idx + query.length);
  const after = str.slice(idx + query.length);

  return (
    <>
      {before}
      <span className="font-extrabold text-emerald-700 bg-emerald-100/80 px-0.5 rounded">{match}</span>
      {after}
    </>
  );
}

export default function SearchAutocomplete({
  value = '',
  onChange,
  dataset = [],
  placeholder = 'Search by name, institute, designation, post ID, or HRIS ID...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click/tap
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Compute fast, prioritized suggestions across categories
  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q || q.length < 2 || !Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    const nameMatches = [];
    const instituteMatches = [];
    const hrisMatches = [];
    const designationMatches = [];
    const locationMatches = [];

    const seenNames = new Set();
    const seenInstitutes = new Set();
    const seenHris = new Set();
    const seenDesignations = new Set();
    const seenLocations = new Set();

    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      const name = item.name || '';
      const institute = item.facility || item.current_institute || '';
      const hris = item.hris_id || '';
      const postId = item.post_id || '';
      const designation = item.designation || '';
      const upazila = item.upazila || '';
      const district = item.district || '';
      const isFilled = item.status === 'Filled' && !name.includes('[Vacant') && !name.includes('[Abolished');

      // 1. Staff Name Match (only real filled staff)
      if (isFilled && name.toLowerCase().includes(q) && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        nameMatches.push({
          type: 'name',
          category: 'Personnel',
          icon: User,
          primaryText: name,
          secondaryText: `${designation} • ${institute || 'DGHS Facility'}`,
          searchValue: name,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        });
      }

      // 2. Institute / Facility Match
      if (institute && institute.toLowerCase().includes(q) && !seenInstitutes.has(institute.toLowerCase())) {
        seenInstitutes.add(institute.toLowerCase());
        instituteMatches.push({
          type: 'institute',
          category: 'Institute / Facility',
          icon: Building2,
          primaryText: institute,
          secondaryText: [upazila, district].filter(Boolean).join(', ') || 'Bangladesh',
          searchValue: institute,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
        });
      }

      // 3. HRIS / Post ID Match
      if (hris && hris !== 'VACANT' && hris !== 'ABOLISHED' && hris.toLowerCase().includes(q) && !seenHris.has(hris)) {
        seenHris.add(hris);
        hrisMatches.push({
          type: 'hris',
          category: 'HRIS ID',
          icon: Hash,
          primaryText: `HRIS: ${hris}`,
          secondaryText: `${isFilled ? name : 'Post #' + postId} • ${designation}`,
          searchValue: hris,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
        });
      } else if (postId && postId.includes(q) && !seenHris.has(`post-${postId}`)) {
        seenHris.add(`post-${postId}`);
        hrisMatches.push({
          type: 'post_id',
          category: 'Post ID',
          icon: Hash,
          primaryText: `Post ID: #${postId}`,
          secondaryText: `${designation} • ${institute}`,
          searchValue: postId,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
        });
      }

      // 4. Designation Match
      if (designation && designation.toLowerCase().includes(q) && !seenDesignations.has(designation.toLowerCase())) {
        seenDesignations.add(designation.toLowerCase());
        designationMatches.push({
          type: 'designation',
          category: 'Designation',
          icon: Award,
          primaryText: designation,
          secondaryText: `${item.designation_group} • ${item.major_discipline || 'General'}`,
          searchValue: designation,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-200'
        });
      }

      // 5. Upazila / District Match
      const locKey = `${upazila}, ${district}`.toLowerCase();
      if ((upazila.toLowerCase().includes(q) || district.toLowerCase().includes(q)) && !seenLocations.has(locKey) && upazila) {
        seenLocations.add(locKey);
        locationMatches.push({
          type: 'location',
          category: 'Location',
          icon: MapPin,
          primaryText: `${upazila}, ${district}`,
          secondaryText: `${item.division || 'Bangladesh'} Division`,
          searchValue: upazila || district,
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-200'
        });
      }

      // Cap checks to keep search extremely fast
      if (
        nameMatches.length >= 4 &&
        instituteMatches.length >= 3 &&
        hrisMatches.length >= 2 &&
        designationMatches.length >= 2
      ) {
        break;
      }
    }

    // Interleave top results: Names first, then institutes, HRIS/Post IDs, designations, locations
    const combined = [
      ...nameMatches.slice(0, 4),
      ...instituteMatches.slice(0, 3),
      ...hrisMatches.slice(0, 2),
      ...designationMatches.slice(0, 2),
      ...locationMatches.slice(0, 2)
    ];

    return combined.slice(0, 10);
  }, [value, dataset]);

  const handleSelect = (item) => {
    onChange(item.searchValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative flex-1 ${className}`}>
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (value && value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
          autoComplete="off"
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Suggested Matches ({suggestions.length})</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Use ↑ ↓ arrows to navigate</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((item, index) => {
              const Icon = item.icon;
              const isSelected = highlightedIndex === index;

              return (
                <div
                  key={`${item.type}-${item.searchValue}-${index}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {highlightMatch(item.primaryText, value)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {item.secondaryText}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-emerald-700 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
