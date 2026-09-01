// Application Authentication & Universal User Management Store
// Synchronized centrally across devices with granular permission control

import { supabase, isSupabaseConfigured } from './supabaseClient';

export const MAIN_ADMIN_USER = {
  id: 'user-admin-main',
  username: 'Ansarul',
  name: 'Ansarul',
  email: 'ansarul.contact@gmail.com',
  password: 'Ansarul@233',
  role: 'Super Admin',
  isSuperAdmin: true,
  canExportPdf: true,
  canViewHris: true,
  canViewPhone: true,
  canViewPrl: true,
  canViewDetails: true,
  isProtected: true,
  createdAt: '2026-08-28T00:00:00.000Z'
};

const DEFAULT_USERS = [MAIN_ADMIN_USER];

const STORAGE_USERS_KEY = 'dghs_users_v3';
const STORAGE_SESSION_KEY = 'dghs_current_user_session_v3';

// In-memory synced users cache
let inMemoryUsersCache = null;

function normalizeUser(u) {
  const isSuperAdmin = (u.email || '').toLowerCase() === MAIN_ADMIN_USER.email.toLowerCase() || u.id === 'user-admin-main' || (u.username || '').toLowerCase() === 'ansarul';
  const uname = isSuperAdmin ? 'Ansarul' : (u.username || u.name || 'User').trim();
  const role = isSuperAdmin ? 'Super Admin' : (u.role === 'Admin' ? 'Admin' : 'User');
  const hasFullAccess = isSuperAdmin || role === 'Admin';

  return {
    id: u.id || `user-${Date.now()}`,
    username: uname,
    name: uname,
    email: isSuperAdmin ? MAIN_ADMIN_USER.email : (u.email || '').trim().toLowerCase(),
    password: isSuperAdmin ? MAIN_ADMIN_USER.password : (u.password || ''),
    role,
    isSuperAdmin,
    canExportPdf: hasFullAccess ? true : Boolean(u.canExportPdf),
    canViewHris: hasFullAccess ? true : (u.canViewHris !== undefined ? Boolean(u.canViewHris) : true),
    canViewPhone: hasFullAccess ? true : (u.canViewPhone !== undefined ? Boolean(u.canViewPhone) : true),
    canViewPrl: hasFullAccess ? true : (u.canViewPrl !== undefined ? Boolean(u.canViewPrl) : true),
    canViewDetails: hasFullAccess ? true : (u.canViewDetails !== undefined ? Boolean(u.canViewDetails) : true),
    isProtected: isSuperAdmin || Boolean(u.isProtected),
    createdAt: u.createdAt || new Date().toISOString()
  };
}

export function getUsers() {
  if (inMemoryUsersCache && inMemoryUsersCache.length > 0) {
    return inMemoryUsersCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      inMemoryUsersCache = DEFAULT_USERS;
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      inMemoryUsersCache = DEFAULT_USERS;
      return DEFAULT_USERS;
    }

    const normalized = parsed.map(normalizeUser);
    // Ensure Main Admin is always present
    if (!normalized.some(u => u.email === MAIN_ADMIN_USER.email.toLowerCase())) {
      normalized.unshift(MAIN_ADMIN_USER);
    }

    inMemoryUsersCache = normalized;
    return normalized;
  } catch {
    inMemoryUsersCache = DEFAULT_USERS;
    return DEFAULT_USERS;
  }
}

export function saveUsers(users) {
  const normalized = (users || []).map(normalizeUser);
  if (!normalized.some(u => u.email === MAIN_ADMIN_USER.email.toLowerCase())) {
    normalized.unshift(MAIN_ADMIN_USER);
  }

  inMemoryUsersCache = normalized;
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('dghs_users_updated', { detail: normalized }));

  // Sync with cloud Supabase if connected
  if (isSupabaseConfigured && supabase) {
    // 1. Primary Sync: Unified JSON document store in `app_users` table
    supabase
      .from('app_users')
      .upsert({
        id: 1,
        users_list: normalized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          // Fallback: Row-based table `dghs_users`
          supabase
            .from('dghs_users')
            .upsert(normalized, { onConflict: 'email' })
            .catch((err) => console.warn('[Supabase Users Sync]:', err.message));
        }
      })
      .catch((err) => console.warn('[Supabase Users Sync Exception]:', err.message));
  }
}

export async function syncUsersWithCloud() {
  if (!isSupabaseConfigured || !supabase) return getUsers();

  try {
    // 1. Try fetching from unified JSON document `app_users` table
    const { data: docData, error: docError } = await supabase
      .from('app_users')
      .select('users_list')
      .eq('id', 1)
      .maybeSingle();

    if (!docError && docData?.users_list && Array.isArray(docData.users_list) && docData.users_list.length > 0) {
      const normalized = docData.users_list.map(normalizeUser);
      if (!normalized.some(u => u.email === MAIN_ADMIN_USER.email.toLowerCase())) {
        normalized.unshift(MAIN_ADMIN_USER);
      }
      inMemoryUsersCache = normalized;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('dghs_users_updated', { detail: normalized }));
      return normalized;
    }

    // 2. Fallback: Try fetching row-by-row from `dghs_users` table
    const { data: rowData, error: rowError } = await supabase
      .from('dghs_users')
      .select('*');

    if (!rowError && Array.isArray(rowData) && rowData.length > 0) {
      const normalized = rowData.map(normalizeUser);
      if (!normalized.some(u => u.email === MAIN_ADMIN_USER.email.toLowerCase())) {
        normalized.unshift(MAIN_ADMIN_USER);
      }
      inMemoryUsersCache = normalized;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('dghs_users_updated', { detail: normalized }));
      return normalized;
    }
  } catch (err) {
    console.warn('Failed to fetch remote users from Supabase:', err.message);
  }
  return getUsers();
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return normalizeUser(user);
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } else {
    const payload = normalizeUser(user);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(payload));
  }
}

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (21,600,000 ms)
const STORAGE_LOCKOUT_KEY = 'dghs_auth_lockout_v2';

export function getLockoutState() {
  try {
    const raw = localStorage.getItem(STORAGE_LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockoutUntil: null, isLocked: false, remainingSeconds: 0 };
    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.lockoutUntil && data.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
      return {
        failedAttempts: data.failedAttempts || MAX_LOGIN_ATTEMPTS,
        lockoutUntil: data.lockoutUntil,
        isLocked: true,
        remainingSeconds
      };
    }

    if (data.lockoutUntil && data.lockoutUntil <= now) {
      clearLockoutState();
      return { failedAttempts: 0, lockoutUntil: null, isLocked: false, remainingSeconds: 0 };
    }

    return {
      failedAttempts: data.failedAttempts || 0,
      lockoutUntil: null,
      isLocked: false,
      remainingSeconds: 0
    };
  } catch {
    return { failedAttempts: 0, lockoutUntil: null, isLocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedLoginAttempt() {
  const current = getLockoutState();
  const nextAttempts = (current.failedAttempts || 0) + 1;
  const now = Date.now();

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = now + LOCKOUT_DURATION_MS;
    const payload = { failedAttempts: nextAttempts, lockoutUntil };
    localStorage.setItem(STORAGE_LOCKOUT_KEY, JSON.stringify(payload));
    return {
      isLocked: true,
      failedAttempts: nextAttempts,
      remainingAttempts: 0,
      lockoutUntil,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
    };
  } else {
    const payload = { failedAttempts: nextAttempts, lockoutUntil: null };
    localStorage.setItem(STORAGE_LOCKOUT_KEY, JSON.stringify(payload));
    return {
      isLocked: false,
      failedAttempts: nextAttempts,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - nextAttempts,
      lockoutUntil: null,
      remainingSeconds: 0
    };
  }
}

export function clearLockoutState() {
  localStorage.removeItem(STORAGE_LOCKOUT_KEY);
}

export function loginUser(identifier, password) {
  const lockout = getLockoutState();
  if (lockout.isLocked) {
    return {
      success: false,
      isLocked: true,
      failedAttempts: lockout.failedAttempts,
      lockoutUntil: lockout.lockoutUntil,
      remainingSeconds: lockout.remainingSeconds,
      error: `Device is temporarily blocked for 6 hours due to ${MAX_LOGIN_ATTEMPTS} failed attempts.`
    };
  }

  const users = getUsers();
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const matched = users.find(u => 
    (u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) &&
    u.password === cleanPass
  );

  if (matched) {
    clearLockoutState();
    const sessionData = normalizeUser(matched);
    sessionData.loggedInAt = new Date().toISOString();
    setCurrentUser(sessionData);
    return { success: true, user: sessionData };
  }

  const attemptResult = recordFailedLoginAttempt();
  return {
    success: false,
    isLocked: attemptResult.isLocked,
    failedAttempts: attemptResult.failedAttempts,
    remainingAttempts: attemptResult.remainingAttempts,
    lockoutUntil: attemptResult.lockoutUntil,
    remainingSeconds: attemptResult.remainingSeconds,
    error: attemptResult.isLocked
      ? `Maximum ${MAX_LOGIN_ATTEMPTS} failed attempts reached! Device is now blocked for 6 hours.`
      : `Invalid username or password. (Attempt ${attemptResult.failedAttempts} of ${MAX_LOGIN_ATTEMPTS} — ${attemptResult.remainingAttempts} ${attemptResult.remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining before 6-hour lockout)`
  };
}

export function logoutUser() {
  setCurrentUser(null);
}

export function verifyAdminPassword(password) {
  const users = getUsers();
  const cleanPass = (password || '').trim();
  const adminMatch = users.find(u => (u.role === 'Super Admin' || u.role === 'Admin') && u.password === cleanPass);
  return Boolean(adminMatch || cleanPass === 'Ansarul@233');
}

export function addUser({
  username,
  name,
  email,
  password,
  role = 'User',
  canExportPdf = false,
  canViewHris = true,
  canViewPhone = true,
  canViewPrl = true,
  canViewDetails = true
}) {
  const users = getUsers();
  const cleanUsername = (username || name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  
  if (!cleanUsername) throw new Error('Username is required.');
  if (!cleanEmail) throw new Error('Email is required.');

  if (users.some(u => (u.username || u.name || '').toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error('A user with this username already exists.');
  }

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('A user with this email already exists.');
  }

  // No other user can be added as Super Admin
  const finalRole = role === 'Admin' ? 'Admin' : 'User';
  const isRoleAdmin = finalRole === 'Admin';

  const newUser = normalizeUser({
    id: `user-${Date.now()}`,
    username: cleanUsername,
    name: cleanUsername,
    email: cleanEmail,
    password: password.trim(),
    role: finalRole,
    canExportPdf: isRoleAdmin ? true : Boolean(canExportPdf),
    canViewHris: isRoleAdmin ? true : Boolean(canViewHris),
    canViewPhone: isRoleAdmin ? true : Boolean(canViewPhone),
    canViewPrl: isRoleAdmin ? true : Boolean(canViewPrl),
    canViewDetails: isRoleAdmin ? true : Boolean(canViewDetails),
    createdAt: new Date().toISOString()
  });

  const updated = [...users, newUser];
  saveUsers(updated);
  return newUser;
}

export function updateUser(id, {
  username,
  name,
  email,
  password,
  role,
  canExportPdf,
  canViewHris,
  canViewPhone,
  canViewPrl,
  canViewDetails
}) {
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) throw new Error('User not found.');

  const target = users[userIdx];
  const isTargetSuperAdmin = target.isProtected || target.email.toLowerCase() === MAIN_ADMIN_USER.email.toLowerCase();

  const cleanUsername = (username || name || target.username || target.name || '').trim();
  const cleanEmail = email ? email.trim().toLowerCase() : target.email;

  if (!isTargetSuperAdmin) {
    const nameConflict = users.find(u => u.id !== id && (u.username || u.name || '').toLowerCase() === cleanUsername.toLowerCase());
    if (nameConflict) throw new Error('Another user with this username already exists.');

    const emailConflict = users.find(u => u.id !== id && u.email.toLowerCase() === cleanEmail);
    if (emailConflict) throw new Error('Another user with this email already exists.');
  }

  // Super Admin role cannot be changed; other accounts can only be Admin or User
  const newRole = isTargetSuperAdmin ? 'Super Admin' : (role === 'Admin' ? 'Admin' : 'User');
  const isFullPrivilege = newRole === 'Super Admin' || newRole === 'Admin';

  const updatedUser = normalizeUser({
    ...target,
    username: isTargetSuperAdmin ? 'Ansarul' : cleanUsername,
    name: isTargetSuperAdmin ? 'Ansarul' : cleanUsername,
    email: isTargetSuperAdmin ? MAIN_ADMIN_USER.email : cleanEmail,
    password: password ? password.trim() : target.password,
    role: newRole,
    canExportPdf: isFullPrivilege ? true : (canExportPdf !== undefined ? Boolean(canExportPdf) : Boolean(target.canExportPdf)),
    canViewHris: isFullPrivilege ? true : (canViewHris !== undefined ? Boolean(canViewHris) : Boolean(target.canViewHris)),
    canViewPhone: isFullPrivilege ? true : (canViewPhone !== undefined ? Boolean(canViewPhone) : Boolean(target.canViewPhone)),
    canViewPrl: isFullPrivilege ? true : (canViewPrl !== undefined ? Boolean(canViewPrl) : Boolean(target.canViewPrl)),
    canViewDetails: isFullPrivilege ? true : (canViewDetails !== undefined ? Boolean(canViewDetails) : Boolean(target.canViewDetails)),
    updatedAt: new Date().toISOString()
  });

  users[userIdx] = updatedUser;
  saveUsers(users);

  // If current logged-in user was updated, refresh session
  const current = getCurrentUser();
  if (current && (current.id === id || current.email === cleanEmail)) {
    setCurrentUser(updatedUser);
  }

  return updatedUser;
}

export function deleteUser(id) {
  const users = getUsers();
  const target = users.find(u => u.id === id);
  if (!target) throw new Error('User not found.');

  if (target.isProtected || target.email.toLowerCase() === MAIN_ADMIN_USER.email.toLowerCase()) {
    throw new Error('The Main Administrator account (Ansarul) is protected and cannot be deleted.');
  }

  if (target.role === 'Admin') {
    const adminCount = users.filter(u => u.role === 'Admin').length;
    if (adminCount <= 1) {
      throw new Error('Cannot delete the only remaining Administrator account.');
    }
  }

  const updated = users.filter(u => u.id !== id);
  saveUsers(updated);

  // Delete from Supabase if configured
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('dghs_users')
      .delete()
      .eq('email', target.email)
      .catch((err) => console.warn('[Supabase User Delete]:', err.message));
  }

  const current = getCurrentUser();
  if (current && current.id === id) {
    logoutUser();
  }

  return true;
}