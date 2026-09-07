import React from 'react';
import { X, Lock, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose, featureName = 'this feature' }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-sm w-full p-[1px] bg-gradient-to-b from-amber-400/40 via-emerald-500/20 to-slate-200 rounded-[32px] shadow-2xl shadow-slate-950/40 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white/95 backdrop-blur-2xl rounded-[31px] p-6 sm:p-8 text-center space-y-5 overflow-hidden">
          {/* Ambient Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-gradient-to-b from-amber-200/40 via-emerald-100/30 to-transparent blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Premium Animated Security Lock Centerpiece */}
          <div className="relative pt-2">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Pulsing Outer Rings */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-teal-500/20 animate-ping opacity-40 [animation-duration:3s]" />
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-amber-400/30 via-emerald-400/30 to-teal-400/30 blur-md animate-pulse" />

              {/* Main Badge Card with 3D Gloss Sheen */}
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 flex items-center justify-center shadow-xl shadow-slate-950/30 transform transition-transform hover:scale-105 duration-300">
                {/* Internal Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                
                {/* Animated Gold/Amber Padlock SVG */}
                <div className="relative flex items-center justify-center animate-bounce [animation-duration:2.5s]">
                  <div className="relative p-3 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-md shadow-amber-500/40">
                    <Lock className="w-6 h-6 stroke-[2.4]" />
                  </div>
                </div>

                {/* Floating Keyhole Sparkle Accent */}
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white text-white flex items-center justify-center shadow-md animate-pulse">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Typography & Title */}
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Access Restricted
            </h3>
            
            {/* Restricted Feature Tag */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200/90 text-slate-700 text-xs font-bold shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Permission required for <strong className="text-slate-900 font-extrabold">{featureName}</strong></span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-600/35 transition-all duration-200 cursor-pointer transform active:scale-[0.98]"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
