// timestamp formatting
function formatTimestamp(date) {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  return `${day} ${month}, ${year}. ${time}`;
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
        note.querySelector('.note-preview').innerHTML = marked.parse(textArea.value);
      });
      emptyEl.style.display = notes.length ? 'none' : 'block';
      emptyEl.textContent = 'No notes yet — click + to create one.';
      return;
    }

    // Filter notes by search term
     notes.forEach(note => {
      const textArea = note.querySelector('.note-editor');
      const text = textArea.value;
      if (text.toLowerCase().includes(term.toLowerCase())) {
        note.style.display = '';
        const html = marked.parse(text);
        const regex = new RegExp(`(<[^>]+>)|(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
        note.querySelector('.note-preview').innerHTML = html.replace(regex, (match, tag, capture) => {
          return tag ? tag : `<mark>${capture}</mark>`;
        });
      } else {
        note.style.display = 'none';
      }
    });

    const visibleNotes = notes.filter(note => note.style.display !== 'none');
    if (visibleNotes.length === 0) {
      emptyEl.style.display = 'block';
      emptyEl.textContent = 'No notes found.';
    } else {
      emptyEl.style.display = 'none';
      updateEmptyState();
    }
  });

  // Save notes to localStorage
  function saveNotes() {
    const notes = [...document.querySelectorAll('.note')].map(note => {
      const text = note.querySelector('.note-editor').value;
      const ts = note.dataset.timestamp || new Date().toISOString();
      return { content: text, timestamp: ts };
    });
    localStorage.setItem('scribblyNotes', JSON.stringify(notes));
  }

  // Update empty state
  function updateEmptyState() {
    const visibleNotes = Array.from(notesEl.children).filter(note => note.style.display !== 'none');
    emptyEl.style.display = visibleNotes.length ? 'none' : 'block';
  }

  // Create a new note
  function createNote(content = '', isNew = true, timestampStr = null) {
    const note = document.createElement('div');
    note.className = 'note';

    const toolbar = document.createElement('div');
    toolbar.className = 'note-toolbar';
    toolbar.innerHTML = `
        <span class="material-symbols-outlined edit-btn" title="Edit note">edit</span>
        <span class="material-symbols-outlined delete-btn" title="Delete note">delete</span>
      `;

    const textArea = document.createElement('textarea');
    textArea.className = 'note-editor';
    textArea.placeholder = 'Write something...';
    textArea.value = content;

    const preview = document.createElement('div');
    preview.className = 'note-preview';
    preview.innerHTML = marked.parse(content);

    const noteTimestamp = timestampStr ? new Date(timestampStr) : new Date();
    note.dataset.timestamp = noteTimestamp.toISOString();

    const timestamp = document.createElement('div');
    timestamp.className = 'note-timestamp';
    timestamp.textContent = 'Last edited: ' + formatTimestamp(noteTimestamp);

    textArea.addEventListener('input', () => {
      textArea.style.height = 'auto';
      textArea.style.height = textArea.scrollHeight + 'px';
      preview.innerHTML = marked.parse(textArea.value);
      const now = new Date();
      note.dataset.timestamp = now.toISOString();
      timestamp.textContent = 'Last edited: ' + formatTimestamp(now);
      saveNotes();
    });

    toolbar.addEventListener('click', e => {
      if (e.target.classList.contains('edit-btn')) {
        note.classList.toggle('editing');
        if (note.classList.contains('editing')) {
          textArea.focus();
        }
      }
      if (e.target.classList.contains('delete-btn')) {
        note.remove();
        updateEmptyState();
        saveNotes();
      }
    });

    note.appendChild(toolbar);
    note.appendChild(textArea);
    note.appendChild(preview);
    note.appendChild(timestamp);
    notesEl.insertBefore(note, notesEl.firstChild);

    if (isNew) {
      note.classList.add('editing');
      textArea.focus();
    }

    updateEmptyState();
    return note;
  }

  // Add note
  addBtn.addEventListener('click', () => createNote(''));

  updateEmptyState();

  notesEl.addEventListener('focusout', e => {
    if (!e.target.classList.contains('note-editor')) return;
    const note = e.target.closest('.note');
    setTimeout(() => {
      if (!note.contains(document.activeElement)) {
        const textArea = note.querySelector('.note-editor');
        const text = textArea.value.trim();
        if (!text) {
          note.remove();
          updateEmptyState();
        } else {
          note.querySelector('.note-preview').innerHTML = marked.parse(text);
          note.classList.remove('editing');
          saveNotes();
        }
      }
    }, 200);
  });

  // Load existing notes and restore their timestamps
  function loadNotes() {
    const stored = JSON.parse(localStorage.getItem('scribblyNotes') || '[]');
    stored.forEach(item => {
      if (typeof item === 'object' && item.content !== undefined && item.timestamp !== undefined) {
        createNote(item.content, false, item.timestamp);
      } else {
        createNote(item, false);
      }
    });
  }

  loadNotes();
});

