import { NotesManager } from './notes.js';
import { UI } from './ui.js';
import { signup, login, checkSession } from './auth.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            console.log('Service worker registered:', registration);
        }).catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const manager = new NotesManager();
    const ui = new UI(manager);

    const modal = document.getElementById('note-modal');
    const searchInput = document.getElementById('search-input');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const noteTitleInput = document.getElementById('note-title');
    const noteBodyInput = document.getElementById('note-body');

    ui.render();

    const themeColorMeta = document.getElementById('theme-color-meta');
    const syncThemeColor = () => {
        themeColorMeta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
    };
    syncThemeColor();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);

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
            noteTitleInput.value = note.title;
            noteBodyInput.value = note.body;
            ui.color = note.color;
        } else {
            ui.editingId = null;
            noteTitleInput.value = '';
            noteBodyInput.value = '';
            ui.color = '#eada76';
        }

        manager.setEditorPlaceholder(noteBodyInput);

        document.querySelectorAll('.dot').forEach((dot) => {
            dot.classList.toggle('selected', dot.dataset.color === ui.color);
        });

        modal.classList.add('active');
    };

    document.getElementById('btn-add-note').addEventListener('click', () => {
        openModal();
        toggleSidebar(false);
    });

    document.getElementById('fab-add-note').addEventListener('click', () => {
        openModal();
        toggleSidebar(false);
    });

    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('active'));

    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('selected'));
            e.target.classList.add('selected');
            ui.color = e.target.dataset.color;
        });
    });

    document.getElementById('save-note-btn').addEventListener('click', async () => {
        const title = noteTitleInput.value;
        const body = noteBodyInput.value;

        if (title || body) {
            if (ui.editingId) {
                await manager.updateNote(ui.editingId, title, body, ui.color);
            } else {
                await manager.addNote(title, body, ui.color);
            }

            modal.classList.remove('active');
            ui.render(searchInput.value);
        }
    });

    document.getElementById('month-prev').addEventListener('click', (e) => {
        if (e.target.classList.contains('hidden')) return;
        ui.shiftMonth(-1);
        ui.render(searchInput.value);
    });

    document.getElementById('month-next').addEventListener('click', (e) => {
        if (e.target.classList.contains('hidden')) return;
        ui.shiftMonth(1);
        ui.render(searchInput.value);
    });

    document.getElementById('notes-grid').addEventListener('click', async (e) => {
        if (e.target.closest('#trigger-new-note')) {
            openModal();
            return;
        }

        const btn = e.target.closest('.action-btn');
        if (btn) {
            e.stopPropagation();
            const id = btn.dataset.id;
            await ui.animateRemoval(id);
            await manager.deleteNote(id);
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

    // --- Auth ---
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchMsg = document.getElementById('auth-switch-msg');
    const authSwitchLink = document.getElementById('auth-switch-link');
    const authGuestLink = document.getElementById('auth-guest-link');
    const navAccountLabel = document.getElementById('nav-account-label');
    const togglePasswordBtn = document.getElementById('toggle-auth-password');

    const GUEST_KEY = 'scribbly_guest_dismissed';
    let authMode = 'login';

    const openAuthModal = () => {
        authError.textContent = '';
        authForm.reset();
        authModal.classList.add('active');
    };

    const closeAuthModal = () => authModal.classList.remove('active');

    const setAuthMode = (mode) => {
        authMode = mode;
        document.querySelectorAll('.auth-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.authTab === mode);
        });
        authError.textContent = '';

        if (mode === 'login') {
            authSubmitBtn.textContent = 'Log in';
            authPasswordInput.autocomplete = 'current-password';
            authSwitchMsg.textContent = "Don't have an account?";
            authSwitchLink.textContent = 'Sign up';
        } else {
            authSubmitBtn.textContent = 'Sign up';
            authPasswordInput.autocomplete = 'new-password';
            authSwitchMsg.textContent = 'Already have an account?';
            authSwitchLink.textContent = 'Log in';
        }
    };

    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => setAuthMode(tab.dataset.authTab));
    });

    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(authMode === 'login' ? 'signup' : 'login');
    });

    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = authPasswordInput.type === 'password';
        authPasswordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
    });

    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);

    document.getElementById('nav-account').addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(false);
        openAuthModal();
    });

    authGuestLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem(GUEST_KEY, 'true');
        closeAuthModal();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        authSubmitBtn.disabled = true;

        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;
        const action = authMode === 'login' ? login : signup;
        const result = await action(email, password);

        authSubmitBtn.disabled = false;

        if (!result.ok) {
            authError.textContent = result.data.error || 'Something went wrong';
            return;
        }

        if (authMode === 'signup') {
            const loginResult = await login(email, password);
            if (!loginResult.ok) {
                authError.textContent = 'Account created — please log in';
                setAuthMode('login');
                return;
            }
        }

        localStorage.removeItem(GUEST_KEY);

        const username = email.split('@')[0];

        navAccountLabel.textContent = username.length > 10 ? username.slice(0, 10) + '...' : username;
        await manager.setAuthContext(true, result.data?.userId || null);
        ui.render(searchInput.value);
        closeAuthModal();
    });
    checkSession().then(async (result) => {
        if (result.ok) {
            navAccountLabel.textContent = result.data.email;
            localStorage.removeItem(GUEST_KEY);
            await manager.setAuthContext(true, result.data.userId);
            ui.render(searchInput.value);
        } else if (!localStorage.getItem(GUEST_KEY)) {
            await manager.setAuthContext(false);
            openAuthModal();
        }
    }).catch(async () => {
        await manager.setAuthContext(false);
        if (!localStorage.getItem(GUEST_KEY)) {
            openAuthModal();
        }
    });
});