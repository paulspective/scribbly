const searchBox = document.querySelector('.search');
const emptyEl = document.querySelector('.empty');

export function searchNotes() {
  searchBox.addEventListener('input', () => {
    const term = searchBox.value.toLowerCase().trim();
    const notes = Array.from(document.querySelectorAll('.note'));

    if (term.length === 0) {
      notes.forEach(note => {
        note.style.display = '';
        const textArea = note.querySelector('.note-editor');
        note.querySelector('.note-preview').innerHTML = textArea.value;
      });
      emptyEl.style.display = notes.length ? 'none' : 'block';
      emptyEl.textContent = 'No notes yet. Start scribbling.';
      return;
    }

    notes.forEach(note => {
      const textArea = note.querySelector('.note-editor');
      const text = textArea.value;
      if (text.toLowerCase().includes(term)) {
        note.style.display = '';
        const highlighted = text.replace(
          new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          match => `<mark>${match}</mark>`
        );
        note.querySelector('.note-preview').innerHTML = highlighted;
      } else {
        note.style.display = 'none';
      }
    });

    const visibleNotes = notes.filter(note => note.style.display !== 'none');
    emptyEl.style.display = visibleNotes.length ? 'none' : 'block';
    emptyEl.textContent = visibleNotes.length ? '' : 'No notes found.';
  });
}