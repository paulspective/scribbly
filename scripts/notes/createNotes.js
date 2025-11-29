import { showToast } from '../utils/toast.js';
import { formatTimestamp } from '../utils/timestamp.js';
import { sortNotes } from './sortNotes.js';
import { updateEmptyState } from './emptyState.js';
import { saveNotes } from './saveNotes.js';

const addBtn = document.querySelector('.add-btn');
const notesEl = document.querySelector('.notes');

export function createNote(content = '', isNew = true, timestampStr = null, pinned = false, title = '') {
  const note = document.createElement('div');
  note.className = 'note';
  if (pinned) note.classList.add('pinned');

  const headerRow = document.createElement('div');
  headerRow.className = 'note-header';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.className = 'note-title';
  titleInput.type = 'text';
  titleInput.placeholder = "What's this about?";
  titleInput.value = title;

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'note-toolbar';
  toolbar.innerHTML = `
    <img src="./assets/icons/${pinned ? 'keep' : 'keep_off'}.svg" class="pin-btn" title="Pin note" alt="Pin note">
    <img src="./assets/icons/edit_note.svg" class="edit-btn" title="Edit note" alt="Edit note">
    <img src="./assets/icons/delete.svg" class="delete-btn" title="Delete note" alt="Delete note">
  `;

  headerRow.appendChild(titleInput);
  headerRow.appendChild(toolbar);

  // Content textarea
  const textArea = document.createElement('textarea');
  textArea.className = 'note-editor';
  textArea.placeholder = 'Start scribbling...';
  textArea.value = content;

  // Preview
  const preview = document.createElement('div');
  preview.className = 'note-preview';
  preview.innerHTML = content;
  function updatePreviewTitle(newTitle) {
    const trimmed = (newTitle || '').trim();
    if (trimmed.length) {
      preview.setAttribute('data-title', trimmed);
    } else {
      preview.removeAttribute('data-title');
    }
  }
  updatePreviewTitle(title);

  // Timestamp
  const timestampEl = document.createElement('div');
  timestampEl.className = 'note-timestamp';
  const noteTimestamp = timestampStr ? new Date(timestampStr) : new Date();
  timestampEl.textContent = formatTimestamp(noteTimestamp);
  note.dataset.timestamp = noteTimestamp.toISOString();

  note._refs = { titleInput, textArea, preview, timestampEl };

  // Events
  titleInput.addEventListener('input', () => {
    preview.setAttribute('data-title', titleInput.value.trim());
    saveNotes();
  });

  textArea.addEventListener('input', () => {
    if (textArea.value.trim().length === 0) return;
    preview.innerHTML = textArea.value;
    const now = new Date();
    note.dataset.timestamp = now.toISOString();
    timestampEl.textContent = formatTimestamp(now);
    saveNotes();
  });

  toolbar.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const pinBtn = e.target.closest('.pin-btn');

    if (editBtn) {
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
        updatePreviewTitle(titleInput.value);
        saveNotes();
        sortNotes();
        showToast('Note saved');
        editBtn.src = './assets/icons/edit_note.svg';
        editBtn.title = 'Edit note';
      }
    }

    if (deleteBtn) {
      note.classList.add('deleting');
      note.addEventListener('animationend', () => {
        note.remove();
        updateEmptyState();
        saveNotes();
        showToast('Note deleted');
      }, { once: true });
    }

    if (pinBtn) {
      const isPinned = note.classList.toggle('pinned');
      e.target.src = `./assets/icons/${isPinned ? 'keep' : 'keep_off'}.svg`;
      saveNotes();
      sortNotes();
      showToast(isPinned ? 'Note pinned' : 'Note unpinned');
    }
  });

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

  titleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textArea.focus();
    }
  });

  textArea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      const text = textArea.value.trim();

      if (!text) {
        note.remove();
        updateEmptyState();
        saveNotes();
        showToast('Empty note discarded');
      } else {
        saveNotes();
        sortNotes();
        note.classList.remove('editing');
        const editBtn = toolbar.querySelector('.edit-btn');
        if (editBtn) editBtn.src = './assets/icons/edit_note.svg';
        showToast('Note saved');
      }
    }
  });

  note.addEventListener('dblclick', () => {
    note.classList.toggle('expanded');
  });

  return note;
}

addBtn.addEventListener('click', () => {
  const editingNote = notesEl.querySelector('.note.editing');
  if (editingNote) {
    const textArea = editingNote._refs.textArea;
    textArea.focus();
    showToast('Finish editing the current note first');
    return;
  }

  const note = createNote('');
  saveNotes();
});

notesEl.addEventListener('focusout', e => {
  if (!e.target.classList.contains('note-editor') || !e.target.classList.contains('note-title')) return;
  const note = e.target.closest('.note');
  if (!note) return;
  const textArea = note._refs.textArea;
  const titleInput = note._refs.titleInput;
  const preview = note._refs.preview;
  const text = textArea.value.trim();

  if (!text) {
    note.remove();
    updateEmptyState();
    saveNotes();
    showToast('Empty note discarded');
  } else {
    updatePreviewTitle(titleInput.value);
  }
});