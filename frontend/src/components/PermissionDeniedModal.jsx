import React from 'react';
import { X, Lock, ShieldAlert, Check } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose, featureName = 'this feature' }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-7 text-center border border-slate-200/80 animate-in zoom-in-95 duration-200 space-y-5 overflow-hidden"
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

        {/* Animated Icon with Glowing Rings */}
        <div className="pt-2">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            {/* Pulsing Animated Aura Ring */}
            <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping opacity-60 [animation-duration:2.8s]" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-400/25 via-amber-300/20 to-rose-500/25 blur-sm animate-pulse" />

            {/* Floating Main Badge with Animated Emoji */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-rose-50 via-white to-rose-100/90 border-2 border-rose-200 flex items-center justify-center shadow-xl shadow-rose-950/10">
              <span className="text-4xl select-none inline-block animate-bounce [animation-duration:2s]">
                🥺
              </span>
              {/* Floating Mini Lock Badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow-md animate-pulse">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Heading & Badge */}
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            We're Sorry.
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>You don't have permission to access {featureName}.</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer transform active:scale-98"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
