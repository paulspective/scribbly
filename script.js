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
        const ta = note.querySelector('.note-editor');
        note.querySelector('.note-preview').innerHTML = marked.parse(ta.value);
      });
      emptyEl.style.display = notes.length ? 'none' : 'block';
      emptyEl.textContent = 'No notes yet — click + to create one.';
      return;
    }

    // Filter notes by search term
    notes.forEach(note => {
      const ta = note.querySelector('.note-editor');
      const text = ta.value;
      if (text.toLowerCase().includes(term)) {
        note.style.display = '';
        const html = marked.parse(text);
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        note.querySelector('.note-preview').innerHTML = html.replace(regex, '<mark>$1</mark>');
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

  // Initial notes load  
  loadNotes();

  // Load existing notes
  function saveNotes() {
    const notes = [...document.querySelectorAll('.note-editor')].map(text => text.value);
    localStorage.setItem('scribblyNotes', JSON.stringify(notes));
  }

  // Update empty state
  function updateEmptyState() {
    const visibleNotes = Array.from(notesEl.children).filter(note => note.style.display !== 'none');
    emptyEl.style.display = visibleNotes.length ? 'none' : 'block';
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  // Create a new note
  function createNote(content = '', isNew = true) {
    const note = document.createElement('div');
    note.className = 'note';

    const toolbar = document.createElement('div');
    toolbar.className = 'note-toolbar';
    toolbar.innerHTML = `
      <span class="material-symbols-outlined edit-btn" title="Edit note">edit</span>
      <span class="material-symbols-outlined delete-btn" title="Delete note">delete</span>
    `;

    const ta = document.createElement('textarea');
    ta.className = 'note-editor';
    ta.placeholder = 'Write something...';
    ta.value = content;

    const preview = document.createElement('div');
    preview.className = 'note-preview';
    preview.innerHTML = marked.parse(content);

    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      preview.innerHTML = marked.parse(ta.value);
      saveNotes();
    });

    toolbar.addEventListener('click', e => {
      if (e.target.classList.contains('edit-btn')) {
        note.classList.toggle('editing');
        if (note.classList.contains('editing')) {
          ta.focus();
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
        }
      }
      if (e.target.classList.contains('delete-btn')) {
        note.remove();
        updateEmptyState();
        saveNotes();
      }
    });

    note.appendChild(toolbar);
    note.appendChild(ta);
    note.appendChild(preview);
    notesEl.insertBefore(note, notesEl.firstChild);

    if (isNew) {
      note.classList.add('editing');
      ta.focus();
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
        const ta = note.querySelector('.note-editor');
        const text = ta.value.trim();
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

  function loadNotes() {
    const stored = JSON.parse(localStorage.getItem('scribblyNotes') || '[]');
    stored.forEach(text => createNote(text, false));
  }
});