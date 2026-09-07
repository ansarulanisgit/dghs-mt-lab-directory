import React from 'react';
import { X, User, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 sm:p-9 text-center border border-slate-200/90 animate-in zoom-in-95 duration-200 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Circular Light Yellow Lock Icon with Glowing Effect */}
        <div className="pt-3 pb-1">
          <div className="relative w-22 h-22 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
            {/* Soft Glowing Ambient Halo */}
            <div className="absolute inset-0 rounded-full bg-amber-400/35 blur-lg animate-pulse" />
            <div className="absolute -inset-1 rounded-full bg-yellow-300/30 blur-md" />

            {/* Light Yellow Circular Badge */}
            <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/90 border-2 border-amber-200/90 shadow-lg shadow-amber-500/25 flex items-center justify-center text-rose-600">
              <Lock className="w-10 h-10 sm:w-11 sm:h-11 text-rose-600 stroke-[2.3] drop-shadow-xs" />
            </div>
          </div>
        </div>

        {/* Heading & Subtitle Block with Comfortable Spacing */}
        <div className="space-y-3 px-2">
          <h3 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight leading-snug">
            Access Restricted
          </h3>
          <p className="text-sm sm:text-base text-slate-900 font-semibold leading-relaxed max-w-xs mx-auto">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button with Top Padding */}
        <div className="pt-3 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
