import { apiUrl } from './config.js';

function readToken() {
  const raw = localStorage.getItem('ps_access_token');
  if (!raw || raw === 'null' || raw === '""') return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function jsonHeaders(init = {}) {
  const h = new Headers(init.headers || {});
  if (!h.has('Accept')) h.set('Accept', 'application/json');
  const hasBody = init.body != null;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (hasBody && !isFormData && !h.has('Content-Type')) h.set('Content-Type', 'application/json');
  const t = readToken();
  if (t) h.set('Authorization', `Bearer ${t}`);
  return { ...init, headers: h };
}

async function run(path, init = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(apiUrl(path), { ...init, signal: controller.signal });
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!res.ok) {
      const msg =
        (data && data.message) ||
        (Array.isArray(data?.detail) && data.detail[0]?.msg) ||
        (typeof data === 'string' ? data : `Request faalde (${res.status})`);
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  get: (path) => run(path, jsonHeaders({ method: 'GET' })),
  post: (path, body) => run(path, jsonHeaders({ method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) })),
  patch: (path, body) => run(path, jsonHeaders({ method: 'PATCH', body: JSON.stringify(body) })),
  del: (path) => run(path, jsonHeaders({ method: 'DELETE' }))
};
