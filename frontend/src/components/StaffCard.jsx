import React from 'react';
import { Building2, MapPin, Phone, Calendar, ArrowRight, User, AlertCircle, CheckCircle2 } from 'lucide-react';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export default function StaffCard({ staff, onSelect }) {
  const isVacant = staff.status === 'Vacant' || staff.isVacant || !staff.name || staff.name === '[Vacant Post]';

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
      isVacant 
        ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-400' 
        : 'bg-white border-slate-200 hover:border-emerald-300'
    }`}>
      {/* Top Section */}
      <div className="p-4 sm:p-5 pb-3">
        {/* Top Header: Post ID & Status / Gender Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Post ID Badge */}
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80">
            # Post ID: {staff.post_id || 'N/A'}
          </span>

          {/* Top Right: Status Badge & Gender */}
          <div className="flex items-center gap-1.5">
            {isVacant ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                Vacant
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Filled
                </span>
                {staff.gender && staff.gender !== 'N/A' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    staff.gender === 'Female' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <User className="w-2.5 h-2.5" />
                    {staff.gender}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Name & Designation */}
        <div>
          <h3 className={`text-base sm:text-lg font-extrabold tracking-tight line-clamp-1 ${
            isVacant ? 'text-amber-950 italic' : 'text-slate-900'
          }`}>
            {isVacant ? 'Vacant Sanctioned Post' : decodeHtmlEntities(staff.name || 'Unnamed Personnel')}
          </h3>
          <p className="text-xs font-semibold text-emerald-700 mt-0.5 line-clamp-1">
            {decodeHtmlEntities(staff.designation || 'Medical Technologist (Lab)')}
          </p>
        </div>

        {/* Institute, Address, Phone Number & HRIS ID */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
          {/* Institute */}
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium" title={decodeHtmlEntities(staff.current_institute)}>
              {decodeHtmlEntities(staff.current_institute || 'DGHS Facility')}
            </span>
          </div>

          {/* Address / Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 text-slate-500 font-medium">
              {[staff.upazila, staff.district, staff.division].filter(Boolean).map(decodeHtmlEntities).join(', ') || 'Bangladesh'}
            </span>
          </div>

          {/* Phone Number */}
          {!isVacant && staff.contact_info && (
            <div className="flex items-center gap-2 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <a
                href={`tel:${staff.contact_info.split(',')[0]}`}
                className="font-mono text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {staff.contact_info.split(',')[0]}
              </a>
            </div>
          )}

          {/* HRIS ID (after phone number with User icon) */}
          {!isVacant && staff.hris_id && (
            <div className="flex items-center gap-2 pt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 font-medium">
                HRIS: <strong className="font-mono font-bold text-slate-800">{staff.hris_id}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: PRL Date on Left, Light View Details Button on Right in Same Row */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
        {/* Left: Prominent PRL Date (14px font, +2px, Distinct High-Contrast Theme Style) */}
        {!isVacant && staff.prl_date ? (
          <div className="inline-flex items-center gap-1.5 text-white font-extrabold text-[14px] bg-gradient-to-r from-emerald-800 to-teal-800 px-3 py-1.5 rounded-xl border border-emerald-600/70 shadow-xs">
            <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>PRL: {formatPRL(staff.prl_date)}</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-400 italic">
            {isVacant ? 'Position Vacant' : 'No PRL'}
          </span>
        )}

        {/* Right: Light View Details Button with bg color */}
        <button
          onClick={() => onSelect(staff)}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
            isVacant
              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 hover:text-emerald-950 border border-emerald-200/90'
          }`}
        >
          <span>{isVacant ? 'View Details' : 'View Full Details'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}