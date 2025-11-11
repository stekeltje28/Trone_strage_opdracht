export const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); },
  clearKeys(keys) { keys.forEach(k => localStorage.removeItem(k)); }
};

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

export async function toJSON(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export const ui = {
  toast(msg, type = 'info') {
    console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${msg}`);
  }
};
