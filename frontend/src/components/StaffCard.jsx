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
        ? 'bg-slate-100/60 border-slate-300 hover:border-slate-400 opacity-90'
        : isVacant 
        ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-400' 
        : 'bg-white border-slate-200 hover:border-emerald-300'
    }`}>
      {/* Top Section */}
      <div className="p-4 sm:p-5 pb-3">
        {/* Top Header: Name & Designation on Left | Stacked Status (Top) & Gender (Below) on Right */}
        <div className="flex items-start justify-between gap-2.5">
          {/* Name & Designation */}
          <div className="min-w-0 flex-1">
            <h3 className={`text-base sm:text-lg font-extrabold tracking-tight line-clamp-1 ${
              isAbolished ? 'text-slate-600 line-through' : isVacant ? 'text-amber-950 italic' : 'text-slate-900'
            }`} title={decodeHtmlEntities(staff.name)}>
              {isAbolished ? 'Abolished Post' : isVacant ? 'Vacant Post' : decodeHtmlEntities(staff.name || 'Unnamed Personnel')}
            </h3>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5 line-clamp-1">
              {decodeHtmlEntities(staff.designation || 'Medical Technologist')}
            </p>
          </div>

          {/* Top Right: Vertically Stacked Badges (Status on top, Gender below) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Top Badge: Post Status (Filled / Vacant / Abolished) */}
            {isAbolished ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                <Ban className="w-2.5 h-2.5 text-slate-600" />
                Abolished
              </span>
            ) : isVacant ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                Vacant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Filled
              </span>
            )}

            {/* Below Badge: Meaningful Gender Avatar (Only for Filled posts with actual personnel) */}
            {isFilled && <GenderBadge gender={staff.gender} size="sm" />}
          </div>
        </div>

        {/* Institute, Address, Phone Number & HRIS ID */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
          {/* Institute */}
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium" title={decodeHtmlEntities(staff.facility || staff.current_institute)}>
              {decodeHtmlEntities(staff.facility || staff.current_institute || 'DGHS Facility')}
            </span>
          </div>

          {/* Address / Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 text-slate-500 font-medium">
              {[staff.upazila, staff.district, staff.division].filter(Boolean).map(decodeHtmlEntities).join(', ') || 'Bangladesh'}
            </span>
          </div>

          {/* Phone Number (Granular Permission Controlled) */}
          {isFilled && (staff.contact_no || staff.contact_info) && (
            <div className="flex items-center gap-2 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {canViewPhone ? (
                <a
                  href={`tel:${(staff.contact_no || staff.contact_info).split(',')[0]}`}
                  className="font-mono text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(staff.contact_no || staff.contact_info).split(',')[0]}
                </a>
              ) : (
                <span className="font-mono text-xs text-slate-400 font-semibold flex items-center gap-1" title="Phone number restricted">
                  <span>••••••••••</span>
                </span>
              )}
            </div>
          )}

          {/* HRIS ID (after phone number with User icon) */}
          {isFilled && staff.hris_id && staff.hris_id !== 'VACANT' && staff.hris_id !== 'ABOLISHED' && (
            <div className="flex items-center gap-2 pt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 font-medium">
                HRIS: {canViewHris ? (
                  <strong className="font-mono font-bold text-slate-800">{staff.hris_id}</strong>
                ) : (
                  <span className="font-mono text-slate-400 font-semibold" title="HRIS ID access restricted">
                    ••••••••
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: PRL Date on Left, Light View Details Button on Right in Same Row */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
        {/* Left: Prominent PRL Date (13px font, Light Red Shade Badge) */}
        {isFilled && staff.prl_date ? (
          canViewPrl ? (
            <div className="inline-flex items-center gap-1.5 text-rose-950 font-extrabold text-[13px] bg-rose-50/90 px-2.5 py-1 rounded-xl border border-rose-200/90 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>PRL: {formatPRL(staff.prl_date)}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-slate-500 font-semibold text-xs bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200" title="PRL date restricted">
              <span>PRL: Restricted</span>
            </div>
          )
        ) : (
          <span className="text-xs font-semibold text-slate-400 italic">
            {isAbolished ? 'Post Abolished' : isVacant ? 'Position Vacant' : 'No PRL'}
          </span>
        )}

        {/* Right: Light View Details Button with bg color */}
        <button
          onClick={() => onSelect(staff)}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
            isAbolished
              ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
              : isVacant
              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 hover:text-emerald-950 border border-emerald-200/90'
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