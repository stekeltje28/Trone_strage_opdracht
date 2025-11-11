import { AUTH_ENDPOINTS, STORAGE_KEYS } from './config.js';
import { storage, ui } from './core.js';

function parseError(res, payload, fallback) {
  const detail = payload?.detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload === 'string') return payload;
  return `${fallback} (${res?.status ?? '??'})`;
}

async function readPayload(res) {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const payload = await readPayload(res);
  return { res, payload };
}

export class Auth {
  constructor() {
    this._accessToken = storage.get(STORAGE_KEYS.accessToken) || null;
    this._refreshToken = storage.get(STORAGE_KEYS.refreshToken) || null;
    this._user = storage.get(STORAGE_KEYS.user) || null;
    this._refreshInFlight = null;
    this._isLoggingOut = false;
    this._logoutNonce = 0;
  }

  get accessToken() { return this._accessToken; }
  get refreshToken() { return this._refreshToken; }
  get isAuthenticated() { return !!this._accessToken; }
  get user() { return this._user; }

  _saveSession({ accessToken, refreshToken, user } = {}) {
    if (accessToken !== undefined) {
      this._accessToken = accessToken || null;
      if (accessToken) storage.set(STORAGE_KEYS.accessToken, accessToken);
      else storage.remove(STORAGE_KEYS.accessToken);
    }
    if (refreshToken !== undefined) {
      this._refreshToken = refreshToken || null;
      if (refreshToken) storage.set(STORAGE_KEYS.refreshToken, refreshToken);
      else storage.remove(STORAGE_KEYS.refreshToken);
    }
    if (user !== undefined) {
      this._user = user || null;
      if (user) storage.set(STORAGE_KEYS.user, user);
      else storage.remove(STORAGE_KEYS.user);
    }
  }

  _normalizeAuthResponse(payload) {
    if (!payload) return {};
    if (typeof payload === 'string') {
      return { accessToken: payload, refreshToken: this._refreshToken ?? null, user: this._user ?? null };
    }
    const accessToken = payload.access_token ?? payload.accessToken ?? payload.token ?? null;
    const refreshToken = payload.refresh_token ?? payload.refreshToken ?? null;
    const user = payload.user ?? payload.profile ?? null;
    return { accessToken, refreshToken, user };
  }

  async register({ username, password }) {
    const { res, payload } = await fetchJson(AUTH_ENDPOINTS.register, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(parseError(res, payload, 'Registratie mislukt'));
    const norm = this._normalizeAuthResponse(payload);
    if (norm.accessToken || norm.refreshToken || norm.user) this._saveSession(norm);
    return payload ?? { ok: true };
  }

  async login({ username, password, asJson = true }) {
    if (asJson) {
      const { res, payload } = await fetchJson(AUTH_ENDPOINTS.loginJson, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const norm = this._normalizeAuthResponse(payload);
        if (!norm.accessToken && typeof payload === 'string') norm.accessToken = payload;
        this._saveSession(norm);
        try { await this.fetchMe(); } catch {}
        return this._user;
      }
      if ([404, 415, 501, 405].includes(res.status)) {
        return this.login({ username, password, asJson: false });
      }
      throw new Error(parseError(res, payload, 'Login mislukt'));
    } else {
      const form = new URLSearchParams();
      form.set('username', username);
      form.set('password', password);
      const { res, payload } = await fetchJson(AUTH_ENDPOINTS.loginForm, {
        method: 'POST',
        body: form
      });
      if (!res.ok) throw new Error(parseError(res, payload, 'Login mislukt'));
      const norm = this._normalizeAuthResponse(payload);
      if (!norm.accessToken && typeof payload === 'string') norm.accessToken = payload;
      this._saveSession(norm);
      try { await this.fetchMe(); } catch {}
      return this._user;
    }
  }

  async refresh() {
    if (this._refreshInFlight) return this._refreshInFlight;
    if (!this._refreshToken) throw new Error('Geen refresh token');
    const myNonce = this._logoutNonce;
    this._refreshInFlight = (async () => {
      const { res, payload } = await fetchJson(AUTH_ENDPOINTS.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refresh_token: this._refreshToken })
      });
      this._refreshInFlight = null;
      if (this._isLoggingOut || myNonce !== this._logoutNonce) throw new Error('Refresh genegeerd door logout');
      if (!res.ok) {
        await this.logout({ server: false, silent: true });
        throw new Error(parseError(res, payload, 'Refresh mislukt'));
      }
      const norm = this._normalizeAuthResponse(payload);
      if (!norm.accessToken) throw new Error('Geen access token bij refresh');
      this._saveSession(norm);
      return this._accessToken;
    })();
    return this._refreshInFlight;
  }

  async fetchMe() {
    if (!this._accessToken) throw new Error('Niet ingelogd');
    const { res, payload } = await fetchJson(AUTH_ENDPOINTS.me, {
      headers: { Authorization: `Bearer ${this._accessToken}`, Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(parseError(res, payload, 'Me ophalen mislukt'));
    this._saveSession({ user: payload });
    return payload;
  }

  async logout({ server = true, silent = false, redirectTo } = {}) {
    this._isLoggingOut = true;
    this._logoutNonce++;
    this._refreshInFlight = null;
    this._saveSession({ accessToken: null, refreshToken: null, user: null });
    try {
      localStorage.removeItem('ps_access_token');
      localStorage.removeItem('ps_refresh_token');
      localStorage.removeItem('ps_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('ps_access_token');
      sessionStorage.removeItem('ps_refresh_token');
      localStorage.setItem('ps_logout_broadcast', String(Date.now()));
    } catch {}
    if (server) {
      try {
        const refresh = this._refreshToken;
        await fetch(AUTH_ENDPOINTS.logout, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: refresh ? JSON.stringify({ refresh_token: refresh }) : null
        });
      } catch {}
    }
    if (!silent) ui.toast('Je bent uitgelogd', 'info');
    if (redirectTo) window.location.replace(redirectTo);
    this._isLoggingOut = false;
  }

  requireAuth({ redirectTo = '/pages/login.html' } = {}) {
    if (this.isAuthenticated) return true;
    const here = (location.pathname || '') + (location.search || '') + (location.hash || '');
    const onLogin = here.startsWith(redirectTo);
    if (!onLogin) {
      const next = encodeURIComponent(here || '/pages/home.html');
      window.location.replace(`${redirectTo}?next=${next}`);
    }
    return false;
  }
}

export const auth = new Auth();
