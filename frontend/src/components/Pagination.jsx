import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalRecords,
  pageSize = 100,
  onPageChange,
  isTop = false
}) {
  const [jumpInput, setJumpInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  if (totalPages <= 1 && totalRecords <= pageSize) {
    if (isTop) return null;
    return (
      <div className="mt-8 text-center text-xs text-slate-500 font-medium">
        Showing all {totalRecords.toLocaleString()} posts
      </div>
    );
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    const delta = isTop ? 1 : 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const handleJump = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpInput('');
    }
  };

  // Top Pagination Layout
  if (isTop) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First & Prev */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Number buttons on larger screens */}
        <div className="hidden lg:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`top-dots-${idx}`} className="px-1 text-slate-400 text-xs">...</span>
            ) : (
              <button
                key={`top-page-${page}`}
                onClick={() => onPageChange(page)}
                className={`min-w-[30px] h-7.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Page text indicator on smaller screens */}
        <span className="lg:hidden text-xs font-bold text-slate-700 px-1.5">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next & Last */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>

        {/* Mini Jump Form */}
        <form onSubmit={handleJump} className="hidden sm:flex items-center gap-1 ml-1">
          <input
            type="number"
            min="1"
            max={totalPages}
            placeholder="Go"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="w-12 h-7.5 px-1.5 text-center text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
          />
        </form>
      </div>
    );
  }

  // Bottom Pagination Layout
  return (
    <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Record info */}
      <div className="text-sm text-slate-500 font-medium">
        Showing <span className="font-semibold text-slate-800">{totalRecords > 0 ? startRecord.toLocaleString() : 0}</span> to{' '}
        <span className="font-semibold text-slate-800">{endRecord.toLocaleString()}</span> of{' '}
        <span className="font-semibold text-emerald-700 font-bold">{totalRecords.toLocaleString()}</span> posts
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* First & Prev */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Number buttons */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`page-dots-${idx}`} className="px-2 text-slate-400 text-sm">...</span>
            ) : (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Current page indicator on small screens */}
        <span className="md:hidden text-sm font-semibold text-slate-700 px-2">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next & Last */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Jump to page */}
        <form onSubmit={handleJump} className="flex items-center gap-1 ml-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            placeholder="Page"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="w-16 h-9 px-2 text-center text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}