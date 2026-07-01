const STORAGE_KEY = 'scribbly_notes';

export function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createNote() {
  const note = {
    id: crypto.randomUUID(),
    title: '',
    body: '',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const notes = getNotes();
  notes.unshift(note);
  saveNotes(notes);
  return note;
}

export function updateNote(id, changes) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], ...changes, updatedAt: Date.now() };
  saveNotes(notes);
  return notes[idx];
}

export function deleteNote(id) {
  const notes = getNotes().filter(n => n.id !== id);
  saveNotes(notes);
}

export function togglePin(id) {
  const notes = getNotes();
  const note = notes.find(n => n.id === id);
  if (!note) return null;
  return updateNote(id, { pinned: !note.pinned });
}

export function searchNotes(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getNotes();
  return getNotes().filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.body.toLowerCase().includes(q)
  );
}

export function getSortedNotes(notes) {
  const pinned = notes.filter(n => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const rest   = notes.filter(n => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  return { pinned, rest };
}