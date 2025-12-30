import { formatTimestamp } from './utils/timestamp.js';
import { loadTheme, toggleTheme } from './utils/theme.js';
import { loadNotes } from './notes/loadNotes.js';
import { searchNotes } from './notes/search.js';

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadNotes();
  searchNotes();

  const themeBtn = document.querySelector('.theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  setInterval(() => {
    document.querySelectorAll('.note').forEach(note => {
      const ts = new Date(note.dataset.timestamp);
      if (note._refs && note._refs.timestampEl) {
        note._refs.timestampEl.textContent = formatTimestamp(ts);
      }
    });
  }, 60 * 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./serviceWorker.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    });
  }
});