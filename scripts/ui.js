export class UI {
    constructor(manager) {
        this.manager = manager;
        this.grid = document.getElementById('notes-grid');
        this.view = 'active';
        this.tab = 'today';
        this.color = '#eada76';
        this.editingId = null;
    }
    render(search = '') {
        this.grid.innerHTML = '';
        const notes = this.manager.getNotes(this.view === 'trash', search.toLowerCase(), this.tab);
        
        if (notes.length > 0) {
            const latestDate = new Date(notes[0].timestamp);
            document.getElementById('current-month-display').textContent = latestDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            document.getElementById('current-month-display').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        if (notes.length === 0 && this.view === 'trash') {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.textContent = 'No stray scribbles here. Scribbles vanish after 30 days in the trash.';
            this.grid.appendChild(emptyMsg);
            return;
        }

        if (notes.length === 0 && this.view === 'active') {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.textContent = 'No scribbles found for this time period.';
            this.grid.appendChild(emptyMsg);
        }
        
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.style.backgroundColor = note.color;
            card.dataset.id = note.id;
            
            const actionIcon = this.view === 'trash' ? 'fluent:arrow-undo-24-regular' : 'fluent:delete-24-regular';
            
            card.innerHTML = `
                <div class="note-date">${note.date}</div>
                <div class="note-title">${note.title}</div>
                <div class="note-body">${note.body}</div>
                <div class="note-footer">
                    <iconify-icon icon="fluent:clock-24-regular"></iconify-icon> ${note.time}
                </div>
                <button class="note-actions action-btn" data-id="${note.id}">
                    <iconify-icon icon="${actionIcon}"></iconify-icon>
                </button>
            `;
            this.grid.appendChild(card);
        });

        if (this.view === 'active') {
            const newCard = document.createElement('div');
            newCard.className = 'new-note-card';
            newCard.id = 'trigger-new-note';
            newCard.innerHTML = `
                <iconify-icon icon="fluent:document-add-24-regular"></iconify-icon>
                <span>New Note</span>
            `;
            this.grid.appendChild(newCard);
        }
    }
}