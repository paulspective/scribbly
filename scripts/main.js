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

    localStorage.setItem('scribbly_last_tab', localStorage.getItem('scribbly_last_tab') || 'today');
    ui.tab = localStorage.getItem('scribbly_last_tab');
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

    const tabIndicator = document.getElementById('tab-indicator');
    const moveTabIndicator = (tabEl) => {
        if (!tabEl) return;
        tabIndicator.style.width = `${tabEl.offsetWidth}px`;
        tabIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
    };

    const savedTabEl = document.querySelector(`.tab[data-tab="${ui.tab}"]`);
    const currentActiveTab = document.querySelector('.tab.active');
    if (currentActiveTab && currentActiveTab !== savedTabEl) {
        currentActiveTab.classList.remove('active');
    }
    if (savedTabEl) {
        savedTabEl.classList.add('active');
    }
    moveTabIndicator(savedTabEl);

    window.addEventListener('resize', () => moveTabIndicator(document.querySelector(`[data-tab="${ui.tab}"]`)));

    document.querySelectorAll('.tab').forEach(tabEl => {
        tabEl.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            moveTabIndicator(e.target);
            ui.tab = e.target.dataset.tab;
            localStorage.setItem('scribbly_last_tab', ui.tab);
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
    const ACCOUNT_LABEL_KEY = 'scribbly_account_label';
    let authMode = 'login';

    const formatAccountLabel = (email) => {
        const username = String(email || '').split('@')[0] || 'Account';
        return username.length > 10 ? username.slice(0, 10) + '...' : username;
    };

    const setAccountLabel = (value) => {
        const label = formatAccountLabel(value);
        navAccountLabel.textContent = label;
        localStorage.setItem(ACCOUNT_LABEL_KEY, label);
    };

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

    const storedAccountLabel = localStorage.getItem(ACCOUNT_LABEL_KEY);
    if (storedAccountLabel) {
        navAccountLabel.textContent = storedAccountLabel;
    }

    document.getElementById('nav-account').addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(false);

        if (manager.isAuthenticated) {
            return;
        }

        openAuthModal();
    });

    authGuestLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem(GUEST_KEY, 'true');
        navAccountLabel.textContent = 'Guest';
        localStorage.setItem(ACCOUNT_LABEL_KEY, 'Guest');
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

        setAccountLabel(email);
        const loggedInUserId = result.data?.userId || null;
        rememberLastSession(loggedInUserId, email);
        await manager.setAuthContext(true, loggedInUserId);
        ui.render(searchInput.value);
        closeAuthModal();
    });

    const LAST_SESSION_KEY = 'scribbly_last_session';
    const rememberLastSession = (userId, email) => {
        localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ userId, email }));
    };
    const forgetLastSession = () => localStorage.removeItem(LAST_SESSION_KEY);

    checkSession().then(async (result) => {
        if (result.ok) {
            setAccountLabel(result.data.email);
            localStorage.removeItem(GUEST_KEY);
            rememberLastSession(result.data.userId, result.data.email);
            await manager.setAuthContext(true, result.data.userId);
            ui.render(searchInput.value);
            return;
        }

        if (result.status === 0) {
            const lastSession = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) || 'null');
            if (lastSession) {
                setAccountLabel(lastSession.email);
                await manager.setAuthContext(true, lastSession.userId);
                ui.render(searchInput.value);
                return;
            }
        }

        forgetLastSession();
        if (!localStorage.getItem(GUEST_KEY)) {
            await manager.setAuthContext(false);
            openAuthModal();
        }
    }).catch(async () => {
        const lastSession = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) || 'null');
        if (lastSession) {
            setAccountLabel(lastSession.email);
            await manager.setAuthContext(true, lastSession.userId);
            ui.render(searchInput.value);
            return;
        }
        await manager.setAuthContext(false);
        if (!localStorage.getItem(GUEST_KEY)) {
            openAuthModal();
        }
    });
});