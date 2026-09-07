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
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5 sm:space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Circular Light Yellow Lock Icon with Glowing Effect */}
        <div className="pt-2 flex justify-center items-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            {/* Soft Glowing Ambient Halo (Bounded strictly to the circle) */}
            <div className="absolute -inset-2.5 rounded-full bg-amber-400/30 blur-lg animate-pulse" />
            <div className="absolute -inset-1 rounded-full bg-yellow-300/40 blur-sm" />

            {/* Light Yellow Circular Badge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-200/90 shadow-md shadow-amber-500/20 flex items-center justify-center text-rose-600">
              <Lock className="w-9 h-9 sm:w-11 sm:h-11 text-rose-600 stroke-[2.4] drop-shadow-xs" />
            </div>
          </div>
        </div>

        {/* Heading & Subtitle Block */}
        <div className="space-y-2 px-1">
          <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-snug">
            Access Restricted
          </h3>
          <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed max-w-xs mx-auto">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button with Theme Green Border and Visible Glow Effect */}
        <div className="pt-2 relative">
          {/* Vibrant Emerald Ambient Glow Halo */}
          <div className="absolute -inset-1 rounded-2xl bg-emerald-500/40 blur-md animate-pulse" />

          <button
            type="button"
            onClick={onClose}
            className="relative w-full py-3 sm:py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl border-2 border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.55)] hover:shadow-[0_0_30px_rgba(16,185,129,0.8)] transition-all cursor-pointer transform active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

