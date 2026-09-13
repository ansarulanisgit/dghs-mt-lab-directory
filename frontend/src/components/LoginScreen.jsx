import React, { useState, useEffect } from 'react';
import { loginUser, getLockoutState, MAX_LOGIN_ATTEMPTS } from '../lib/authStore';
import { getSystemConfig } from '../lib/configStore';
import { getStoredTheme, toggleTheme } from '../lib/themeStore';
import { Lock, Mail, Eye, EyeOff, User, Users, ShieldCheck, ArrowRight, AlertCircle, ShieldAlert, Timer, Sun, Moon } from 'lucide-react';

function formatLockoutCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function renderLinkedCredit(text) {
  const content = text || 'Developed by Ansarul Anis';
  const target = 'Ansarul Anis';
  if (content.toLowerCase().includes(target.toLowerCase())) {
    const regex = new RegExp(`(${target})`, 'i');
    const parts = content.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === target.toLowerCase() ? (
        <a
          key={i}
          href="https://www.facebook.com/ansarulanis"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold hover:underline transition-colors cursor-pointer inline-flex items-center"
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }
  return content;
}

export default function LoginScreen({ onLoginSuccess }) {
  const [config, setConfig] = useState(getSystemConfig());
  const [theme, setTheme] = useState(getStoredTheme());
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(getLockoutState());

  // Listen for config updates dynamically
  useEffect(() => {
    const handleConfigUpdate = (e) => {
      setConfig(e.detail || getSystemConfig());
    };
    window.addEventListener('dghs_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('dghs_config_updated', handleConfigUpdate);
  }, []);

  // Listen for theme updates
  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail || getStoredTheme());
    };
    window.addEventListener('dghs_theme_changed', handleThemeChange);
    return () => window.removeEventListener('dghs_theme_changed', handleThemeChange);
  }, []);

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
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden relative selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      {/* Decorative Blur Orbs (Clipped inside fixed container) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-teal-500/15 dark:bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top-Right Theme Toggle Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setTheme(toggleTheme())}
          className="p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:text-slate-950 dark:hover:text-amber-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer shadow-md flex items-center justify-center backdrop-blur-md"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-in spin-in-90 duration-200" />
          ) : (
            <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 animate-in spin-in-90 duration-200" />
          )}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl shadow-slate-300/40 dark:shadow-black/70 animate-in zoom-in-95 duration-200 flex flex-col justify-between my-auto transition-colors duration-300">
        {/* Header Branding */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center justify-center p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 mb-3.5 sm:mb-4">
            <Users className="w-8.5 h-8.5 sm:w-9 sm:h-9" />
          </div>
          <h1 className="text-[18px] sm:text-[22px] md:text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            {config.loginTitle || config.appTitle || 'DGHS Employee Directory'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {config.loginSubtitle || 'Sign In to See the Directory'}
          </p>
        </div>

        {/* 6-Hour Security Lockout Alert Card */}
        {isLocked ? (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs shadow-xl shadow-rose-950/20 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/25 text-rose-700 dark:text-rose-300 shrink-0 border border-rose-500/40 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-rose-950 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
                  <span>Device Temporarily Blocked</span>
                </h4>
                <p className="text-rose-800 dark:text-rose-300/90 mt-1 leading-relaxed text-[11px] sm:text-xs">
                  This device reached the maximum <strong>{MAX_LOGIN_ATTEMPTS} failed attempts</strong>. Login access is locked for <strong>6 hours</strong> for security.
                </p>
                {/* Live Countdown Badge */}
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 font-mono font-extrabold text-xs shadow-xs">
                  <Timer className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
                  <span>Unlocks In: {formatLockoutCountdown(lockoutInfo.remainingSeconds)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Regular Error Alert with Remaining Attempts Warning */
          error && (
            <div className="mb-4 sm:mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email or Username
              </label>
              {!isLocked && lockoutInfo.failedAttempts > 0 && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 px-2 py-0.5 rounded-md">
                  Attempt {lockoutInfo.failedAttempts}/{MAX_LOGIN_ATTEMPTS}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isLocked}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${
                  isLocked 
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 opacity-60 cursor-not-allowed text-slate-400' 
                    : 'border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${
                  isLocked 
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 opacity-60 cursor-not-allowed text-slate-400' 
                    : 'border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 cursor-pointer"
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
                ? 'bg-rose-600/30 border border-rose-500/40 text-rose-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 disabled:opacity-50 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : isLocked ? (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
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
        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200/80 dark:border-emerald-900/50 text-center">
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            {renderLinkedCredit(config.loginFooterText || config.footerText || 'Developed by Ansarul Anis')}
          </p>
        </div>
      </div>
    </div>
  );
}