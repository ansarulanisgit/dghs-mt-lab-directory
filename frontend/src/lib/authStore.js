// Application Authentication & User Management Store

const DEFAULT_USERS = [
  {
    id: 'user-admin-1',
    name: 'ansarul',
    email: 'ansarul.contact@gmail.com',
    password: 'Ansarul@233',
    role: 'Admin',
    createdAt: '2026-08-28T00:00:00.000Z'
  }
];

const STORAGE_USERS_KEY = 'dghs_users_v1';
const STORAGE_SESSION_KEY = 'dghs_current_user_session';

export function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } else {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  }
}

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (21,600,000 ms)
const STORAGE_LOCKOUT_KEY = 'dghs_auth_lockout_v1';

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

    // Lockout expired -> automatically reset
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
  // Check if device is currently locked out
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
    clearLockoutState(); // Reset attempt counter on success
    const sessionData = {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      role: matched.role,
      loggedInAt: new Date().toISOString()
    };
    setCurrentUser(sessionData);
    return { success: true, user: sessionData };
  }

  // Record failed login attempt
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
  const adminMatch = users.find(u => u.role === 'Admin' && u.password === cleanPass);
  return Boolean(adminMatch || cleanPass === 'Ansarul@233');
}

export function addUser({ name, email, password, role = 'User' }) {
  const users = getUsers();
  const cleanEmail = email.trim().toLowerCase();
  
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('A user with this email already exists.');
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    password: password.trim(),
    role,
    createdAt: new Date().toISOString()
  };

  const updated = [...users, newUser];
  saveUsers(updated);
  return newUser;
}

export function updateUser(id, { name, email, password, role }) {
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) throw new Error('User not found.');

  const cleanEmail = email.trim().toLowerCase();
  const emailConflict = users.find(u => u.id !== id && u.email.toLowerCase() === cleanEmail);
  if (emailConflict) throw new Error('Another user with this email already exists.');

  const updatedUser = {
    ...users[userIdx],
    name: name ? name.trim() : users[userIdx].name,
    email: email ? email.trim() : users[userIdx].email,
    password: password ? password.trim() : users[userIdx].password,
    role: role || users[userIdx].role,
    updatedAt: new Date().toISOString()
  };

  users[userIdx] = updatedUser;
  saveUsers(users);

  // If current logged-in user was updated, refresh session
  const current = getCurrentUser();
  if (current && current.id === id) {
    setCurrentUser({
      ...current,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  }

  return updatedUser;
}

export function deleteUser(id) {
  const users = getUsers();
  const target = users.find(u => u.id === id);
  if (!target) throw new Error('User not found.');

  // Prevent deleting the last Admin
  if (target.role === 'Admin') {
    const adminCount = users.filter(u => u.role === 'Admin').length;
    if (adminCount <= 1) {
      throw new Error('Cannot delete the only remaining Administrator account.');
    }
  }

  const updated = users.filter(u => u.id !== id);
  saveUsers(updated);

  const current = getCurrentUser();
  if (current && current.id === id) {
    logoutUser();
  }

  return true;
}