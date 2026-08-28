import React from 'react';
import { Building2, MapPin, Phone, Calendar, ArrowRight, User, AlertCircle, CheckCircle2 } from 'lucide-react';

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
            {isVacant ? 'Vacant Sanctioned Post' : (staff.name || 'Unnamed Personnel')}
          </h3>
          <p className="text-xs font-semibold text-emerald-700 mt-0.5 line-clamp-1">
            {staff.designation || 'Medical Technologist (Lab)'}
          </p>
        </div>

        {/* Institute, Address & Phone Number */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
          {/* Institute */}
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium" title={staff.current_institute}>
              {staff.current_institute || 'DGHS Facility'}
            </span>
          </div>

          {/* Address / Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 text-slate-500 font-medium">
              {[staff.upazila, staff.district, staff.division].filter(Boolean).join(', ') || 'Bangladesh'}
            </span>
          </div>

          {/* Phone Number (after address) */}
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
        </div>
      </div>

      {/* Footer Info: HRIS & Green PRL Date */}
      <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          {/* Left: HRIS ID */}
          {!isVacant ? (
            <div className="text-slate-500 text-xs font-medium">
              HRIS: <strong className="font-mono font-bold text-slate-800">{staff.hris_id || 'N/A'}</strong>
            </div>
          ) : (
            <span className="text-[11px] text-amber-800 font-medium">Position Unoccupied</span>
          )}

          {/* Right: Green PRL Date (Green theme instead of red) */}
          {!isVacant && staff.prl_date ? (
            <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-sm tracking-tight bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>PRL: {formatPRL(staff.prl_date)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">No PRL</span>
          )}
        </div>

        <button
          onClick={() => onSelect(staff)}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            isVacant
              ? 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-900'
              : 'bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 shadow-2xs'
          }`}
        >
          <span>{isVacant ? 'View Post Details' : 'View Full Details'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}