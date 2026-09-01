import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Lock, Shield, Settings, Users, Server, Check,
  AlertCircle, Plus, Edit2, Trash2, RotateCcw, Save, KeyRound, Eye, EyeOff,
  RefreshCw, Zap, Clock, Database, Calendar, History, Archive, CheckCircle2, UserCog,
  FileText, Columns3, CheckSquare, Sliders, GripVertical, ArrowUp, ArrowDown, Move
} from 'lucide-react';
import {
  getUsers, addUser, updateUser, deleteUser, verifyAdminPassword, syncUsersWithCloud
} from '../lib/authStore';
import {
  getSystemConfig, saveSystemConfig, resetSystemConfig, syncConfigWithCloud
} from '../lib/configStore';
import {
  getPdfColumnsConfig, savePdfColumnsConfig, resetPdfColumnsConfig, syncPdfColumnsWithCloud,
  AVAILABLE_PDF_COLUMNS, DEFAULT_PDF_CONFIG, DEFAULT_COLUMN_ORDER
} from '../lib/pdfConfigStore';
import { calculateTimeRemaining } from '../lib/countdownUtil';
import {
  getBackups, saveBackupSnapshot, restoreBackupById, getActiveBackupOverride, clearBackupOverride, deleteBackupById, MAX_BACKUPS
} from '../lib/backupStore';

export default function SettingsModal({ currentUser, onClose, onForceUpdate, dynamicStats, onManualSnapshot, metadata }) {
  // Password lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Super Admin flag: Only ansarul.contact@gmail.com is Super Admin
  const isSuperAdmin = currentUser?.isSuperAdmin || 
    currentUser?.role === 'Super Admin' || 
    (currentUser?.email || '').toLowerCase() === 'ansarul.contact@gmail.com';

  // Active Tab: 'status' | 'users' | 'pdf' | 'config' (arranged logically)
  const [activeTab, setActiveTab] = useState('status');

  // Config State
  const [config, setConfig] = useState(getSystemConfig());
  const [configSavedNotice, setConfigSavedNotice] = useState('');
  const [isConfigSaved, setIsConfigSaved] = useState(false);

  // PDF Column Configuration State
  const [pdfConfig, setPdfConfig] = useState(getPdfColumnsConfig());
  const [pdfSavedNotice, setPdfSavedNotice] = useState('');
  const [isPdfConfigSaved, setIsPdfConfigSaved] = useState(false);

  // Global Floating Toast Notification State
  const [toastMessage, setToastMessage] = useState(null); // { text: '', type: 'success' | 'error' | 'info' }

  const triggerToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Backup & Restore State (Keep last 2 update data in store)
  const [backupsList, setBackupsList] = useState(getBackups());
  const [activeBackupOverride, setActiveBackupOverride] = useState(getActiveBackupOverride());
  const [restoringBackupId, setRestoringBackupId] = useState(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // User Management State
  const [userList, setUserList] = useState(getUsers());
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'User', canExportPdf: false });
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Force Update & Countdown State
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateNotice, setUpdateNotice] = useState('');
  const [countdownText, setCountdownText] = useState('');

  // Auto-unlock for Super Admin and Admin
  useEffect(() => {
    if (isSuperAdmin || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') {
      setIsUnlocked(true);
    }
  }, [currentUser, isSuperAdmin]);

  // Synchronize dynamic cloud config, users & PDF column settings on mount
  useEffect(() => {
    syncUsersWithCloud().then(users => {
      if (users && Array.isArray(users) && users.length > 0) {
        setUserList(users);
      }
    });
    syncConfigWithCloud().then(cfg => {
      if (cfg) setConfig(cfg);
    });
    syncPdfColumnsWithCloud().then(pCfg => {
      if (pCfg) setPdfConfig(pCfg);
    });
  }, []);

  // Listen for realtime user list updates
  useEffect(() => {
    const handleUsersChanged = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setUserList(e.detail);
      } else {
        setUserList(getUsers());
      }
    };
    window.addEventListener('dghs_users_updated', handleUsersChanged);
    return () => window.removeEventListener('dghs_users_updated', handleUsersChanged);
  }, []);

  // Live Countdown universally based on configured interval days & central anchor timestamp
  useEffect(() => {
    function updateCountdown() {
      const text = calculateTimeRemaining(config.scheduleIntervalDays || 7, metadata?.last_run_at);
      setCountdownText(text);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [config.scheduleIntervalDays, metadata?.last_run_at]);

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
    setIsConfigSaved(true);
    triggerToast('Settings & Configuration saved successfully!', 'success');
    setConfigSavedNotice('Configuration saved successfully!');
    setTimeout(() => {
      setIsConfigSaved(false);
      setConfigSavedNotice('');
    }, 3500);
  };

  const handleIntervalChange = (days) => {
    const newDays = parseInt(days, 10) || 7;
    const updated = { ...config, scheduleIntervalDays: newDays };
    setConfig(updated);
    saveSystemConfig(updated);
    triggerToast(`Automatic update schedule updated to every ${newDays} ${newDays === 1 ? 'day' : 'days'}.`, 'success');
    setUpdateNotice(`Automatic update schedule set to every ${newDays} ${newDays === 1 ? 'day' : 'days'}.`);
    setTimeout(() => setUpdateNotice(''), 3500);
  };

  const handleResetConfig = () => {
    if (window.confirm('Reset all scraper and portal settings to default values?')) {
      const def = resetSystemConfig();
      setConfig(def);
      triggerToast('Configuration reset to default settings.', 'info');
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
      triggerToast('Dataset and directory stats successfully updated & synchronized!', 'success');
      setUpdateNotice('Dataset and directory stats successfully updated & synchronized!');
      setTimeout(() => setUpdateNotice(''), 4000);
    } catch (err) {
      triggerToast('Update error: ' + err.message, 'error');
      setUpdateNotice('Update error: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Backup Listeners
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

  const handleRestoreBackup = async (backupId) => {
    try {
      setRestoringBackupId(backupId);
      const restored = await restoreBackupById(backupId);
      setActiveBackupOverride(restored);
      triggerToast(`Restored "${restored.label}" (${restored.recordCount} records).`, 'success');
      setUpdateNotice(`Successfully restored "${restored.label}" (${restored.recordCount} records). Directory view is now displaying this version.`);
      setTimeout(() => setUpdateNotice(''), 4500);
    } catch (err) {
      triggerToast('Failed to restore backup: ' + err.message, 'error');
    } finally {
      setRestoringBackupId(null);
    }
  };

  const handleClearOverride = () => {
    clearBackupOverride();
    setActiveBackupOverride(null);
    triggerToast('Switched back to latest active dataset.', 'info');
    setUpdateNotice('Switched back to latest active dataset.');
    setTimeout(() => setUpdateNotice(''), 3500);
  };

  const handleCreateManualSnapshot = () => {
    if (backupsList.length >= MAX_BACKUPS) {
      triggerToast(`Maximum backup limit reached (${MAX_BACKUPS}/${MAX_BACKUPS}). Please delete an older backup first.`, 'error');
      setUpdateNotice(`Backup storage limit reached (${MAX_BACKUPS}/${MAX_BACKUPS}). Please delete an older backup before taking a new one.`);
      return;
    }
    try {
      if (onManualSnapshot) {
        onManualSnapshot();
        const updated = getBackups();
        setBackupsList(updated);
        setSnapshotSuccess(true);
        triggerToast(`Backup created and saved successfully! (${updated.length}/${MAX_BACKUPS} active backups)`, 'success');
        setUpdateNotice(`Backup created and saved successfully! (${updated.length}/${MAX_BACKUPS} active backups)`);
        setTimeout(() => {
          setSnapshotSuccess(false);
          setUpdateNotice('');
        }, 3500);
      }
    } catch (err) {
      triggerToast(err.message, 'error');
      setUpdateNotice(err.message);
    }
  };

  const handleDeleteBackup = (backupId) => {
    if (window.confirm('Are you sure you want to permanently delete this backup version?')) {
      try {
        deleteBackupById(backupId);
        const updated = getBackups();
        setBackupsList(updated);
        setActiveBackupOverride(getActiveBackupOverride());
        triggerToast('Backup version deleted successfully.', 'info');
        setUpdateNotice('Backup version deleted.');
        setTimeout(() => setUpdateNotice(''), 3000);
      } catch (err) {
        triggerToast('Failed to delete backup: ' + err.message, 'error');
      }
    }
  };

  const openAddUser = () => {
    setEditingUserId(null);
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'User',
      canExportPdf: false,
      canViewHris: true,
      canViewPhone: true,
      canViewPrl: true,
      canViewDetails: true
    });
    setUserFormError('');
    setUserFormSuccess('');
    setUserModalOpen(true);
  };

  const openEditUser = (user) => {
    const isTargetSuper = user.isSuperAdmin || user.role === 'Super Admin' || (user.email || '').toLowerCase() === 'ansarul.contact@gmail.com';
    const isTargetAdmin = isTargetSuper || user.role === 'Admin';
    setEditingUserId(user.id);
    setUserForm({
      username: user.username || user.name || '',
      email: user.email,
      password: user.password,
      role: isTargetSuper ? 'Super Admin' : (user.role === 'Admin' ? 'Admin' : 'User'),
      canExportPdf: isTargetAdmin ? true : Boolean(user.canExportPdf),
      canViewHris: isTargetAdmin ? true : (user.canViewHris !== undefined ? Boolean(user.canViewHris) : true),
      canViewPhone: isTargetAdmin ? true : (user.canViewPhone !== undefined ? Boolean(user.canViewPhone) : true),
      canViewPrl: isTargetAdmin ? true : (user.canViewPrl !== undefined ? Boolean(user.canViewPrl) : true),
      canViewDetails: isTargetAdmin ? true : (user.canViewDetails !== undefined ? Boolean(user.canViewDetails) : true),
      isProtected: Boolean(user.isProtected || isTargetSuper),
      isSuperAdmin: isTargetSuper
    });
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
        triggerToast('User account updated successfully!', 'success');
      } else {
        addUser(userForm);
        setUserFormSuccess('New user added successfully!');
        triggerToast('New user added successfully!', 'success');
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
    const isTargetSuper = user.isSuperAdmin || user.role === 'Super Admin' || (user.email || '').toLowerCase() === 'ansarul.contact@gmail.com';
    if (isTargetSuper || user.isProtected) {
      triggerToast('The Super Administrator (Ansarul) is protected and cannot be deleted.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${user.username || user.name}" (${user.email})?`)) {
      try {
        deleteUser(user.id);
        setUserList(getUsers());
        triggerToast(`User "${user.username || user.name}" deleted.`, 'info');
      } catch (err) {
        triggerToast(err.message, 'error');
      }
    }
  };

  // PDF Column Configuration Handlers
  const handleTogglePdfColumn = (colId) => {
    const current = pdfConfig.selectedColumns || [];
    let updated;
    if (current.includes(colId)) {
      if (current.length === 1) {
        triggerToast('At least one column must remain enabled in the PDF export.', 'error');
        return;
      }
      updated = current.filter(id => id !== colId);
    } else {
      updated = [...current, colId];
    }
    const newConfig = { ...pdfConfig, selectedColumns: updated };
    setPdfConfig(newConfig);
  };

  // Drag & drop state for PDF columns
  const [draggedColIdx, setDraggedColIdx] = useState(null);
  const [dragOverColIdx, setDragOverColIdx] = useState(null);

  // Compute ordered list of AVAILABLE_PDF_COLUMNS
  const orderedPdfColumns = useMemo(() => {
    const order = (pdfConfig.columnOrder && pdfConfig.columnOrder.length > 0)
      ? pdfConfig.columnOrder
      : DEFAULT_COLUMN_ORDER;
    
    const colMap = {};
    AVAILABLE_PDF_COLUMNS.forEach(col => { colMap[col.id] = col; });

    const ordered = [];
    order.forEach(id => {
      if (colMap[id]) ordered.push(colMap[id]);
    });
    AVAILABLE_PDF_COLUMNS.forEach(col => {
      if (!ordered.some(c => c.id === col.id)) ordered.push(col);
    });
    return ordered;
  }, [pdfConfig.columnOrder]);

  const handleDragStart = (e, index) => {
    setDraggedColIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', index.toString());
    } catch {
      // Fallback
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColIdx !== index) {
      setDragOverColIdx(index);
    }
  };

  const handleDragLeave = (e, index) => {
    if (dragOverColIdx === index) {
      setDragOverColIdx(null);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedColIdx === null || draggedColIdx === targetIndex) {
      setDraggedColIdx(null);
      setDragOverColIdx(null);
      return;
    }
    const newItems = [...orderedPdfColumns];
    const [moved] = newItems.splice(draggedColIdx, 1);
    newItems.splice(targetIndex, 0, moved);

    const newOrderIds = newItems.map(item => item.id);
    setPdfConfig(prev => ({ ...prev, columnOrder: newOrderIds }));
    setDraggedColIdx(null);
    setDragOverColIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedColIdx(null);
    setDragOverColIdx(null);
  };

  const handleMoveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedPdfColumns.length) return;
    const newItems = [...orderedPdfColumns];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const newOrderIds = newItems.map(item => item.id);
    setPdfConfig(prev => ({ ...prev, columnOrder: newOrderIds }));
  };

  const handleSavePdfConfig = (e) => {
    if (e) e.preventDefault();
    savePdfColumnsConfig(pdfConfig);
    setIsPdfConfigSaved(true);
    setPdfSavedNotice('PDF export columns and custom order synchronized globally!');
    triggerToast('PDF export layout saved successfully!', 'success');
    setTimeout(() => {
      setIsPdfConfigSaved(false);
      setPdfSavedNotice('');
    }, 2500);
  };

  const handleResetPdfConfig = () => {
    const res = resetPdfColumnsConfig();
    setPdfConfig(res);
    triggerToast('PDF columns and order reset to default settings.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl lg:max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Notification Toast (Always Stays Visible on Screen) */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
            <div className={`p-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-700 text-white border-emerald-500 shadow-emerald-900/40'
                : toastMessage.type === 'error'
                ? 'bg-rose-700 text-white border-rose-500 shadow-rose-900/40'
                : 'bg-slate-900 text-white border-slate-700 shadow-black/50'
            }`}>
              <div className="flex items-center gap-2.5">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-white" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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
            {/* Tabs Header (Arranged: Schedule & Status -> User Management -> Scraper Configuration) */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto">
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
                onClick={() => setActiveTab('pdf')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                  activeTab === 'pdf'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>PDF Columns</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {pdfConfig.selectedColumns?.length || 0}
                </span>
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('config')}
                  className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                    activeTab === 'config'
                      ? 'border-emerald-600 text-emerald-800 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Scraper Configuration</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Super Admin
                  </span>
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-5">
              {/* TAB 1: SCRAPER CONFIGURATION (Super Admin Exclusive) */}
              {activeTab === 'config' && isSuperAdmin && (
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
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Footer Text / Copyright Attribution
                        </label>
                        <input
                          type="text"
                          required
                          value={config.footerText || ''}
                          onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                          placeholder="DGHS Medical Technologist (Lab) Personnel Directory • Developed By Ansarul Anis"
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
                      className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        isConfigSaved
                          ? 'bg-emerald-800 text-white ring-2 ring-emerald-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isConfigSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Saved Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Configuration</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Manage registered accounts and granular access permissions.
                    </p>
                    <button
                      onClick={openAddUser}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add User
                    </button>
                  </div>

                  {/* Mobile View: Dedicated Touch-Friendly User Cards */}
                  <div className="space-y-3 sm:hidden">
                    {userList.map((u) => {
                      const isMainSuper = u.isSuperAdmin || u.role === 'Super Admin' || (u.email || '').toLowerCase() === 'ansarul.contact@gmail.com';
                      const isAdmin = !isMainSuper && u.role === 'Admin';
                      return (
                        <div key={u.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <span>{u.username || u.name}</span>
                                {isMainSuper && (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-950 border border-amber-300 shadow-2xs">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 font-mono text-xs mt-0.5">{u.email}</div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              isMainSuper
                                ? 'bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-950 border border-amber-300 shadow-2xs'
                                : isAdmin
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
                            }`}>
                              {isMainSuper ? 'Super Admin' : (isAdmin ? 'Admin' : 'Standard User')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-slate-500">PDF:</span>
                              <span className={`font-bold ${isMainSuper || isAdmin || u.canExportPdf ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isMainSuper || isAdmin || u.canExportPdf ? 'Allowed' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-slate-500">HRIS:</span>
                              <span className={`font-bold ${isMainSuper || isAdmin || u.canViewHris !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isMainSuper || isAdmin || u.canViewHris !== false ? 'Allowed' : 'Restricted'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-slate-500">Phone:</span>
                              <span className={`font-bold ${isMainSuper || isAdmin || u.canViewPhone !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isMainSuper || isAdmin || u.canViewPhone !== false ? 'Allowed' : 'Restricted'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-slate-500">PRL:</span>
                              <span className={`font-bold ${isMainSuper || isAdmin || u.canViewPrl !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isMainSuper || isAdmin || u.canViewPrl !== false ? 'Allowed' : 'Restricted'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg col-span-2 sm:col-span-1">
                              <span className="text-slate-500">Details:</span>
                              <span className={`font-bold ${isMainSuper || isAdmin || u.canViewDetails !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isMainSuper || isAdmin || u.canViewDetails !== false ? 'Allowed' : 'Disabled'}
                              </span>
                            </div>
                          </div>

                          <div className={`grid ${isMainSuper ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-2 border-t border-slate-100`}>
                            <button
                              onClick={() => openEditUser(u)}
                              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer shadow-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Edit User</span>
                            </button>
                            {!isMainSuper && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-rose-200 cursor-pointer shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Full Table with Scrollable Wrapper */}
                  <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Access Permissions</th>
                          <th className="p-3 hidden md:table-cell">Password</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => {
                          const isMainSuper = u.isSuperAdmin || u.role === 'Super Admin' || (u.email || '').toLowerCase() === 'ansarul.contact@gmail.com';
                          const isAdmin = !isMainSuper && u.role === 'Admin';
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.username || u.name}</span>
                                  {isMainSuper && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-950 border border-amber-300 shadow-2xs">
                                      Super Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  isMainSuper
                                    ? 'bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-950 border border-amber-300 shadow-2xs'
                                    : isAdmin
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
                                }`}>
                                  {isMainSuper ? 'Super Admin' : (isAdmin ? 'Admin' : 'Standard User')}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isMainSuper || isAdmin || u.canExportPdf ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    PDF {isMainSuper || isAdmin || u.canExportPdf ? '✓' : '✗'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isMainSuper || isAdmin || u.canViewHris !== false ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    HRIS {isMainSuper || isAdmin || u.canViewHris !== false ? '✓' : '✗'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isMainSuper || isAdmin || u.canViewPhone !== false ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    Phone {isMainSuper || isAdmin || u.canViewPhone !== false ? '✓' : '✗'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isMainSuper || isAdmin || u.canViewPrl !== false ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    PRL {isMainSuper || isAdmin || u.canViewPrl !== false ? '✓' : '✗'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isMainSuper || isAdmin || u.canViewDetails !== false ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    Details {isMainSuper || isAdmin || u.canViewDetails !== false ? '✓' : '✗'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-slate-400 hidden md:table-cell">
                                ••••••••
                              </td>
                              <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => openEditUser(u)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!isMainSuper && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: PDF COLUMN SETTINGS (Super Admin & Admin) */}
              {activeTab === 'pdf' && (
                <div className="space-y-4">
                  {pdfSavedNotice && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{pdfSavedNotice}</span>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        PDF Export Column Customization & Layout
                      </h4>
                      <p className="text-slate-600 text-xs mt-0.5">
                        <strong>Drag & drop</strong> column cards or use the <strong>↑ / ↓</strong> buttons to arrange order. Toggle columns <strong>ON / OFF</strong> to include or exclude.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 shadow-2xs">
                        {pdfConfig.selectedColumns?.length || 0} of {AVAILABLE_PDF_COLUMNS.length} Columns Enabled
                      </span>
                    </div>
                  </div>

                  {/* Columns Grid with Drag & Drop Reordering */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {orderedPdfColumns.map((col, index) => {
                      const isSelected = (pdfConfig.selectedColumns || []).includes(col.id);
                      const isBeingDragged = draggedColIdx === index;
                      const isDraggedOver = dragOverColIdx === index && draggedColIdx !== index;

                      return (
                        <div
                          key={col.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={(e) => handleDragLeave(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`p-3.5 rounded-2xl border transition-all select-none flex flex-col justify-between gap-3 relative ${
                            isBeingDragged
                              ? 'opacity-35 scale-[0.97] border-dashed border-emerald-500 bg-emerald-50/40 shadow-inner'
                              : isDraggedOver
                              ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-400 scale-[1.01] shadow-md'
                              : isSelected
                              ? 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/20 hover:border-emerald-600'
                              : 'bg-slate-50/70 border-slate-200 opacity-75 hover:opacity-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Drag Handle */}
                              <div 
                                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0" 
                                title="Drag to rearrange column order"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[10px] flex items-center justify-center font-mono shrink-0">
                                #{index + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-xs tracking-wider text-slate-900 font-mono block truncate">
                                  {col.label}
                                </span>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {col.description}
                                </p>
                              </div>
                            </div>

                            {/* Move Up/Down Controls & Status Badge */}
                            <div className="flex items-center gap-1 shrink-0">
                              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, -1); }}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                  title="Move earlier (#1, #2...)"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === orderedPdfColumns.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, 1); }}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                  title="Move later"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isSelected ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </div>

                          {/* Simple ON / OFF Green Radio Buttons */}
                          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
                            {/* ON Green Radio */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSelected) handleTogglePdfColumn(col.id);
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-white bg-emerald-700' : 'border-slate-400 bg-white'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in-50" />}
                              </div>
                              <span>ON</span>
                            </button>

                            {/* OFF Radio */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) handleTogglePdfColumn(col.id);
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                !isSelected
                                  ? 'bg-slate-700 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                !isSelected ? 'border-white bg-slate-800' : 'border-slate-400 bg-white'
                              }`}>
                                {!isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in-50" />}
                              </div>
                              <span>OFF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Helper Buttons & Info */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ selectedColumns: AVAILABLE_PDF_COLUMNS.map(c => c.id) })}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 font-semibold transition-colors cursor-pointer text-[11px]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ selectedColumns: ['sl', 'post_id', 'name', 'designation', 'status', 'hris_id', 'contact_no', 'institute', 'prl_date'] })}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 font-semibold transition-colors cursor-pointer text-[11px]"
                      >
                        Standard Default
                      </button>
                    </div>

                    <p className="text-slate-400 text-[11px]">
                      Theme, emerald styling, and landscape A4 formatting remain preserved.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetPdfConfig}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Defaults
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePdfConfig}
                      className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        isPdfConfigSaved
                          ? 'bg-emerald-800 text-white ring-2 ring-emerald-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isPdfConfigSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Saved Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save PDF Settings</span>
                        </>
                      )}
                    </button>
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
                        {[7, 14, 30].map((days) => {
                          const isSelected = (config.scheduleIntervalDays || 7) === days;
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() => handleIntervalChange(days)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {days === 7 ? 'Every 7 Days (Weekly)' : `Every ${days} Days`}
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
                        <strong className="font-mono text-slate-900 font-extrabold">{dynamicStats?.total?.toLocaleString() || '10,027'} entries</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Active Staff Members:</span>
                        <strong className="font-mono text-emerald-700 font-extrabold">{dynamicStats?.filled?.toLocaleString() || '6,516'} records</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Vacant Posts:</span>
                        <strong className="font-mono text-amber-700 font-extrabold">{dynamicStats?.vacant?.toLocaleString() || '3,259'} records</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-600">Abolished Posts:</span>
                        <strong className="font-mono text-slate-700 font-extrabold">{dynamicStats?.abolished?.toLocaleString() || '252'} records</strong>
                      </li>
                      <li className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between sm:col-span-2">
                        <span className="text-slate-600">Geographic Hierarchy:</span>
                        <strong className="font-semibold text-slate-900">8 Divisions, 64 Districts, Nationwide Facilities</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Stored Dataset Backups (Up to 5 Versions) for Rollback & Security */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-600" />
                            Security & Backup Storage (Up to 5 Active Backups)
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            backupsList.length >= MAX_BACKUPS
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {backupsList.length} / {MAX_BACKUPS} Used
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Store up to 5 point-in-time backup versions. You can restore or delete any version anytime:
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            snapshotSuccess
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-500 shadow-sm'
                              : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                          title="Save current dataset as a new point-in-time backup"
                        >
                          {snapshotSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                              <span>Backup Created!</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Take Backup</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Snapshot Success Notification Banner */}
                    {snapshotSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>New point-in-time backup created and saved in Backup 1!</span>
                      </div>
                    )}

                    {/* Limit Reached Warning Banner */}
                    {backupsList.length >= MAX_BACKUPS && !snapshotSuccess && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Maximum backup capacity reached ({MAX_BACKUPS}/{MAX_BACKUPS}). Please delete an older backup before creating a new one.</span>
                      </div>
                    )}

                    {/* Backups List (Max 5) */}
                    {backupsList.length === 0 ? (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                        <Archive className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600 font-medium">No previous backup versions stored yet.</p>
                        <button
                          onClick={handleCreateManualSnapshot}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Create Initial Backup
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
                                    Backup {idx + 1} {idx === 0 ? '(Latest)' : ''}
                                  </span>
                                  {isRestoredActive && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> Active Restored View
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {bk.label || 'Automated Update Backup'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-x-3">
                                  <span>📅 {new Date(bk.createdAt).toLocaleString('en-GB')}</span>
                                  <span>👥 {bk.recordCount?.toLocaleString()} posts ({bk.filledCount} filled, {bk.vacantCount} vacant, {bk.abolishedCount || 0} abolished)</span>
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
                                  title="Restore this backup version into active view"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{isRestoredActive ? 'Active View' : 'Restore'}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteBackup(bk.id)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Delete this backup version"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete</span>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0 border-b border-emerald-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-emerald-200">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base leading-tight">
                    {editingUserId ? 'Edit User Profile' : 'Add New User'}
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-medium">
                    Configure account credentials & feature permissions
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setUserModalOpen(false)} 
                className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveUser} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {userFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{userFormError}</span>
                  </div>
                )}
                {userFormSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{userFormSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Username</label>
                    <input
                      type="text"
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="e.g. username"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Email Address</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Password</label>
                    <div className="relative">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        required
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Account Role</label>
                    <select
                      value={userForm.role}
                      disabled={userForm.isSuperAdmin || userForm.isProtected}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        const isFull = newRole === 'Admin' || newRole === 'Super Admin';
                        setUserForm({
                          ...userForm,
                          role: newRole,
                          canExportPdf: isFull ? true : userForm.canExportPdf,
                          canViewHris: isFull ? true : userForm.canViewHris,
                          canViewPhone: isFull ? true : userForm.canViewPhone,
                          canViewPrl: isFull ? true : userForm.canViewPrl,
                          canViewDetails: isFull ? true : userForm.canViewDetails
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {userForm.isSuperAdmin ? (
                        <option value="Super Admin">Super Admin (System Owner)</option>
                      ) : (
                        <>
                          <option value="User">Standard User (Directory Access)</option>
                          <option value="Admin">Administrator (Manage Users & Status)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {userForm.isSuperAdmin ? (
                  <p className="text-[11px] text-amber-900 font-semibold bg-gradient-to-r from-amber-50 to-emerald-50 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                    The Super Administrator (Ansarul) is protected and permanently maintains master scraper & system control.
                  </p>
                ) : userForm.isProtected ? (
                  <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    This Administrator account is protected.
                  </p>
                ) : null}

                {/* Granular Permission Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-slate-800 text-xs tracking-tight">Granular Feature Permissions</label>
                    <span className="text-[10px] text-slate-400 font-medium">Toggle access per feature</span>
                  </div>

                  {/* 1. PDF Export */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">PDF Report Export</span>
                      <span className="text-[10px] text-slate-500">Download and export filtered directory PDF reports</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={userForm.role === 'Admin' || Boolean(userForm.canExportPdf)}
                        disabled={userForm.role === 'Admin'}
                        onChange={(e) => setUserForm({ ...userForm, canExportPdf: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-60"></div>
                    </label>
                  </div>

                  {/* 2. View HRIS ID */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">HRIS ID Visibility</span>
                      <span className="text-[10px] text-slate-500">View official DGHS HRIS identification numbers</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={userForm.role === 'Admin' || userForm.canViewHris !== false}
                        disabled={userForm.role === 'Admin'}
                        onChange={(e) => setUserForm({ ...userForm, canViewHris: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-60"></div>
                    </label>
                  </div>

                  {/* 3. View Phone Numbers */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">View Contact Phone Numbers</span>
                      <span className="text-[10px] text-slate-500">Show full contact phone numbers (unmasked)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={userForm.role === 'Admin' || userForm.canViewPhone !== false}
                        disabled={userForm.role === 'Admin'}
                        onChange={(e) => setUserForm({ ...userForm, canViewPhone: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-60"></div>
                    </label>
                  </div>

                  {/* 4. View PRL Dates */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">View PRL Retirement Dates</span>
                      <span className="text-[10px] text-slate-500">Show PRL retirement dates on staff cards & modal</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={userForm.role === 'Admin' || userForm.canViewPrl !== false}
                        disabled={userForm.role === 'Admin'}
                        onChange={(e) => setUserForm({ ...userForm, canViewPrl: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-60"></div>
                    </label>
                  </div>

                  {/* 5. "View Full Details" Modal Access */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">"View Full Details" Modal Access</span>
                      <span className="text-[10px] text-slate-500">Allow opening full personnel inspection modal</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={userForm.role === 'Admin' || userForm.canViewDetails !== false}
                        disabled={userForm.role === 'Admin'}
                        onChange={(e) => setUserForm({ ...userForm, canViewDetails: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-60"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}