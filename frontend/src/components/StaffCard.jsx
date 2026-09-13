import React, { memo } from 'react';
import { Building2, MapPin, Phone, Calendar, ArrowRight, User, AlertCircle, CheckCircle2, Ban } from 'lucide-react';
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

function StaffCard({ staff, onSelect, canViewPhone = true, canViewPrl = true, canViewHris = true }) {
  const isAbolished = staff.status === 'Abolished' || staff.status_name === 'Abolished' || staff.name === '[Abolished Post]';
  const isVacant = !isAbolished && (staff.status === 'Vacant' || staff.isVacant || !staff.name || staff.name === '[Vacant Post]');
  const isFilled = !isAbolished && !isVacant;

  const formatPRL = (prl) => {
    if (!prl) return 'N/A';
    try {
      const date = new Date(prl);
      if (isNaN(date.getTime())) return prl;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return prl;
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between overflow-hidden ${
      isAbolished
        ? 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 opacity-90'
        : isVacant 
        ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600'
    }`}>
      {/* Top Section */}
      <div className="p-4 sm:p-5 pb-3">
        {/* Top Header: Name & Designation on Left | Stacked Status (Top) & Gender (Below) on Right */}
        <div className="flex items-start justify-between gap-2.5">
          {/* Name & Designation */}
          <div className="min-w-0 flex-1">
            <h3 className={`text-base sm:text-lg font-extrabold tracking-tight line-clamp-1 ${
              isAbolished ? 'text-slate-600 dark:text-slate-400 line-through' : isVacant ? 'text-amber-950 dark:text-amber-300 italic' : 'text-slate-900 dark:text-white'
            }`} title={decodeHtmlEntities(staff.name)}>
              {isAbolished ? 'Abolished Post' : isVacant ? 'Vacant Post' : decodeHtmlEntities(staff.name || 'Unnamed Personnel')}
            </h3>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 line-clamp-1">
              {decodeHtmlEntities(staff.designation || 'Medical Technologist')}
            </p>
          </div>

          {/* Top Right: Vertically Stacked Badges (Status on top, Gender below) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Top Badge: Post Status (Filled / Vacant / Abolished) */}
            {isAbolished ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                <Ban className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
                Abolished
              </span>
            ) : isVacant ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                Vacant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                Filled
              </span>
            )}

            {/* Below Badge: Meaningful Gender Avatar (Only for Filled posts with actual personnel) */}
            {isFilled && <GenderBadge gender={staff.gender} size="sm" />}
          </div>
        </div>

        {/* Institute, Address, Phone Number & HRIS ID */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          {/* Institute */}
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium text-slate-700 dark:text-slate-300" title={decodeHtmlEntities(staff.facility || staff.current_institute)}>
              {decodeHtmlEntities(staff.facility || staff.current_institute || 'DGHS Facility')}
            </span>
          </div>

          {/* Address / Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <span className="line-clamp-1 text-slate-500 dark:text-slate-400 font-medium">
              {[staff.upazila, staff.district, staff.division].filter(Boolean).map(decodeHtmlEntities).join(', ') || 'Bangladesh'}
            </span>
          </div>

          {/* Phone Number (Granular Permission Controlled) */}
          {isFilled && (staff.contact_no || staff.contact_info) && (
            <div className="flex items-center gap-2 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {canViewPhone ? (
                <a
                  href={`tel:${(staff.contact_no || staff.contact_info).split(',')[0]}`}
                  className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(staff.contact_no || staff.contact_info).split(',')[0]}
                </a>
              ) : (
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1" title="Phone number restricted">
                  <span>••••••••••</span>
                </span>
              )}
            </div>
          )}

          {/* HRIS ID (after phone number with User icon) */}
          {isFilled && staff.hris_id && staff.hris_id !== 'VACANT' && staff.hris_id !== 'ABOLISHED' && (
            <div className="flex items-center gap-2 pt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                HRIS: {canViewHris ? (
                  <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">{staff.hris_id}</strong>
                ) : (
                  <span className="font-mono text-slate-400 dark:text-slate-500 font-semibold" title="HRIS ID access restricted">
                    ••••••••
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: PRL Date on Left, Light View Details Button on Right in Same Row */}
      <div className={`p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2 ${
        canViewPrl ? 'justify-between' : 'justify-end'
      }`}>
        {/* Left: Prominent PRL Date (Completely hidden if user doesn't have permission for PRL) */}
        {canViewPrl && (
          isFilled && staff.prl_date ? (
            <div className="inline-flex items-center gap-1.5 text-rose-950 dark:text-rose-200 font-extrabold text-[13px] bg-rose-50/90 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200/90 dark:border-rose-800/80 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>PRL: {formatPRL(staff.prl_date)}</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">
              {isAbolished ? 'Post Abolished' : isVacant ? 'Position Vacant' : 'No PRL'}
            </span>
          )
        )}

        {/* Right: Light View Details Button with bg color */}
        <button
          onClick={() => onSelect(staff)}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
            isAbolished
              ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              : isVacant
              ? 'bg-amber-100/90 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 border border-emerald-200/90 dark:border-emerald-800'
          }`}
        >
          <span>{isAbolished ? 'View Post' : isVacant ? 'View Details' : 'View Full Details'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default memo(StaffCard);