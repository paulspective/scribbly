import { request } from './auth.js';
export class NotesManager {
    editorPlaceholder = [
        'Start scribbling...',
        'Dear future me...',
        "This one won't self-destruct",
        "Today's multi-dollar idea?",
        'Write before you forget...',
        'Brain dump goes here...'
    ];

    constructor() {
        this.isAuthenticated = false;
        this.userId = null;
        this.serverHydrated = false;
        this.localMigrationDone = localStorage.getItem('scribbly_migration_done') === 'true';

        const lastSession = JSON.parse(localStorage.getItem('scribbly_last_session') || 'null');

        if (lastSession) {
            this.notes = this.loadAuthedNotesCache(lastSession.userId) || [];
        } else {
            this.loadLocalNotes();
        }

        this.cleanupTrash();
        this.pendingCache = JSON.parse(localStorage.getItem('scribbly_pending_cache') || '[]');

        window.addEventListener('online', () => this.flushPendingSync());
    }

    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    loadLocalNotes() {
        const stored = localStorage.getItem('scribbly_data');

        if (stored === null) {
            this.notes = [];
            this.seedWelcomeNote();
        } else {
            this.notes = JSON.parse(stored) || [];
        }
    }

    normalizeNote(note) {
        const timestamp = typeof note.timestamp === 'number'
            ? note.timestamp
            : new Date(note.timestamp ?? Date.now()).getTime();

        return {
            ...note,
            id: note.id ?? note._id?.toString() ?? '',
            title: note.title ?? '',
            body: note.body ?? '',
            color: note.color ?? '#eada76',
            date: note.date ?? '',
            time: note.time ?? '',
            timestamp,
            deleted: Boolean(note.deleted),
            deletedAt: note.deletedAt ? new Date(note.deletedAt).getTime() : null,
            pendingSync: false,
            pendingOp: undefined,
            syncError: false,
        };
    }

    setEditorPlaceholder(editorEl) {
        if (!editorEl || typeof HTMLTextAreaElement === 'undefined' || !(editorEl instanceof HTMLTextAreaElement)) {
            return;
        }

        editorEl.placeholder = this.random(this.editorPlaceholder);
    }

    seedWelcomeNote() {
        this.addNote(
            'This note self-destructs...',
            "...it doesn't.\nbut it'd be really cool if it did.\nwelcome to Scribbly!",
            '#eada76'
        );
    }

    save() {
        if (this.isAuthenticated) {
            this.savePendingCache();
            this.saveAuthedNotesCache();
            return;
        }

        localStorage.setItem('scribbly_data', JSON.stringify(this.notes));
    }

    savePendingCache() {
        const pending = this.notes.filter((note) => note.pendingSync || note.syncError);
        if (pending.length > 0) {
            localStorage.setItem('scribbly_pending_cache', JSON.stringify(pending));
        } else {
            localStorage.removeItem('scribbly_pending_cache');
        }
    }

    saveAuthedNotesCache() {
        if (!this.userId) {
            return;
        }
        localStorage.setItem(`scribbly_notes_cache_${this.userId}`, JSON.stringify(this.notes));
    }

    loadAuthedNotesCache(userId) {
        const cached = localStorage.getItem(`scribbly_notes_cache_${userId}`);
        return cached ? JSON.parse(cached) : null;
    }

    async setAuthContext(isAuthenticated, userId = null) {
        const changed = this.isAuthenticated !== isAuthenticated || this.userId !== userId;
        this.isAuthenticated = isAuthenticated;
        this.userId = userId;

        if (!isAuthenticated) {
            this.serverHydrated = false;
            this.save();
            return;
        }

        if (changed || !this.serverHydrated) {
            await this.syncWithServer();

            if (this.pendingCache.length > 0) {
                this.pendingCache.forEach((pendingNote) => {
                    this.notes = [pendingNote, ...this.notes.filter((entry) => entry.id !== pendingNote.id)];
                });
                this.pendingCache = [];
            }

            await this.flushPendingSync();
        }
    }

    async syncWithServer() {
        if (!this.isAuthenticated) {
            return;
        }

        try {
            const result = await request('/notes');
            if (!result.ok) {
                if (result.status === 401) {
                    this.isAuthenticated = false;
                    this.serverHydrated = false;
                    return;
                }

                const cached = this.loadAuthedNotesCache(this.userId);
                if (cached) {
                    this.notes = cached;
                }
                return;
            }

            const serverNotes = (result.data.notes || []).map((note) => this.normalizeNote(note));
            if (serverNotes.length > 0) {
                this.notes = serverNotes;
                this.serverHydrated = true;
                this.save();
                return;
            }

            const localSnapshot = this.notes.map((note) => ({ ...note }));
            if (localSnapshot.length > 0 && !this.localMigrationDone) {
                await this.uploadLocalNotes(localSnapshot);
                this.notes = localSnapshot;
                this.serverHydrated = true;
                this.save();
                return;
            }

            this.notes = [];
            this.serverHydrated = true;
            this.save();
        } catch (error) {
            console.error('Failed to sync notes with the server', error);
            const cached = this.loadAuthedNotesCache(this.userId);
            if (cached) {
                this.notes = cached;
            }
        }
    }

    async uploadLocalNotes(notes) {
        if (!this.isAuthenticated || this.localMigrationDone) {
            return;
        }

        for (const note of notes) {
            const payload = {
                ...note,
                id: note.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            };

            await request('/notes', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }

        this.localMigrationDone = true;
        localStorage.setItem('scribbly_migration_done', 'true');
    }

    cleanupTrash() {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialLength = this.notes.length;

        this.notes = this.notes.filter((note) => {
            if (!note.deleted) return true;
            if (!note.deletedAt) return true;
            return (now - note.deletedAt) < sevenDaysInMs;
        });

        if (this.notes.length !== initialLength) {
            this.save();
        }
    }

    async addNote(title, body, color) {
        const dateObj = new Date();
        const newNote = {
            id: Date.now().toString(),
            title,
            body,
            color,
            date: dateObj.toLocaleDateString('en-GB'),
            time: `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}`,
            timestamp: dateObj.getTime(),
            deleted: false,
            deletedAt: null
        };

        if (this.isAuthenticated) {
            const result = await request('/notes', {
                method: 'POST',
                body: JSON.stringify(newNote),
            });

            if (!result.ok) {
                this.markSyncFailure(newNote, 'create', result);
                this.notes.push(newNote);
                this.save();
                return newNote;
            }

            const serverNote = this.normalizeNote(result.data.note || result.data);
            this.notes = [serverNote, ...this.notes.filter((entry) => entry.id !== serverNote.id)];
            this.serverHydrated = true;
            this.save();
            return serverNote;
        }

        this.notes.push(newNote);
        this.save();
        return newNote;
    }

    async updateNote(id, title, body, color) {
        const note = this.notes.find((entry) => entry.id === id);
        if (!note) {
            return null;
        }

        const dateObj = new Date();
        const updatedNote = {
            ...note,
            title,
            body,
            color,
            date: dateObj.toLocaleDateString('en-GB'),
            time: `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}`,
            timestamp: dateObj.getTime(),
        };

        if (this.isAuthenticated) {
            const result = await request(`/notes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedNote),
            });

            if (!result.ok) {
                this.markSyncFailure(updatedNote, 'update', result);
                this.notes = this.notes.map((entry) => entry.id === id ? updatedNote : entry);
                this.save();
                return updatedNote;
            }

            const serverNote = this.normalizeNote(result.data.note || result.data);
            this.notes = this.notes.map((entry) => entry.id === id ? serverNote : entry);
            this.serverHydrated = true;
            this.save();
            return serverNote;
        }

        note.title = title;
        note.body = body;
        note.color = color;
        note.date = dateObj.toLocaleDateString('en-GB');
        note.time = `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}`;
        note.timestamp = dateObj.getTime();
        this.save();
        return note;
    }

    async deleteNote(id) {
        const note = this.notes.find((entry) => entry.id === id);
        if (!note) {
            return null;
        }

        if (this.isAuthenticated && note.pendingOp === 'create' && note.pendingSync) {
            this.notes = this.notes.filter((entry) => entry.id !== id);
            this.save();
            return null;
        }

        const nextDeleted = !note.deleted;
        const nextDeletedAt = nextDeleted ? Date.now() : null;

        if (this.isAuthenticated) {
            const result = await request(`/notes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ deleted: nextDeleted, deletedAt: nextDeletedAt }),
            });

            if (!result.ok) {
                const updatedNote = { ...note, deleted: nextDeleted, deletedAt: nextDeletedAt };
                this.markSyncFailure(updatedNote, 'delete', result);
                this.notes = this.notes.map((entry) => entry.id === id ? updatedNote : entry);
                this.save();
                return updatedNote;
            }

            const serverNote = this.normalizeNote(result.data.note || result.data);
            this.notes = this.notes.map((entry) => entry.id === id ? serverNote : entry);
            this.serverHydrated = true;
            this.save();
            return serverNote;
        }

        note.deleted = nextDeleted;
        note.deletedAt = nextDeletedAt;
        this.save();
        return note;
    }

    markSyncFailure(note, op, result) {
        note.pendingOp = note.pendingOp === 'create' ? 'create' : op;
        note.syncAttempts = (note.syncAttempts || 0) + 1;
        note.pendingSync = note.syncAttempts < 5;
        note.syncError = true;
    }

    async flushPendingSync() {
        if (this.isFlushingSync) {
            return;
        }
        if (!this.isAuthenticated || typeof navigator !== 'undefined' && navigator.onLine === false) {
            return;
        }

        this.isFlushingSync = true;
        try {
            const pending = this.notes.filter((note) => note.pendingSync);

            for (const note of pending) {
                let result;
                const { pendingSync: _p, pendingOp: _o, syncError: _s, ...payload } = note;

                if (note.pendingOp === 'delete') {
                    result = await request(`/notes/${note.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ deleted: note.deleted, deletedAt: note.deletedAt }),
                    });
                } else if (note.pendingOp === 'update') {
                    result = await request(`/notes/${note.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload),
                    });
                } else {
                    result = await request('/notes', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                }

                if (result.ok) {
                    const serverNote = this.normalizeNote(result.data.note || result.data);
                    this.notes = this.notes.map((entry) => entry.id === note.id ? serverNote : entry);
                } else if (result.status !== 0) {
                    this.markSyncFailure(note, note.pendingOp, result);
                    this.notes = this.notes.map((entry) => entry.id === note.id ? note : entry);
                }
            }

            this.serverHydrated = true;
            this.save();
        } finally {
            this.isFlushingSync = false;
        }
    }

    getNote(id) {
        return this.notes.find((entry) => entry.id === id);
    }

    getNotes(isDeleted, search = '', tab = 'today', viewedMonth = null) {
        const now = new Date();
        const hasSearch = search.trim().length > 0;

        return this.notes
            .filter((note) => {
                if (note.deleted !== isDeleted) return false;

                const matchesSearch = note.title.toLowerCase().includes(search) || note.body.toLowerCase().includes(search);
                if (!matchesSearch) return false;

                if (isDeleted) return true;
                if (hasSearch) return true;

                const noteDate = new Date(note.timestamp);
                const isToday = noteDate.toDateString() === now.toDateString();
                const diffTime = Math.abs(now - noteDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                if (tab === 'today') {
                    return isToday;
                }

                if (tab === 'week') {
                    return diffDays <= 7;
                }

                if (tab === 'month') {
                    const target = viewedMonth || { month: now.getMonth(), year: now.getFullYear() };
                    return noteDate.getMonth() === target.month && noteDate.getFullYear() === target.year;
                }

                return true;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    getMonthBounds() {
        const active = this.notes.filter((note) => !note.deleted);
        if (active.length === 0) return null;

        let earliest = null;
        let latest = null;

        active.forEach((note) => {
            const date = new Date(note.timestamp);
            const key = date.getFullYear() * 12 + date.getMonth();

            if (earliest === null || key < earliest.key) {
                earliest = { key, month: date.getMonth(), year: date.getFullYear() };
            }

            if (latest === null || key > latest.key) {
                latest = { key, month: date.getMonth(), year: date.getFullYear() };
            }
        });

        return { earliest, latest };
    }
}