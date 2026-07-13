import { updateNote, getNotes, createNote, deleteNote, togglePin, searchNotes, getSortedNotes } from './notes.js';

let activeNoteId = null;
let beforeSwitchHandler = null;

export function setBeforeSwitchHandler(fn) {
  beforeSwitchHandler = fn;
}

export function getActiveNoteId() {
  return activeNoteId;
}

export function setActiveNoteId(id) {
  activeNoteId = id;
  return activeNoteId;
}

export function formatDate(ts) {
  const now  = new Date();
  const date = new Date(ts);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query = '') {
  const value = String(text ?? '');
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return escHtml(value);

  const terms = trimmed.split(/\s+/).filter(Boolean);
  let html = escHtml(value);

  terms.forEach(term => {
    const pattern = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    html = html.replace(pattern, '<mark class="search-match">$1</mark>');
  });

  return html;
}

export function updateEditorMeta(metaEl, note, titleText = '', bodyText = '') {
  if (!metaEl || !note) return;
  const charCount = (titleText || '').length + (bodyText || '').length;
  metaEl.textContent = `Updated ${formatDate(note.updatedAt)} • ${charCount} ${charCount === 1 ? 'character' : 'characters'}`;
}

export function setPinButtonState(buttonEl, pinned) {
  if (!buttonEl) return;
  buttonEl.classList.toggle('pinned', Boolean(pinned));
  const iconEl = buttonEl.querySelector('iconify-icon');
  if (iconEl) {
    iconEl.setAttribute('icon', pinned ? 'fluent:pin-24-filled' : 'fluent:pin-24-regular');
  }
  buttonEl.title = pinned ? 'Unpin note' : 'Pin note';
}

function groupByDate(notes) {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const groups = {};

  for (const note of notes) {
    const d = new Date(note.updatedAt);
    const dStr = d.toDateString();

    let label;

    if (dStr === todayStr) {
      label = "Today";
    } else if (dStr === yesterdayStr) {
      label = "Yesterday";
    } else {
      const yearDiff = now.getFullYear() - d.getFullYear();
      const monthDiff = now.getMonth() - d.getMonth() + yearDiff * 12;
      const dayDiff = Math.floor((now - d) / (1000 * 60 * 60 * 24));

      if (dayDiff < 7) {
        label = `${dayDiff} days ago`;
      } else if (dayDiff < 14) {
        label = "A week ago";
      } else if (monthDiff === 1) {
        label = "A month ago";
      } else if (monthDiff > 1) {
        label = `${monthDiff} months ago`;
      } else {
        label = "Earlier";
      }
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(note);
  }

  return groups;
}

export function renderNoteList(notes, query = '') {
  const list  = document.getElementById('note-list');
  const count = document.getElementById('note-count');
  const { pinned, rest } = getSortedNotes(notes);
  const groups = groupByDate(rest);
  const hasQuery = typeof query === 'string' && query.trim().length > 0;

  count.textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
  list.innerHTML = '';

  if (notes.length === 0) {
    const message = hasQuery
      ? `<div class="empty-list">No notes found for “${escHtml(query.trim())}”.</div>`
      : '<div class="empty-list">No notes yet.<br>Hit + to create one.</div>';
    list.innerHTML = message;
    return;
  }

  if (pinned.length > 0) {
    list.appendChild(makeSectionLabel('Pinned'));
    pinned.forEach(n => list.appendChild(makeNoteItem(n, query)));
  }

  for (const [group, items] of Object.entries(groups)) {
    if (!items.length) continue;
    list.appendChild(makeSectionLabel(group));
    items.forEach(n => list.appendChild(makeNoteItem(n, query)));
  }
}

function makeSectionLabel(text) {
  const el = document.createElement('div');
  el.className = 'section-label';
  el.textContent = text;
  return el;
}

function makeNoteItem(note, query = '') {
  const el = document.createElement('div');
  el.className = 'note-item' + (note.id === activeNoteId ? ' active' : '');
  el.dataset.id = note.id;

  const title   = note.title || 'Untitled';
  const preview = (note.body || '').split('\n').find(l => l.trim()) || 'No text';

  el.innerHTML = `
    <div class="note-item-title">${highlightText(title, query)}</div>
    <div class="note-item-preview">${highlightText(preview, query)}</div>
    <div class="note-item-meta">
      <span>${formatDate(note.updatedAt)}</span>
    </div>
  `;
  el.addEventListener('click', () => openNote(note.id));
  return el;
}

export function renderMasonry(notes, query = '') {
  const grid = document.getElementById('masonry');
  const { pinned, rest } = getSortedNotes(notes);
  const all = [...pinned, ...rest];
  const hasQuery = typeof query === 'string' && query.trim().length > 0;
  grid.innerHTML = '';

  if (all.length === 0) {
    const message = hasQuery
      ? `<div class="empty-list" style="column-span:all">No notes found for “${escHtml(query.trim())}”.</div>`
      : '<div class="empty-list" style="column-span:all">No notes yet.<br>Tap + to create one.</div>';
    grid.innerHTML = message;
    return;
  }

  if (pinned.length > 0) {
    const section = document.createElement('div');
    section.className = 'mobile-section-label';
    section.textContent = 'Pinned';
    grid.appendChild(section);
    pinned.forEach(note => grid.appendChild(makeMasonryCard(note, query)));
  }

  if (rest.length > 0) {
    if (pinned.length > 0) {
      const section = document.createElement('div');
      section.className = 'mobile-section-label';
      section.textContent = 'Notes';
      grid.appendChild(section);
    }
    rest.forEach(note => grid.appendChild(makeMasonryCard(note, query)));
  }
}

function makeMasonryCard(note, query = '') {
  const el = document.createElement('div');
  el.className = 'm-card';
  el.dataset.id = note.id;

  const title   = note.title || 'Untitled';
  const preview = note.body || 'No text';

  el.innerHTML = `
    <div class="m-card-title">${highlightText(title, query)}</div>
    <div class="m-card-body">${highlightText(preview, query)}</div>
    <div class="m-card-date">
      <span>${formatDate(note.updatedAt)}</span>
    </div>
  `;
  el.addEventListener('click', () => openMobileEditor(note.id));
  return el;
}

export function openNote(id) {
  if (activeNoteId !== id && beforeSwitchHandler) beforeSwitchHandler();
  setActiveNoteId(id);
  const note   = getNotes().find(n => n.id === id);
  if (!note) return;

  document.querySelectorAll('.note-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  const emptyState = document.getElementById('empty-state');
  const titleEl = document.getElementById('note-title');
  const bodyEl = document.getElementById('note-body');
  const metaEl = document.getElementById('editor-meta');
  const pinBtn = document.getElementById('pin-btn');
  const deleteBtn = document.getElementById('delete-btn');

  emptyState.classList.add('hidden');
  titleEl.classList.remove('hidden');
  bodyEl.classList.remove('hidden');
  pinBtn.classList.remove('hidden');
  deleteBtn.classList.remove('hidden');

  titleEl.value = note.title;
  bodyEl.value = note.body;
  updateEditorMeta(metaEl, note, titleEl.value, bodyEl.value);

  setPinButtonState(pinBtn, note.pinned);
}

export function closeEditor() {
  setActiveNoteId(null);
  document.getElementById('empty-state').classList.remove('hidden');
  document.getElementById('note-title').classList.add('hidden');
  document.getElementById('note-body').classList.add('hidden');
  document.getElementById('pin-btn').classList.add('hidden');
  document.getElementById('delete-btn').classList.add('hidden');
  document.getElementById('editor-meta').textContent = 'Select a note';
  document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
}

export function openMobileEditor(id) {
  if (activeNoteId !== id && beforeSwitchHandler) beforeSwitchHandler();
  setActiveNoteId(id);
  const note   = getNotes().find(n => n.id === id);
  if (!note) return;

  const listView = document.getElementById('mobile-list-view');
  const editorView = document.getElementById('mobile-editor-view');
  const titleEl = document.getElementById('mobile-note-title');
  const bodyEl = document.getElementById('mobile-note-body');
  const pinBtn = document.getElementById('mobile-pin-btn');
  const deleteBtn = document.getElementById('mobile-delete-btn');

  titleEl.value = note.title;
  bodyEl.value = note.body;
  pinBtn.classList.remove('hidden');
  deleteBtn.classList.remove('hidden');
  setPinButtonState(pinBtn, note.pinned);

  listView.classList.remove('is-visible');
  listView.classList.add('is-hidden');
  editorView.classList.remove('is-hidden');
  editorView.classList.add('is-visible');

  setTimeout(() => {
    if (!note.title) titleEl.focus();
    else bodyEl.focus();
  }, 80);
}

export function closeMobileEditor() {
  const listView = document.getElementById('mobile-list-view');
  const editorView = document.getElementById('mobile-editor-view');
  const pinBtn = document.getElementById('mobile-pin-btn');
  const deleteBtn = document.getElementById('mobile-delete-btn');

  editorView.classList.remove('is-visible');
  editorView.classList.add('is-hidden');
  listView.classList.remove('is-hidden');
  listView.classList.add('is-visible');
  pinBtn.classList.add('hidden');
  deleteBtn.classList.add('hidden');

  setActiveNoteId(null);
  renderAll();
}

export function renderAll(query = '') {
  const notes = query ? searchNotes(query) : getNotes();
  renderNoteList(notes, query);
  renderMasonry(notes, query);
}

export function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}