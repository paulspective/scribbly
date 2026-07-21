document.addEventListener('DOMContentLoaded', () => {
    const manager = new NotesManager();
    const ui = new UI(manager);
    
    const modal = document.getElementById('note-modal');
    const searchInput = document.getElementById('search-input');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburgerBtn = document.getElementById('hamburger-btn');

    ui.render();

    const toggleSidebar = (show) => {
        if (show) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    };

    hamburgerBtn.addEventListener('click', () => toggleSidebar(true));
    overlay.addEventListener('click', () => toggleSidebar(false));

    const openModal = (note = null) => {
        if (note) {
            ui.editingId = note.id;
            document.getElementById('note-title').value = note.title;
            document.getElementById('note-body').value = note.body;
            ui.color = note.color;
        } else {
            ui.editingId = null;
            document.getElementById('note-title').value = '';
            document.getElementById('note-body').value = '';
            ui.color = '#eada76';
        }
        document.querySelectorAll('.dot').forEach(d => {
            d.classList.toggle('selected', d.dataset.color === ui.color);
        });
        modal.style.display = 'flex';
    };

    document.getElementById('btn-add-note').addEventListener('click', () => {
        openModal();
        toggleSidebar(false);
    });
    
    document.getElementById('close-modal').addEventListener('click', () => modal.style.display = 'none');
    
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('selected'));
            e.target.classList.add('selected');
            ui.color = e.target.dataset.color;
        });
    });

    document.getElementById('save-note-btn').addEventListener('click', () => {
        const title = document.getElementById('note-title').value;
        const body = document.getElementById('note-body').value;
        if (title || body) {
            if (ui.editingId) {
                manager.updateNote(ui.editingId, title, body, ui.color);
            } else {
                manager.addNote(title, body, ui.color);
            }
            modal.style.display = 'none';
            ui.render(searchInput.value);
        }
    });

    document.getElementById('notes-grid').addEventListener('click', (e) => {
        if (e.target.closest('#trigger-new-note')) {
            openModal();
            return;
        }
        
        const btn = e.target.closest('.action-btn');
        if (btn) {
            e.stopPropagation();
            manager.deleteNote(btn.dataset.id);
            ui.render(searchInput.value);
            return;
        }

        const card = e.target.closest('.note-card');
        if (card && ui.view === 'active') {
            const note = manager.getNote(card.dataset.id);
            if (note) openModal(note);
        }
    });

    document.querySelectorAll('.tab').forEach(tabEl => {
        tabEl.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            ui.tab = e.target.dataset.tab;
            ui.render(searchInput.value);
        });
    });

    document.getElementById('nav-all').addEventListener('click', (e) => {
        ui.view = 'active';
        document.getElementById('nav-all').classList.add('active');
        document.getElementById('nav-trash').classList.remove('active');
        toggleSidebar(false);
        ui.render(searchInput.value);
    });

    document.getElementById('nav-trash').addEventListener('click', (e) => {
        ui.view = 'trash';
        document.getElementById('nav-trash').classList.add('active');
        document.getElementById('nav-all').classList.remove('active');
        toggleSidebar(false);
        ui.render(searchInput.value);
    });

    searchInput.addEventListener('input', (e) => ui.render(e.target.value));
});