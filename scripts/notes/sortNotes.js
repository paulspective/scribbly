export function sortNotes() {
  const notesEl = document.querySelector('.notes');
  const notes = Array.from(notesEl.children);
  notes.sort((a, b) => {
    const aPinned = a.classList.contains('pinned');
    const bPinned = b.classList.contains('pinned');
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    const aTime = new Date(a.dataset.timestamp).getTime();
    const bTime = new Date(b.dataset.timestamp).getTime();
    return bTime - aTime;
  });
  notes.forEach(note => notesEl.appendChild(note));
}