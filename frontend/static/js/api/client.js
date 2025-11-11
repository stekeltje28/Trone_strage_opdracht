import { API_BASE_URL } from '../config.js';

class ApiError extends Error {
  constructor(status, body, url) {
    super(`API ${status} at ${url}`);
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export const AuthStorage = {
  get access() { try { return localStorage.getItem('access_token'); } catch { return null; } },
  set access(t) { try { t ? localStorage.setItem('access_token', t) : localStorage.removeItem('access_token'); } catch {} },
  get refresh() { try { return localStorage.getItem('refresh_token'); } catch { return null; } },
  set refresh(t) { try { t ? localStorage.setItem('refresh_token', t) : localStorage.removeItem('refresh_token'); } catch {} },
  clear() { this.access = null; this.refresh = null; }
};

async function doFetch(path, { method = 'GET', headers = {}, body = null, retryOn401 = true } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const h = { 'Content-Type': 'application/json', ...headers };
  if (AuthStorage.access) h.Authorization = `Bearer ${AuthStorage.access}`;
  const res = await fetch(url, { method, headers: h, credentials: 'include', body: body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body)) });
  if (res.ok) {
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  }
  if (res.status === 401 && retryNo401(retryOn401)) {
    const ok = await tryRefresh();
    if (ok) return doFetch(path, { method, headers, body, retryOn401: false });
  }
  let payload;
  try { payload = await res.json(); } catch { payload = await res.text(); }
  throw new ApiError(res.status, payload, url);
}

function retryNo401(flag) { return flag !== false; }

export async function tryRefresh() {
  try {
    const payload = AuthStorage.refresh ? { refresh_token: AuthStorage.refresh } : {};
    const out = await doFetch('/api/v1/auth/refresh', { method: 'POST', body: payload, retryOn401: false });
    if (out?.access_token) AuthStorage.access = out.access_token;
    if (typeof out?.refresh_token === 'string') AuthStorage.refresh = out.refresh_token;
    return true;
  } catch {
    AuthStorage.clear();
    return false;
  }
}

export const api = {
  get: (p, o) => doFetch(p, { ...o, method: 'GET' }),
  post: (p, b, o) => doFetch(p, { ...o, method: 'POST', body: b }),
  patch: (p, b, o) => doFetch(p, { ...o, method: 'PATCH', body: b }),
  delete: (p, o) => doFetch(p, { ...o, method: 'DELETE' })
};

export class ApiClientError extends ApiError {}
