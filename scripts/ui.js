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
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 50);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    shiftMonth(delta) {
        let m = this.viewedMonth.month + delta;
        let y = this.viewedMonth.year;
        if (m < 0) { m = 11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        this.viewedMonth = { month: m, year: y };
    }
    updateMonthNav(notesFound) {
        const header = document.querySelector('.notes-header-bar');
        const dateNav = document.querySelector('.date-nav');
        const prevBtn = document.getElementById('month-prev');
        const nextBtn = document.getElementById('month-next');
        const label = document.getElementById('current-month-display');

        header.classList.toggle('hidden', this.view === 'trash');

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
            card.classList.remove('is-entering');

            requestAnimationFrame(() => {
                card.classList.add('is-removing');
            });
            setTimeout(resolve, 400);
        });
    }
    createCardElement(note, { animate = false, delay = 0 } = {}) {
        const card = document.createElement('div');
        card.className = animate ? 'note-card is-entering' : 'note-card';
        card.style.backgroundColor = note.color;
        if (animate) {
            card.style.animationDelay = `${delay}ms`;
        }
        card.dataset.id = note.id;

        const actionIcon = this.view === 'trash' ? 'fluent:arrow-undo-24-regular' : 'fluent:delete-24-regular';
        const syncBadge = note.syncError
            ? `<iconify-icon class="sync-error-icon" icon="fluent:cloud-off-24-filled" title="Couldn't sync to your account yet. We'll keep retrying."></iconify-icon>`
            : '';

        card.innerHTML = `
            <div class="note-date">${note.date}</div>
            <div class="note-title" title="${escHtml(note.title)}">${escHtml(note.title)}</div>
            <div class="note-body">${escHtml(note.body)}</div>
            <div class="note-footer">
                ${syncBadge}
                <iconify-icon icon="fluent:clock-24-regular"></iconify-icon> ${note.time}
            </div>
            <button class="note-actions action-btn" data-id="${note.id}">
                <iconify-icon icon="${actionIcon}"></iconify-icon>
            </button>
        `;
        return card;
    }

    placeNewNoteTrigger() {
        const existing = this.grid.querySelector('#trigger-new-note');
        if (this.view !== 'active') {
            if (existing) existing.remove();
            return;
        }
        if (existing) {
            this.grid.appendChild(existing);
            return;
        }
        const newCard = document.createElement('div');
        newCard.className = 'new-note-card';
        newCard.id = 'trigger-new-note';
        newCard.innerHTML = `
            <iconify-icon icon="fluent:document-add-24-regular"></iconify-icon>
            <span>New Note</span>
        `;
        this.grid.appendChild(newCard);
    }
    render(search = '', options = {}) {
        const { animate = true, previousNoteIds = null, smartAnimate = false } = options;
        const notes = this.manager.getNotes(this.view === 'trash', search.toLowerCase(), this.tab, this.viewedMonth);

        this.updateMonthNav(notes.length);

        if (smartAnimate && previousNoteIds && previousNoteIds.length > 0) {
            const newNoteIds = new Set(notes.map(n => n.id));
            const oldNoteIds = new Set(previousNoteIds);

            const cardsToRemove = [];
            this.grid.querySelectorAll('.note-card').forEach(card => {
                const id = card.dataset.id;
                if (!newNoteIds.has(id)) {
                    cardsToRemove.push(card);
                }
            });

            cardsToRemove.forEach(card => {
                card.classList.remove('is-entering');
            });

            requestAnimationFrame(() => {
                cardsToRemove.forEach(card => {
                    card.classList.add('is-removing');
                });
            });

            setTimeout(() => {
                cardsToRemove.forEach(card => card.remove());

                if (notes.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'empty-state';
                    emptyMsg.textContent = this.view === 'trash'
                        ? 'No stray scribbles here. Scribbles vanish after 7 days in the trash.'
                        : 'No scribbles found for this time period.';
                    this.grid.appendChild(emptyMsg);
                    this.placeNewNoteTrigger();
                    return;
                }

                let animIndex = 0;
                notes.forEach(note => {
                    if (!oldNoteIds.has(note.id)) {
                        const card = this.createCardElement(note, {
                            animate: true,
                            delay: Math.min(animIndex * 35, 210),
                        });
                        this.grid.appendChild(card);
                        animIndex++;
                    }
                });

                if (this.view === 'active') {
                    this.placeNewNoteTrigger();
                }
            }, 400);
            return;
        }

        this.grid.innerHTML = '';

        if (notes.length === 0 && this.view === 'trash') {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state trash-empty-state';
            emptyMsg.innerHTML = `
                <iconify-icon icon="fluent:checkmark-circle-24-regular"></iconify-icon>
                <h2>Trash is empty</h2>
                <p>Deleted notes stay here for 7 days before they disappear forever.</p>
                <button type="button" class="trash-empty-action" data-action="view-all">
                    Back to All Notes
                </button>
            `;
            this.grid.appendChild(emptyMsg);
            return;
        }

        if (notes.length === 0 && this.view === 'active') {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.textContent = 'No scribbles found for this time period.';
            this.grid.appendChild(emptyMsg);
        }

        notes.forEach((note, index) => {
            const card = this.createCardElement(note, {
                animate,
                delay: animate ? Math.min(index * 35, 210) : 0,
            });
            this.grid.appendChild(card);
        });

        if (this.view === 'active') {
            this.placeNewNoteTrigger();
        }
    }
}
