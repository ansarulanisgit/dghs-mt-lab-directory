import React from 'react';
import { X, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-[22px] sm:p-[30px] text-center border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4 sm:space-y-5 overflow-hidden"
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

        {/* Circular Light Yellow Lock Icon with Light Yellow Border & Soft Animated Yellow Glow */}
        <div className="pt-1.5 flex justify-center items-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            {/* Soft Subtle Animated Light Yellow Glow Halo */}
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-amber-300/40 via-yellow-300/50 to-amber-200/40 animate-soft-yellow-glow pointer-events-none" />

            {/* Light Yellow Circular Badge with Light Yellow Border */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/90 border-2 border-amber-300 shadow-md shadow-amber-400/20 flex items-center justify-center text-rose-600">
              <Lock className="w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] text-rose-600 stroke-[2.3] drop-shadow-xs" />
            </div>
          </div>
        </div>

        {/* Heading & Subtitle Block */}
        <div className="space-y-1.5 px-1">
          <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-snug">
            Access Restricted
          </h3>
          <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed max-w-xs mx-auto">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-1.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 sm:py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

