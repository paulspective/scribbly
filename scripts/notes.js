export class NotesManager {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('scribbly_data')) || [];
        this.cleanupTrash();
    }
    save() {
        localStorage.setItem('scribbly_data', JSON.stringify(this.notes));
    }
    cleanupTrash() {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialLength = this.notes.length;
        
        this.notes = this.notes.filter(n => {
            if (!n.deleted) return true;
            if (!n.deletedAt) return true;
            return (now - n.deletedAt) < sevenDaysInMs;
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
    getNotes(isDeleted, search = '', tab = 'today', viewedMonth = null) {
        const now = new Date();
        const hasSearch = search.trim().length > 0;
        return this.notes
            .filter(n => {
                if (n.deleted !== isDeleted) return false;
                const matchesSearch = n.title.toLowerCase().includes(search) || n.body.toLowerCase().includes(search);
                if (!matchesSearch) return false;

                if (isDeleted) return true;
                if (hasSearch) return true;

                const noteDate = new Date(n.timestamp);
                const isToday = noteDate.toDateString() === now.toDateString();
                const diffTime = Math.abs(now - noteDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                if (tab === 'today') {
                    return isToday;
                } else if (tab === 'week') {
                    return diffDays <= 7;
                } else if (tab === 'month') {
                    const target = viewedMonth || { month: now.getMonth(), year: now.getFullYear() };
                    return noteDate.getMonth() === target.month && noteDate.getFullYear() === target.year;
                }
                return true;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    getMonthBounds() {
        const active = this.notes.filter(n => !n.deleted);
        if (active.length === 0) return null;
        let earliest = null;
        let latest = null;
        active.forEach(n => {
            const d = new Date(n.timestamp);
            const key = d.getFullYear() * 12 + d.getMonth();
            if (earliest === null || key < earliest.key) earliest = { key, month: d.getMonth(), year: d.getFullYear() };
            if (latest === null || key > latest.key) latest = { key, month: d.getMonth(), year: d.getFullYear() };
        });
        return { earliest, latest };
    }
}