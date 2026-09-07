import React from 'react';
import { X, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-3.5 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-4.5 sm:p-6 text-center border border-slate-200 animate-in zoom-in-95 duration-200 space-y-3.5 sm:space-y-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Circular Yellow Lock Icon with Yellow Border & Animated Yellow Glow */}
        <div className="pt-0.5 flex justify-center items-center">
          <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] flex items-center justify-center">
            {/* Animated Yellow Glow Halo */}
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-yellow-400/50 via-amber-400/60 to-yellow-300/60 animate-yellow-glow pointer-events-none" />

            {/* White Circular Badge with Yellow Border & Animated Yellow Glow */}
            <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-full bg-white border-2.5 border-yellow-400 shadow-md shadow-yellow-500/20 flex items-center justify-center text-rose-600">
              <Lock className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] text-rose-600 stroke-[2.3] drop-shadow-xs" />
            </div>
          </div>
        </div>

        {/* Heading & Subtitle Block */}
        <div className="space-y-1 px-1">
          <h3 className="text-lg sm:text-xl font-black text-rose-600 tracking-tight leading-snug">
            Access Restricted
          </h3>
          <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed max-w-xs mx-auto">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

