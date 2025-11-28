import { createNote } from './createNotes.js';
import { sortNotes } from './sortNotes.js';

export function loadNotes() {
  const stored = JSON.parse(localStorage.getItem('scribblyNotes') || '[]');
  stored.forEach(item => {
    if (typeof item === 'object') {
      createNote(item.content || '', false, item.timestamp, item.pinned || false, item.title || '');
    }
  });
  sortNotes();
}