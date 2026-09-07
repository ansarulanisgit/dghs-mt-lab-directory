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

        {/* Circular Static User Lock Icon with Generous Spacing */}
        <div className="pt-3 pb-1">
          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-rose-50 border-2 border-rose-200/90 shadow-sm flex items-center justify-center mx-auto relative">
            <User className="w-11 h-11 sm:w-12 sm:h-12 text-rose-600 stroke-[2.2]" />
            {/* Corner Lock Badge */}
            <div className="absolute bottom-0.5 right-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
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
