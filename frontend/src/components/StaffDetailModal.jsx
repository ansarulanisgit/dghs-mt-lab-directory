import React from 'react';
import { X, User, Building2, MapPin, Phone, Calendar, ExternalLink, AlertCircle, CheckCircle2, Ban, Award, Layers, Stethoscope, Briefcase, FileText } from 'lucide-react';
import { GenderBadge } from './GenderIcon';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export default function StaffDetailModal({ staff, onClose, canViewPhone = true, canViewPrl = true, canViewHris = true }) {
  if (!staff) return null;

  const isAbolished = staff.status === 'Abolished' || staff.status_name === 'Abolished' || staff.name === '[Abolished Post]';
  const isVacant = !isAbolished && (staff.status === 'Vacant' || staff.isVacant || !staff.name || staff.name === '[Vacant Post]');
  const isFilled = !isAbolished && !isVacant;

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
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 text-white flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 border-b border-emerald-700/40">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              isAbolished
                ? 'bg-slate-500/30 text-slate-300 border border-slate-400/30'
                : isVacant 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
            }`}>
              {isAbolished ? <Ban className="w-6 h-6" /> : isVacant ? <AlertCircle className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {isAbolished ? 'Abolished Post' : isVacant ? 'Vacant Post' : decodeHtmlEntities(staff.name || 'Unnamed Personnel')}
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                {decodeHtmlEntities(staff.designation || 'Medical Technologist')}
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
          {/* Post ID & Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Sanctioned Post ID</span>
              <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">#{staff.post_id || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Post Status</span>
              {isAbolished ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-full mt-0.5 border border-slate-300 dark:border-slate-600">
                  <Ban className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  Abolished
                </span>
              ) : isVacant ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full mt-0.5 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Vacant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full mt-0.5 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Filled / Posted
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Pay Scale</span>
              <span className="inline-flex items-center gap-1 font-bold text-teal-900 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 mt-0.5">
                <Award className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                {staff.pay_scale || 'Grade 10'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Post Type</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{staff.sanctioned_post_type || 'Revenue Permanent'}</span>
            </div>
          </div>

          {/* Classification Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Designation Classification</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Designation Group</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{staff.designation_group || 'Medical Technologist'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Major Discipline</span>
                <span className="font-bold text-teal-700 dark:text-teal-400 text-xs sm:text-sm">{staff.major_discipline || 'General'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{staff.department || 'Health & Family Welfare'}</span>
              </div>
            </div>
          </div>

          {/* Personnel Details (if Filled) */}
          {isFilled && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Personnel Profile</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">HRIS ID:</span>
                  {canViewHris ? (
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{staff.hris_id || 'N/A'}</span>
                  ) : (
                    <span className="font-mono font-semibold text-slate-400 dark:text-slate-500 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 inline-block mt-0.5" title="HRIS ID access restricted">
                      •••••••• (Restricted)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block mb-1">Gender:</span>
                  {staff.gender && staff.gender !== 'N/A' ? (
                    <GenderBadge gender={staff.gender} size="default" />
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">N/A</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">Date of Birth (DOB):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatFullDate(staff.dob)}</span>
                </div>
                {canViewPrl && staff.prl_date && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">PRL Date (DOB + 59y):</span>
                    <span className="font-extrabold text-rose-950 dark:text-rose-200 text-sm bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 inline-block mt-0.5">
                      {formatFullDate(staff.prl_date)}
                    </span>
                  </div>
                )}
                {staff.national_id && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">National ID (NID):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{staff.national_id}</span>
                  </div>
                )}
                {(staff.contact_no || staff.contact_info) && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Contact Number:</span>
                    {canViewPhone ? (
                      <a
                        href={`tel:${(staff.contact_no || staff.contact_info).split(',')[0]}`}
                        className="font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline flex items-center gap-1.5 mt-0.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {staff.contact_no || staff.contact_info}
                      </a>
                    ) : (
                      <span className="font-mono text-slate-400 dark:text-slate-500 text-xs font-semibold flex items-center gap-1.5 mt-0.5" title="Phone number restricted">
                        <span>•••••••••• (Restricted)</span>
                      </span>
                    )}
                  </div>
                )}
                {staff.additional_roles && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Additional Roles / Deputations:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">{staff.additional_roles}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Facility & Geographic Location */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Facility & Location Details</span>
            </h4>
            <div className="space-y-2.5">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-xs block">Current Institute / Posting Place:</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{decodeHtmlEntities(staff.facility || staff.current_institute || 'DGHS Facility')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Division</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{staff.division || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">District</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{staff.district || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Upazila / Area</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{staff.upazila || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {staff.post_id ? (
            <a
              href={`https://hrm.dghs.gov.bd/sanctioned-posts/${staff.post_id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1.5"
            >
              <span>View on HRM Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}