import React from 'react';
import { X, User, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-7 text-center border border-slate-200/90 animate-in zoom-in-95 duration-200 space-y-4.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Circular Static User Lock Icon */}
        <div className="pt-2">
          <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200/90 shadow-sm flex items-center justify-center mx-auto relative">
            <User className="w-10 h-10 text-rose-600 stroke-[2.2]" />
            {/* Corner Lock Badge */}
            <div className="absolute bottom-0 right-0 w-6.5 h-6.5 rounded-full bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Red Title */}
        <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
          Access Restricted
        </h3>

        {/* Subtitle Text (Bigger, black text without background) */}
        <div className="px-1">
          <p className="text-sm sm:text-base text-slate-900 font-semibold leading-relaxed">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
