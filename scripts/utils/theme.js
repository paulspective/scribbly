import { showToast } from './toast.js';

export function loadTheme() {
  const savedTheme = localStorage.getItem('scribblyTheme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.body.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('scribblyTheme', next);
  showToast(`Switched to ${next} theme`);
}