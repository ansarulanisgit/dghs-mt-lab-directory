import React from 'react';
import { X, ShieldAlert, Lock } from 'lucide-react';

export default function PermissionDeniedModal({ isOpen, onClose, featureName = 'this feature' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sad Emoji & Lock Illustration */}
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-3xl flex items-center justify-center mx-auto shadow-inner">
          😢
        </div>

        {/* Header & Notification Message */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold text-slate-900">
            We're Sorry.
          </h3>
          <p className="text-xs text-rose-700 font-semibold bg-rose-50/80 px-3 py-1.5 rounded-xl border border-rose-200/70 inline-block">
            You don't have permission to access this feature.
          </p>
        </div>

        {/* Clarifying Information */}
        <p className="text-xs text-slate-500 leading-relaxed">
          Access to <strong>{featureName}</strong> has been restricted for your account. Please contact an Administrator to grant permission.
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
