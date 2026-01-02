import { showToast } from '../utils/toast.js';
import { formatTimestamp } from '../utils/timestamp.js';
import { sortNotes } from './sortNotes.js';
import { updateEmptyState } from './emptyState.js';
import { saveNotes } from './saveNotes.js';

const addBtn = document.querySelector('.add-btn');
const notesEl = document.querySelector('.notes');

// Element Creators
function createHeader(title, pinned) {
  const headerRow = document.createElement('div');
  headerRow.className = 'note-header';

  const titleInput = document.createElement('input');
  titleInput.className = 'note-title';
  titleInput.type = 'text';
  titleInput.placeholder = "What's this about?";
  titleInput.value = title;

  const toolbar = document.createElement('div');
  toolbar.className = 'note-toolbar';
  toolbar.innerHTML = `
    <img src="./assets/icons/${pinned ? 'keep' : 'keep_off'}.svg" class="pin-btn" title="Pin note" alt="Pin note">
    <img src="./assets/icons/edit_note.svg" class="edit-btn" title="Edit note" alt="Edit note">
    <img src="./assets/icons/delete.svg" class="delete-btn" title="Delete note" alt="Delete note">
  `;

  headerRow.appendChild(titleInput);
  headerRow.appendChild(toolbar);
  return { headerRow, titleInput, toolbar };
}

function createEditor(content) {
  const textArea = document.createElement('textarea');
  textArea.className = 'note-editor';
  textArea.placeholder = 'Start scribbling...';
  textArea.value = content;
  return textArea;
}

function createPreview(content, title) {
  const preview = document.createElement('div');
  preview.className = 'note-preview';
  preview.innerHTML = content;
  updatePreviewTitle(preview, title);
  return preview;
}

function updatePreviewTitle(preview, newTitle) {
  const trimmed = (newTitle || '').trim();
  if (trimmed.length) {
    preview.setAttribute('data-title', trimmed);
  } else {
    preview.removeAttribute('data-title');
  }
}

function createTimestamp(timestampStr, note) {
  const timestampEl = document.createElement('div');
  timestampEl.className = 'note-timestamp';
  const noteTimestamp = timestampStr ? new Date(timestampStr) : new Date();
  timestampEl.textContent = formatTimestamp(noteTimestamp);
  note.dataset.timestamp = noteTimestamp.toISOString();
  return timestampEl;
}

// Event Binders
function bindTitleEvents(titleInput, preview) {
  titleInput.addEventListener('input', () => {
    preview.setAttribute('data-title', titleInput.value.trim());
    saveNotes();
  });
}

function bindEditorEvents(textArea, preview, timestampEl, note) {
  textArea.addEventListener('input', () => {
    if (textArea.value.trim().length === 0) return;
    preview.innerHTML = textArea.value;
    const now = new Date();
    note.dataset.timestamp = now.toISOString();
    timestampEl.textContent = formatTimestamp(now);
    saveNotes();
  });
}

function bindToolbarEvents(toolbar, note, textArea, titleInput, preview, timestampEl) {
  toolbar.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const pinBtn = e.target.closest('.pin-btn');

    if (editBtn) handleEdit(note, textArea, titleInput, preview, editBtn);
    if (deleteBtn) handleDelete(note);
    if (pinBtn) handlePin(note, pinBtn);
  });
}

// Handler Functions
function handleEdit(note, textArea, titleInput, preview, editBtn) {
  const isEditing = note.classList.toggle('editing');
  if (isEditing) {
    textArea.focus();
    editBtn.src = './assets/icons/check.svg';
    editBtn.title = 'Save note';
  } else {
    const contentTrimmed = textArea.value.trim();
    if (!contentTrimmed) {
      note.remove();
      updateEmptyState();
      saveNotes();
      showToast('Empty note discarded');
      return;
    }
    preview.innerHTML = textArea.value;
    updatePreviewTitle(preview, titleInput.value);
    saveNotes();
    sortNotes();
    showToast('Note saved');
    editBtn.src = './assets/icons/edit_note.svg';
    editBtn.title = 'Edit note';
  }
}

function handleDelete(note) {
  note.classList.add('deleting');
  note.addEventListener('animationend', () => {
    note.remove();
    updateEmptyState();
    saveNotes();
    showToast('Note deleted');
  }, { once: true });
}

function handlePin(note, pinBtn) {
  const isPinned = note.classList.toggle('pinned');
  pinBtn.src = `./assets/icons/${isPinned ? 'keep' : 'keep_off'}.svg`;
  saveNotes();
  sortNotes();
  showToast(isPinned ? 'Note pinned' : 'Note unpinned');
}

// Note Creation
export function createNote(content = '', isNew = true, timestampStr = null, pinned = false, title = '') {
  const note = document.createElement('div');
  note.className = 'note';
  if (pinned) note.classList.add('pinned');

  const { headerRow, titleInput, toolbar } = createHeader(title, pinned);
  const textArea = createEditor(content);
  const preview = createPreview(content, title);
  const timestampEl = createTimestamp(timestampStr, note);

  note._refs = { titleInput, textArea, preview, timestampEl };

  bindTitleEvents(titleInput, preview);
  bindEditorEvents(textArea, preview, timestampEl, note);
  bindToolbarEvents(toolbar, note, textArea, titleInput, preview, timestampEl);

  note.appendChild(headerRow);
  note.appendChild(textArea);
  note.appendChild(preview);
  note.appendChild(timestampEl);
  notesEl.insertBefore(note, notesEl.firstChild);

  if (isNew) {
    note.classList.add('editing');
    textArea.focus();
    const editBtn = toolbar.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.src = './assets/icons/check.svg';
      editBtn.title = 'Save note';
    }
  }

  updateEmptyState();

  note.addEventListener('dblclick', () => {
    note.classList.toggle('expanded');
  });

  return note;
}

// Add button handler
addBtn.addEventListener('click', () => {
  const editingNote = notesEl.querySelector('.note.editing');
  if (editingNote) {
    const textArea = editingNote._refs.textArea;
    textArea.focus();
    showToast('Finish editing the current note first');
    return;
  }
  createNote('');
  saveNotes();
});

// Focusout handler to discard empty notes
notesEl.addEventListener('focusout', e => {
  if (!e.target.classList.contains('note-editor') && !e.target.classList.contains('note-title')) return;
  const note = e.target.closest('.note');
  if (!note) return;
  const { textArea, titleInput, preview } = note._refs;
  const text = textArea.value.trim();

  if (!text) {
    note.remove();
    updateEmptyState();
    saveNotes();
    showToast('Empty note discarded');
  } else {
    updatePreviewTitle(preview, titleInput.value);
  }
});