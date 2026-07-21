function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class UI {
    constructor(manager) {
        this.manager = manager;
        this.grid = document.getElementById('notes-grid');
        this.view = 'active';
        this.tab = 'today';
        this.color = '#eada76';
        this.editingId = null;
        const now = new Date();
        this.viewedMonth = { month: now.getMonth(), year: now.getFullYear() };
    }
    monthKey(m, y) {
        return y * 12 + m;
    }
    shiftMonth(delta) {
        let m = this.viewedMonth.month + delta;
        let y = this.viewedMonth.year;
        if (m < 0) { m = 11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        this.viewedMonth = { month: m, year: y };
    }
    updateMonthNav(notesFound) {
        const dateNav = document.querySelector('.date-nav');
        const prevBtn = document.getElementById('month-prev');
        const nextBtn = document.getElementById('month-next');
        const label = document.getElementById('current-month-display');

        if (this.view === 'trash' || this.tab !== 'month') {
            dateNav.classList.add('hidden');
            return;
        }
        dateNav.classList.remove('hidden');

        label.textContent = new Date(this.viewedMonth.year, this.viewedMonth.month, 1)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const bounds = this.manager.getMonthBounds();
        if (!bounds) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            return;
        }
        const currentKey = this.monthKey(this.viewedMonth.month, this.viewedMonth.year);
        prevBtn.classList.toggle('hidden', currentKey <= bounds.earliest.key);
        nextBtn.classList.toggle('hidden', currentKey >= bounds.latest.key);
    }
    animateRemoval(id) {
        const card = this.grid.querySelector(`.note-card[data-id="${id}"]`);
        if (!card) return Promise.resolve();
        return new Promise(resolve => {
            card.classList.add('is-removing');
            setTimeout(resolve, 400);
        });
    }
    render(search = '') {
        this.grid.innerHTML = '';
        const notes = this.manager.getNotes(this.view === 'trash', search.toLowerCase(), this.tab, this.viewedMonth);

        this.updateMonthNav(notes.length);

        if (notes.length === 0 && this.view === 'trash') {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.textContent = 'No stray scribbles here. Scribbles vanish after 7 days in the trash.';
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
                <div class="note-title">${escHtml(note.title)}</div>
                <div class="note-body">${escHtml(note.body)}</div>
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