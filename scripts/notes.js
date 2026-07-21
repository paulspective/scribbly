class NotesManager {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('scribbly_data')) || [];
        this.cleanupTrash();
    }
    save() {
        localStorage.setItem('scribbly_data', JSON.stringify(this.notes));
    }
    cleanupTrash() {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialLength = this.notes.length;
        
        this.notes = this.notes.filter(n => {
            if (!n.deleted) return true;
            if (!n.deletedAt) return true;
            return (now - n.deletedAt) < thirtyDaysInMs;
        });

        if (this.notes.length !== initialLength) {
            this.save();
        }
    }
    addNote(title, body, color) {
        const dateObj = new Date();
        const newNote = {
            id: Date.now().toString(),
            title,
            body,
            color,
            date: dateObj.toLocaleDateString('en-GB'),
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + dateObj.toLocaleDateString('en-US', {weekday: 'long'}),
            timestamp: dateObj.getTime(),
            deleted: false,
            deletedAt: null
        };
        this.notes.push(newNote);
        this.save();
    }
    updateNote(id, title, body, color) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            const dateObj = new Date();
            note.title = title;
            note.body = body;
            note.color = color;
            note.date = dateObj.toLocaleDateString('en-GB');
            note.time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + dateObj.toLocaleDateString('en-US', {weekday: 'long'});
            note.timestamp = dateObj.getTime();
            this.save();
        }
    }
    deleteNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            note.deleted = !note.deleted;
            note.deletedAt = note.deleted ? Date.now() : null;
            this.save();
        }
    }
    getNote(id) {
        return this.notes.find(n => n.id === id);
    }
    getNotes(isDeleted, search = '', tab = 'today') {
        const now = new Date();
        return this.notes
            .filter(n => {
                if (n.deleted !== isDeleted) return false;
                const matchesSearch = n.title.toLowerCase().includes(search) || n.body.toLowerCase().includes(search);
                if (!matchesSearch) return false;

                if (isDeleted) return true;

                const noteDate = new Date(n.timestamp);
                const isToday = noteDate.toDateString() === now.toDateString();
                const diffTime = Math.abs(now - noteDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                if (tab === 'today') {
                    return isToday;
                } else if (tab === 'week') {
                    return !isToday && diffDays <= 7;
                } else if (tab === 'month') {
                    return noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear();
                }
                return true;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }
}