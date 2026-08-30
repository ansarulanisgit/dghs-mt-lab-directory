import React from 'react';

/**
 * Meaningful and distinct Male Avatar Icon (Short hair contour & collar)
 */
export function MaleAvatarIcon({ className = "w-3 h-3 text-blue-600" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Male Head & Hair Contour */}
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M9 5.5a3.5 3.5 0 0 1 6 0" />
      {/* Shoulders & V-Collar */}
      <path d="M6 20v-1.5a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1.5" />
      <path d="M10.5 14.5l1.5 2 1.5-2" />
    </svg>
  );
}

/**
 * Meaningful and distinct Female Avatar Icon (Longer hair side locks & feminine curve)
 */
export function FemaleAvatarIcon({ className = "w-3 h-3 text-pink-600" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Female Head */}
      <circle cx="12" cy="7.5" r="3.5" />
      {/* Side hair locks */}
      <path d="M8.5 7c-.5 2-.5 4.5.5 6" />
      <path d="M15.5 7c.5 2 .5 4.5-.5 6" />
      <path d="M9 5.5a3.5 3.5 0 0 1 6 0" />
      {/* Curved Shoulders */}
      <path d="M6 20v-1.2a4 4 0 0 1 4-3.8h4a4 4 0 0 1 4 3.8v1.2" />
    </svg>
  );
}

/**
 * Reusable, styled Gender Badge
 */
export function GenderBadge({ gender, size = "sm" }) {
  if (!gender || gender === 'N/A') return null;

  const isFemale = gender.toLowerCase() === 'female';
  const isMale = gender.toLowerCase() === 'male';

  if (!isFemale && !isMale) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full select-none transition-all ${
        size === 'sm' 
          ? 'px-2 py-0.5 text-[10px]' 
          : 'px-2.5 py-1 text-xs'
      } ${
        isFemale
          ? 'bg-pink-50 text-pink-800 border border-pink-200/90 shadow-2xs'
          : 'bg-blue-50 text-blue-800 border border-blue-200/90 shadow-2xs'
      }`}
    >
      {isFemale ? (
        <FemaleAvatarIcon className={size === 'sm' ? "w-3 h-3 text-pink-600 shrink-0" : "w-3.5 h-3.5 text-pink-600 shrink-0"} />
      ) : (
        <MaleAvatarIcon className={size === 'sm' ? "w-3 h-3 text-blue-600 shrink-0" : "w-3.5 h-3.5 text-blue-600 shrink-0"} />
      )}
      <span>{gender}</span>
    </span>
  );
}
