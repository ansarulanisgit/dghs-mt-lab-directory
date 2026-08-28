import React from 'react';
import { X, User, Building2, MapPin, Phone, Calendar, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StaffDetailModal({ staff, onClose }) {
  if (!staff) return null;

  const isVacant = staff.status === 'Vacant' || staff.isVacant || !staff.name || staff.name === '[Vacant Post]';

  const formatFullDate = (d) => {
    if (!d) return 'N/A';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Greenish Emerald Theme) */}
        <div className="px-6 py-5 text-white flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 border-b border-emerald-700/40">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              isVacant 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
            }`}>
              {isVacant ? <AlertCircle className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {isVacant ? 'Vacant Sanctioned Post' : staff.name}
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                {staff.designation || 'Medical Technologist (Lab)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Post & Status Header */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Sanctioned Post ID</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">#{staff.post_id || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Post Status</span>
              {isVacant ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full mt-0.5 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Vacant (Unassigned)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-0.5 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Filled / Posted
                </span>
              )}
            </div>
          </div>

          {/* Personnel Details (if Filled) */}
          {!isVacant && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">
                Personnel Profile
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 text-xs block">HRIS ID:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{staff.hris_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Gender:</span>
                  <span className="font-semibold text-slate-800">{staff.gender || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Date of Birth (DOB):</span>
                  <span className="font-semibold text-slate-800">{formatFullDate(staff.dob)}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">PRL Date (DOB + 59y):</span>
                  <span className="font-extrabold text-emerald-800 text-sm bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 inline-block mt-0.5">
                    {formatFullDate(staff.prl_date)}
                  </span>
                </div>
                {staff.contact_info && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 text-xs block">Contact Number:</span>
                    <a
                      href={`tel:${staff.contact_info.split(',')[0]}`}
                      className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {staff.contact_info}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Facility & Geographic Location */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">
              Facility & Location Details
            </h4>
            <div className="space-y-2.5">
              <div>
                <span className="text-slate-500 text-xs block">Current Institute / Posting Place:</span>
                <span className="font-bold text-slate-900 block mt-0.5">{staff.current_institute || 'DGHS Facility'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Division</span>
                  <span className="font-bold text-slate-800">{staff.division || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">District</span>
                  <span className="font-bold text-slate-800">{staff.district || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Upazila</span>
                  <span className="font-bold text-slate-800">{staff.upazila || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          {staff.post_id ? (
            <a
              href={`https://hrm.dghs.gov.bd/sanctioned-posts/${staff.post_id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5"
            >
              <span>View on HRM Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}