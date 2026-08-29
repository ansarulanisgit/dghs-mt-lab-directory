import React, { useState, useEffect } from 'react';
import {
  X, Lock, Shield, Settings, Users, Server, Check,
  AlertCircle, Plus, Edit2, Trash2, RotateCcw, Save, KeyRound, Eye, EyeOff,
  RefreshCw, Zap, Clock, Database, Calendar, History, Archive, CheckCircle2
} from 'lucide-react';
import {
  getUsers, addUser, updateUser, deleteUser, verifyAdminPassword
} from '../lib/authStore';
import {
  getSystemConfig, saveSystemConfig, resetSystemConfig
} from '../lib/configStore';
import { calculateTimeRemaining } from '../lib/countdownUtil';
import {
  getBackups, saveBackupSnapshot, restoreBackupById, getActiveBackupOverride, clearBackupOverride
} from '../lib/backupStore';

export default function SettingsModal({ currentUser, onClose, onForceUpdate, dynamicStats, onManualSnapshot }) {
  // Password lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Active Tab: 'config' | 'users' | 'status'
  const [activeTab, setActiveTab] = useState('config');

  // Config State
  const [config, setConfig] = useState(getSystemConfig());
  const [configSavedNotice, setConfigSavedNotice] = useState('');

  // Backup & Restore State (Keep last 2 update data in store)
  const [backupsList, setBackupsList] = useState(getBackups());
  const [activeBackupOverride, setActiveBackupOverride] = useState(getActiveBackupOverride());
  const [restoringBackupId, setRestoringBackupId] = useState(null);

  // User Management State
  const [userList, setUserList] = useState(getUsers());
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'User' });
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Force Update & Countdown State
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateNotice, setUpdateNotice] = useState('');
  const [countdownText, setCountdownText] = useState('');

  // Auto-unlock for Admin
  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      setIsUnlocked(true);
    }
  }, [currentUser]);

  // Live Countdown based on configured interval days
  useEffect(() => {
    function updateCountdown() {
      const text = calculateTimeRemaining(config.scheduleIntervalDays || 7);
      setCountdownText(text);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [config.scheduleIntervalDays]);

  const handleUnlock = (e) => {
    e.preventDefault();
    setUnlockError('');
    if (verifyAdminPassword(adminPasswordInput)) {
      setIsUnlocked(true);
    } else {
      setUnlockError('Incorrect administrator password.');
    }
  };

  const handleSaveConfig = (e) => {
    if (e) e.preventDefault();
    saveSystemConfig(config);
    setConfigSavedNotice('Configuration saved successfully!');
    setTimeout(() => setConfigSavedNotice(''), 3000);
  };

  const handleIntervalChange = (days) => {
    const newDays = parseInt(days, 10) || 7;
    const updated = { ...config, scheduleIntervalDays: newDays };
    setConfig(updated);
    saveSystemConfig(updated);
    setUpdateNotice(`Automatic update schedule set to every ${newDays} ${newDays === 1 ? 'day' : 'days'}.`);
    setTimeout(() => setUpdateNotice(''), 3500);
  };

  const handleResetConfig = () => {
    if (window.confirm('Reset all scraper and portal settings to default values?')) {
      const def = resetSystemConfig();
      setConfig(def);
      setConfigSavedNotice('Reset to default configuration.');
      setTimeout(() => setConfigSavedNotice(''), 3000);
    }
  };

  const handlePostingUrlChange = (idx, value) => {
    const updated = [...config.postingUrls];
    updated[idx] = value;
    setConfig({ ...config, postingUrls: updated });
  };

  // Force Update Action
  const handleForceUpdateClick = async () => {
    setIsUpdating(true);
    setUpdateNotice('');
    try {
      if (onForceUpdate) {
        await onForceUpdate();
      }
      setUpdateNotice('Dataset and directory stats successfully updated & synchronized!');
      setTimeout(() => setUpdateNotice(''), 4000);
    } catch (err) {
      setUpdateNotice('Update error: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // User CRUD Handlers
  const openAddUser = () => {
    setEditingUserId(null);
    setUserForm({ name: '', email: '', password: '', role: 'User' });
    setUserFormError('');
    setUserFormSuccess('');
    setUserModalOpen(true);
  };

  // Listen for backup events
  useEffect(() => {
    const handleBackupUpdate = () => {
      setBackupsList(getBackups());
      setActiveBackupOverride(getActiveBackupOverride());
    };
    window.addEventListener('dghs_backups_updated', handleBackupUpdate);
    window.addEventListener('dghs_backup_restored', handleBackupUpdate);
    return () => {
      window.removeEventListener('dghs_backups_updated', handleBackupUpdate);
      window.removeEventListener('dghs_backup_restored', handleBackupUpdate);
    };
  }, []);

  const handleRestoreBackup = (backupId) => {
    try {
      setRestoringBackupId(backupId);
      const restored = restoreBackupById(backupId);
      setActiveBackupOverride(restored);
      setUpdateNotice(`Successfully restored "${restored.label}" (${restored.recordCount} records). Directory view is now displaying this version.`);
      setTimeout(() => setUpdateNotice(''), 4500);
    } catch (err) {
      alert('Failed to restore backup: ' + err.message);
    } finally {
      setRestoringBackupId(null);
    }
  };

  const handleClearOverride = () => {
    clearBackupOverride();
    setActiveBackupOverride(null);
    setUpdateNotice('Switched back to latest active dataset.');
    setTimeout(() => setUpdateNotice(''), 3500);
  };

  const handleCreateManualSnapshot = () => {
    if (onManualSnapshot) {
      onManualSnapshot();
      setBackupsList(getBackups());
      setUpdateNotice('Manual backup snapshot created and saved in store.');
      setTimeout(() => setUpdateNotice(''), 3500);
    }
  };

  const openEditUser = (user) => {
    setEditingUserId(user.id);
    setUserForm({ name: user.name, email: user.email, password: user.password, role: user.role });
    setUserFormError('');
    setUserFormSuccess('');
    setUserModalOpen(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    setUserFormError('');
    try {
      if (editingUserId) {
        updateUser(editingUserId, userForm);
        setUserFormSuccess('User updated successfully!');
      } else {
        addUser(userForm);
        setUserFormSuccess('New user added successfully!');
      }
      setUserList(getUsers());
      setTimeout(() => {
        setUserModalOpen(false);
        setUserFormSuccess('');
      }, 700);
    } catch (err) {
      setUserFormError(err.message);
    }
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) {
      try {
        deleteUser(user.id);
        setUserList(getUsers());
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spacious Header with Greenish Gradient */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-6 sm:px-8 py-5 sm:py-6 text-white flex items-center justify-between shrink-0 border-b border-emerald-700/40">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-md">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight leading-snug">
                System & Scraper Settings
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                Administrative Control Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Screen if not verified */}
        {!isUnlocked ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-5 border border-emerald-200/80 shadow-xs">
              <KeyRound className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Administrator Password Required</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
              Please enter the master administrator password to modify scraper credentials, endpoints, or manage users.
            </p>

            {unlockError && (
              <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 max-w-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="w-full max-w-sm mt-6 space-y-3.5">
              <input
                type="password"
                required
                placeholder="Enter password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-center font-medium placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Unlock Settings
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Tabs View */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                  activeTab === 'config'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Server className="w-4 h-4" />
                Scraper Configuration
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                  activeTab === 'users'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                User Management ({userList.length})
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                  activeTab === 'status'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Schedule & Status
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-5">
              {/* TAB 1: SCRAPER CONFIGURATION */}
              {activeTab === 'config' && (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  {configSavedNotice && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{configSavedNotice}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Portal Login URL
                      </label>
                      <input
                        type="url"
                        required
                        value={config.portalLoginUrl}
                        onChange={(e) => setConfig({ ...config, portalLoginUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Portal Username / Email
                      </label>
                      <input
                        type="text"
                        required
                        value={config.portalUsername}
                        onChange={(e) => setConfig({ ...config, portalUsername: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Portal Password
                      </label>
                      <input
                        type="text"
                        required
                        value={config.portalPassword}
                        onChange={(e) => setConfig({ ...config, portalPassword: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Header & Portal Branding Text Customization */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Header Title & Subtitle Customization</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Application Title / Main Heading
                        </label>
                        <input
                          type="text"
                          required
                          value={config.appTitle || ''}
                          onChange={(e) => setConfig({ ...config, appTitle: e.target.value })}
                          placeholder="DGHS MT-Lab Directory"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Application Subtitle / Sub-heading
                        </label>
                        <input
                          type="text"
                          required
                          value={config.appSubtitle || ''}
                          onChange={(e) => setConfig({ ...config, appSubtitle: e.target.value })}
                          placeholder="Central Directory of Medical Technologist (Lab)"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fallback Posting Profile URLs */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-2.5">
                      Fallback Posting Profile URLs (Tried in Sequence)
                    </label>
                    <div className="space-y-2">
                      {config.postingUrls.map((url, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs font-bold text-slate-400">
                            {idx + 1}.
                          </span>
                          <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => handlePostingUrlChange(idx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Defaults
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Configuration
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Manage registered accounts that can access this directory.
                    </p>
                    <button
                      onClick={openAddUser}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add User
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 hidden sm:table-cell">Password</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'Admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-400 hidden sm:table-cell">
                              ••••••••
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                onClick={() => openEditUser(u)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SCHEDULE, COUNTDOWN & FORCE UPDATE */}
              {activeTab === 'status' && (
                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Notice Alert */}
                  {updateNotice && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{updateNotice}</span>
                    </div>
                  )}

                  {/* Automated Schedule Card with Force Update Button & Live Countdown */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          Automated Scraping Schedule
                        </h4>
                        <p className="text-slate-600 text-xs mt-0.5">
                          The automated scraper runs on schedule via GitHub Actions:
                        </p>
                      </div>

                      {/* Force Update Button */}
                      <button
                        onClick={handleForceUpdateClick}
                        disabled={isUpdating}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer shrink-0"
                        title="Force update and refresh dataset right now"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isUpdating ? 'Updating...' : 'Force Update Now'}</span>
                      </button>
                    </div>

                    {/* Schedule Frequency Selector (Days Option as requested) */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Automatic Update Frequency:</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {[1, 2, 3, 5, 7, 14, 30].map((days) => {
                          const isSelected = (config.scheduleIntervalDays || 7) === days;
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() => handleIntervalChange(days)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {days === 1 ? 'Every 1 Day (Daily)' : days === 7 ? 'Every 7 Days (Weekly)' : `Every ${days} Days`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Schedule Badge & Live Countdown Bar */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="inline-block px-3 py-1.5 rounded-lg bg-emerald-100/90 text-emerald-900 font-mono text-xs font-semibold border border-emerald-200">
                        ⏰ Interval: Every {config.scheduleIntervalDays || 7} Days (00:00 UTC / 06:00 AM BST)
                      </div>

                      {/* Countdown Display */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Next auto-update in: <strong className="font-mono font-bold text-emerald-800">{countdownText}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Dataset Stats Card */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-600" />
                        Live Dynamic Dataset Stats
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Synced
                      </span>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Total Sanctioned Posts:</span>
                        <strong className="font-mono text-slate-900 font-extrabold">{dynamicStats?.total?.toLocaleString() || '2,506'} entries</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Active Staff Members:</span>
                        <strong className="font-mono text-emerald-700 font-extrabold">{dynamicStats?.filled?.toLocaleString() || '1,853'} records</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Vacant Posts:</span>
                        <strong className="font-mono text-amber-700 font-extrabold">{dynamicStats?.vacant?.toLocaleString() || '653'} records</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Geographic Hierarchy:</span>
                        <strong className="font-semibold text-slate-900">8 Divisions, 64 Districts</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Stored Dataset Backups (Last 2 Versions) for Rollback & Security */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <History className="w-4 h-4 text-emerald-600" />
                          Security & Backup Storage (Last 2 Update Versions)
                        </h4>
                        <p className="text-slate-500 text-xs mt-0.5">
                          In case of any sync issue or data corruption, restore any of the last 2 stored versions:
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeBackupOverride && (
                          <button
                            onClick={handleClearOverride}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Return to latest active dataset"
                          >
                            Exit Restored View
                          </button>
                        )}
                        <button
                          onClick={handleCreateManualSnapshot}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Save current dataset as a new backup snapshot"
                        >
                          <Archive className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Take Snapshot</span>
                        </button>
                      </div>
                    </div>

                    {/* Backups List (Max 2) */}
                    {backupsList.length === 0 ? (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                        <Archive className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600 font-medium">No previous backup snapshots stored yet.</p>
                        <button
                          onClick={handleCreateManualSnapshot}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Create Initial Backup Snapshot
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {backupsList.map((bk, idx) => {
                          const isRestoredActive = activeBackupOverride?.id === bk.id;
                          return (
                            <div
                              key={bk.id}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isRestoredActive
                                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    idx === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {idx === 0 ? 'Backup 1 (Latest Synced)' : 'Backup 2 (Previous Version)'}
                                  </span>
                                  {isRestoredActive && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> Active View
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {bk.label || 'Automated Update Snapshot'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-x-3">
                                  <span>📅 {new Date(bk.createdAt).toLocaleString('en-GB')}</span>
                                  <span>👥 {bk.recordCount?.toLocaleString()} posts ({bk.filledCount} filled, {bk.vacantCount} vacant)</span>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  onClick={() => handleRestoreBackup(bk.id)}
                                  disabled={isRestoredActive || restoringBackupId === bk.id}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isRestoredActive
                                      ? 'bg-emerald-200/60 text-emerald-800 cursor-default opacity-80'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
                                  }`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{isRestoredActive ? 'Currently Active' : 'Restore this Backup'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Modal: Add / Edit User Form */}
      {userModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {userFormError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {userFormError}
              </div>
            )}
            {userFormSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {userFormSuccess}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Password"
                    className="w-full px-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="User">User (Read-only)</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}