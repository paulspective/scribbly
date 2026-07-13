import { updateNote, getNotes, createNote, deleteNote, togglePin, searchNotes } from './notes.js';
import { renderNoteList, renderMasonry, formatDate, renderAll, openNote, closeEditor, openMobileEditor, closeMobileEditor, getActiveNoteId, updateEditorMeta, setPinButtonState, setBeforeSwitchHandler } from './ui.js';

const MOBILE_BREAKPOINT = 860;

let saveTimer = null;
let pendingSave = null;

function currentQuery() {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const input = isMobile
    ? document.getElementById('mobile-search-input')
    : document.getElementById('search-input');
  return input?.value || '';
}

function flushAutoSave() {
  if (!pendingSave) return;
  clearTimeout(saveTimer);
  const { id, titleEl, bodyEl, metaEl } = pendingSave;
  pendingSave = null;
  const updatedNote = updateNote(id, { title: titleEl.value.trim(), body: bodyEl.value });
  if (metaEl && updatedNote) updateEditorMeta(metaEl, updatedNote, titleEl.value, bodyEl.value);
  return updatedNote;
}

function scheduleAutoSave(id, titleEl, bodyEl, metaEl) {
  clearTimeout(saveTimer);
  pendingSave = { id, titleEl, bodyEl, metaEl };
  saveTimer = setTimeout(() => {
    flushAutoSave();
    renderAll(currentQuery());
    document.querySelectorAll('.note-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }, 400);
}

function setupEditorListeners(titleEl, bodyEl, metaEl, saveCallback) {
  titleEl.addEventListener('input', () => {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    const note = getNotes().find(n => n.id === activeId);
    if (note) updateEditorMeta(metaEl, note, titleEl.value, bodyEl.value);
    scheduleAutoSave(activeId, titleEl, bodyEl, metaEl);
  });
  bodyEl.addEventListener('input', () => {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    const note = getNotes().find(n => n.id === activeId);
    if (note) updateEditorMeta(metaEl, note, titleEl.value, bodyEl.value);
    scheduleAutoSave(activeId, titleEl, bodyEl, metaEl);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  setBeforeSwitchHandler(flushAutoSave);

  document.getElementById('new-btn-sidebar').addEventListener('click', () => {
    flushAutoSave();
    const note = createNote();
    renderAll();
    openNote(note.id);
    setTimeout(() => document.getElementById('note-title').focus(), 50);
  });

  const titleEl = document.getElementById('note-title');
  const bodyEl = document.getElementById('note-body');
  const metaEl = document.getElementById('editor-meta');
  setupEditorListeners(titleEl, bodyEl, metaEl);

  document.getElementById('pin-btn').addEventListener('click', () => {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    flushAutoSave();
    togglePin(activeId);
    renderAll();
    openNote(activeId);
  });

  document.getElementById('search-input').addEventListener('input', e => {
    renderAll(e.target.value);
    const activeId = getActiveNoteId();
    if (activeId) {
      const stillExists = getNotes().find(n => n.id === activeId);
      if (!stillExists) closeEditor();
      else {
        document.querySelectorAll('.note-item').forEach(el => {
          el.classList.toggle('active', el.dataset.id === activeId);
        });
      }
    }
  });

  document.getElementById('fab').addEventListener('click', () => {
    flushAutoSave();
    const note = createNote();
    renderAll();
    openMobileEditor(note.id);
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    flushAutoSave();
    closeMobileEditor();
  });

  const mTitleEl = document.getElementById('mobile-note-title');
  const mBodyEl = document.getElementById('mobile-note-body');
  setupEditorListeners(mTitleEl, mBodyEl, document.getElementById('mobile-editor-meta'));

  const deleteModal = document.getElementById('delete-modal');
  const deleteModalBackdrop = document.getElementById('delete-modal-backdrop');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');

  function openDeleteModal() {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    deleteModal.classList.remove('hidden');
    deleteModal.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteModal.setAttribute('aria-hidden', 'true');
  }

  function performDelete() {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    clearTimeout(saveTimer);
    pendingSave = null;
    deleteNote(activeId);
    renderAll(currentQuery());
    closeDeleteModal();
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    (isMobile ? closeMobileEditor : closeEditor)();
  }

  document.getElementById('delete-btn').addEventListener('click', openDeleteModal);
  document.getElementById('mobile-delete-btn').addEventListener('click', openDeleteModal);
  deleteModalBackdrop.addEventListener('click', closeDeleteModal);
  deleteCancelBtn.addEventListener('click', closeDeleteModal);
  deleteConfirmBtn.addEventListener('click', performDelete);

  document.getElementById('mobile-pin-btn').addEventListener('click', () => {
    const activeId = getActiveNoteId();
    if (!activeId) return;
    flushAutoSave();
    const note = togglePin(activeId);
    setPinButtonState(document.getElementById('mobile-pin-btn'), note?.pinned);
    renderAll(currentQuery());
  });

  document.getElementById('mobile-search-input').addEventListener('input', e => {
    renderAll(e.target.value);
  });

});