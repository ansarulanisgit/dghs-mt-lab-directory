import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export default function MultiSelectDropdown({
  title,
  options = [], // [{ value, label, count }]
  selectedValues = [],
  onChange,
  placeholder = 'Select options...',
  searchable = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    : options;

  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClearAll = (e) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Render trigger text
  let triggerText = `All ${title}`;
  if (selectedValues.length === 1) {
    const matched = options.find(o => o.value === selectedValues[0]);
    triggerText = matched ? matched.label : selectedValues[0];
  } else if (selectedValues.length > 1) {
    triggerText = `${selectedValues.length} Selected`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
        {title}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer select-none text-left ${
          selectedValues.length > 0
            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500/20'
            : 'border-slate-200 text-slate-700 hover:bg-slate-100/70 focus:ring-2 focus:ring-emerald-500'
        }`}
      >
        <span className="truncate flex-1 font-semibold">
          {triggerText}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <span
              onClick={handleClearAll}
              className="p-0.5 rounded-md hover:bg-emerald-200/60 text-emerald-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[240px] max-w-[340px] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[11px]">
            <span className="font-bold text-slate-500">
              {options.length} {options.length === 1 ? 'Option' : 'Options'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-slate-800 font-semibold hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search Box if Searchable */}
          {searchable && options.length > 6 && (
            <div className="relative px-1 pt-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Filter ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Option List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate leading-tight">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                        isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opt.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
