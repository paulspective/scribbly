export function updateEmptyState() {
  const notesEl = document.querySelector('.notes');
  const emptyEl = document.querySelector('.empty');
  const visibleNotes = Array.from(notesEl.children).filter(note => note.style.display !== 'none');
  emptyEl.style.display = visibleNotes.length ? 'none' : 'block';
}