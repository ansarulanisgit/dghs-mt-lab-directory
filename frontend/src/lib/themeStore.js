const THEME_KEY = 'dghs_theme';

export function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {}
  return 'light';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'dark') {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }
}

export function setStoredTheme(theme) {
  const validTheme = theme === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_KEY, validTheme);
  } catch (e) {}
  applyTheme(validTheme);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dghs_theme_changed', { detail: validTheme }));
  }
  return validTheme;
}

export function toggleTheme() {
  const current = getStoredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  return setStoredTheme(next);
}

// Initialize theme immediately upon module evaluation
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme());
}