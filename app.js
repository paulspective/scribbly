// timestamp formatting
function formatTimestamp(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);
  const weeks = Math.floor(days / 7);

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  if (diff < 60) return 'Updated Just now';
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Updated Yesterday';
  if (days < 7) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks === 1) return 'Updated Last week';
  if (weeks < 4) return `Updated ${weeks} week${weeks === 1 ? '' : 's'} ago`;

  if (year === now.getFullYear()) {
    return `Updated ${day} ${month}`;
  } else {
    return `Updated ${day} ${month}, ${year}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.querySelector('.add-btn');
  const notesEl = document.querySelector('.notes');
  const emptyEl = document.querySelector('.empty');
  const searchBox = document.querySelector('.search');

  // Search handler
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
      emptyEl.textContent = 'No notes yet — click + to create one.';
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

  // Save notes to localStorage
  function saveNotes() {
    const notes = [...document.querySelectorAll('.note')]
      .filter(note => note.querySelector('.note-editor').value.trim().length > 0)
      .map(note => ({
        content: note.querySelector('.note-editor').value,
        timestamp: note.dataset.timestamp || new Date().toISOString(),
        pinned: note.classList.contains('pinned')
      }));
    localStorage.setItem('scribblyNotes', JSON.stringify(notes));
  }

  // Update empty state
  function updateEmptyState() {
    const visibleNotes = Array.from(notesEl.children).filter(note => note.style.display !== 'none');
    emptyEl.style.display = visibleNotes.length ? 'none' : 'block';
  }

  // Create a new note
  function createNote(content = '', isNew = true, timestampStr = null, pinned = false) {
    const note = document.createElement('div');
    note.className = 'note';
    if (pinned) note.classList.add('pinned');

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'note-toolbar';
    toolbar.innerHTML = `
    <span class="material-symbols-outlined pin-btn" title="Pin note">${pinned ? 'keep' : 'keep_off'}</span>
    <span class="material-symbols-outlined edit-btn" title="Edit note">edit_note</span>
    <span class="material-symbols-outlined delete-btn" title="Delete note">delete</span>
  `;

    // Elements
    const textArea = document.createElement('textarea');
    textArea.className = 'note-editor';
    textArea.placeholder = 'Write something...';
    textArea.value = content;

    const preview = document.createElement('div');
    preview.className = 'note-preview';
    preview.innerHTML = content;

    const timestampEl = document.createElement('div');
    timestampEl.className = 'note-timestamp';
    const noteTimestamp = timestampStr ? new Date(timestampStr) : new Date();
    timestampEl.textContent = formatTimestamp(noteTimestamp);
    note.dataset.timestamp = noteTimestamp.toISOString();


    note._refs = { textArea, preview, timestampEl };

    // Events
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
      if (editBtn) {
        const isEditing = note.classList.toggle('editing');
        if (isEditing) {
          note._refs.textArea.focus();
          editBtn.textContent = 'done';
        } else {
          note._refs.preview.innerHTML = note._refs.textArea.value;
          saveNotes();
          sortNotes();
          editBtn.textContent = 'edit_note';
        }
      }

      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        note.classList.add('deleting');
        note.addEventListener('animationend', () => {
          note.remove();
          updateEmptyState();
          saveNotes();
          showToast('Note deleted');
        }, { once: true });
      }

      const pinBtn = e.target.closest('.pin-btn');
      if (pinBtn) {
        const isPinned = note.classList.toggle('pinned');
        e.target.textContent = isPinned ? 'keep' : 'keep_off';
        saveNotes();
        sortNotes();
        showToast(isPinned ? 'Note pinned' : 'Note unpinned');
      }
    });

    note.appendChild(toolbar);
    note.appendChild(textArea);
    note.appendChild(preview);
    note.appendChild(timestampEl);
    notesEl.insertBefore(note, notesEl.firstChild);

    if (isNew) {
      note.classList.add('editing');
      textArea.focus();
      const editBtn = toolbar.querySelector('.edit-btn');
      if (editBtn) editBtn.textContent = 'done';
    }

    updateEmptyState();

    note.addEventListener('dblclick', () => {
      note.classList.toggle('expanded');
    });

    return note;
  }

  // Add new note
  addBtn.addEventListener('click', () => {
    const note = createNote('');
    saveNotes();
  });

  // Sort notes
  function sortNotes() {
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

  notesEl.addEventListener('focusout', e => {
    if (!e.target.classList.contains('note-editor')) return;
    const note = e.target.closest('.note');
    const textArea = note._refs.textArea;
    const text = textArea.value.trim();

    if (!text) {
      note.remove();
      updateEmptyState();
      saveNotes();
    }
  });

  function loadTheme() {
    const savedTheme = localStorage.getItem('scribblyTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('scribblyTheme', next);
  }

  document.querySelector('.theme-btn').addEventListener('click', toggleTheme);

  // Toast
  function showToast(message = 'Theme switched') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 1500);
  }

  // Load notes
  function loadNotes() {
    const stored = JSON.parse(localStorage.getItem('scribblyNotes') || '[]');
    stored.forEach(item => {
      if (typeof item === 'object') {
        createNote(item.content || '', false, item.timestamp, item.pinned || false);
      }
    });
    sortNotes();
  }

  loadTheme();
  loadNotes();

  // Update timestamps every 60s
  setInterval(() => {
    document.querySelectorAll('.note').forEach(note => {
      const ts = new Date(note.dataset.timestamp);
      if (note._refs && note._refs.timestampEl) {
        note._refs.timestampEl.textContent = formatTimestamp(ts);
      }
    });
  }, 60 * 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(console.log('Service Worker Registered'))
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    });
  }
});