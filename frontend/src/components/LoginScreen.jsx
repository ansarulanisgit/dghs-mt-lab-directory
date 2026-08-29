import React, { useState, useEffect } from 'react';
import { loginUser, getLockoutState, MAX_LOGIN_ATTEMPTS } from '../lib/authStore';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, ShieldAlert, Timer } from 'lucide-react';

function formatLockoutCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function LoginScreen({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(getLockoutState());

  // Live countdown timer for lockout duration
  useEffect(() => {
    function checkLockout() {
      const state = getLockoutState();
      setLockoutInfo(state);
    }
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const currentLockout = getLockoutState();
    if (currentLockout.isLocked) {
      setError(`Device blocked. Please try again in ${formatLockoutCountdown(currentLockout.remainingSeconds)}.`);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(identifier, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Invalid credentials.');
        setLockoutInfo(getLockoutState());
        setIsLoading(false);
      }
    }, 300);
  };

  const isLocked = lockoutInfo.isLocked;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-slate-100 overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Decorative Blur Orbs (Clipped inside fixed container) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200 flex flex-col justify-between my-auto">
        {/* Header Branding */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center justify-center w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 mb-2.5 sm:mb-3">
            <ShieldCheck className="w-7 h-7 sm:w-9 sm:h-9" />
          </div>
          <h1 className="text-xl sm:text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            DGHS MT Lab Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Sign In to See the Directory
          </p>
        </div>

        {/* 6-Hour Security Lockout Alert Card */}
        {isLocked ? (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 text-xs shadow-xl shadow-rose-950/40 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/25 text-rose-300 shrink-0 border border-rose-500/40 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
                  <span>Device Temporarily Blocked</span>
                </h4>
                <p className="text-rose-300/90 mt-1 leading-relaxed text-[11px] sm:text-xs">
                  This device reached the maximum <strong>{MAX_LOGIN_ATTEMPTS} failed attempts</strong>. Login access is locked for <strong>6 hours</strong> for security.
                </p>
                {/* Live Countdown Badge */}
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-100 font-mono font-extrabold text-xs shadow-xs">
                  <Timer className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Unlocks In: {formatLockoutCountdown(lockoutInfo.remainingSeconds)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Regular Error Alert with Remaining Attempts Warning */
          error && (
            <div className="mb-4 sm:mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Email or Username
              </label>
              {!isLocked && lockoutInfo.failedAttempts > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  Attempt {lockoutInfo.failedAttempts}/{MAX_LOGIN_ATTEMPTS}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isLocked}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-800/80 border rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 transition-all ${
                  isLocked 
                    ? 'border-slate-800 bg-slate-900/60 opacity-60 cursor-not-allowed text-slate-400' 
                    : 'border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-800/80 border rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 transition-all ${
                  isLocked 
                    ? 'border-slate-800 bg-slate-900/60 opacity-60 cursor-not-allowed text-slate-400' 
                    : 'border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isLocked}
            className={`w-full mt-2 sm:mt-3 py-3 sm:py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              isLocked
                ? 'bg-rose-600/30 border border-rose-500/40 text-rose-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 disabled:opacity-50 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : isLocked ? (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Device Blocked ({formatLockoutCountdown(lockoutInfo.remainingSeconds)})</span>
              </div>
            ) : (
              <>
                <span>Sign In to Directory</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Credit */}
        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-800/60 text-center">
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
            Developed by <span className="text-emerald-400 font-semibold">Ansarul Anis</span>
          </p>
        </div>
      </div>
    </div>
  );
}