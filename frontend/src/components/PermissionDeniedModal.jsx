import React from 'react';
import { X, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[320px] sm:max-w-sm px-6 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-7 text-center border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col items-center gap-4 sm:gap-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Circular Lock Icon with Yellow Border & Animated Yellow Glow */}
        <div className="mt-1 flex justify-center items-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            {/* Animated Yellow Glow Halo */}
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-yellow-400/65 via-amber-400/70 to-yellow-300/65 animate-yellow-glow pointer-events-none" />

            {/* White Circular Badge with Yellow Border */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-amber-400 shadow-md shadow-amber-400/25 flex items-center justify-center text-rose-600">
              <Lock className="w-7 h-7 sm:w-9 sm:h-9 text-rose-600 stroke-[2.4] drop-shadow-xs" />
            </div>
          </div>
        </div>

        {/* Heading & Subtitle Block */}
        <div className="space-y-1 sm:space-y-1.5 px-1">
          <h3 className="text-lg sm:text-xl font-black text-rose-600 tracking-tight leading-snug">
            Access Restricted
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-[240px] mx-auto">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button */}
        <div className="w-full pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

