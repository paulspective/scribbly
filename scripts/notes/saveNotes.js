export function saveNotes() {
  const notes = Array.from(document.querySelectorAll('.note')).map(note => {
    const title = (note._refs && note._refs.titleInput) ? note._refs.titleInput.value : '';
    const content = (note._refs && note._refs.textArea) ? note._refs.textArea.value : '';
    const timestamp = note.dataset.timestamp || new Date().toISOString();
    const pinned = note.classList.contains('pinned');
    return { title, content, timestamp, pinned };
  });
  try {
    localStorage.setItem('scribblyNotes', JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save notes to localStorage', err);
  }
}