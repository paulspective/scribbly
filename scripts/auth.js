export const API_BASE_URL = 'https://scribbly-server.onrender.com';

export async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Network error — check your connection' } };
  }
}

export function signup(email, password) {
  return request('/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function login(email, password) {
  return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function checkSession() {
  return request('/me');
}