// Ultra-simple toast; koppelbaar aan ui.toast in core.js
export function mountToast() {
  let box = document.querySelector('#toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    box.style.position = 'fixed';
    box.style.right = '1rem';
    box.style.bottom = '1rem';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '.5rem';
    box.style.zIndex = '9999';
    document.body.appendChild(box);
  }
  return box;
}
export function toast(message, type = 'info') {
  const box = mountToast();
  const el = document.createElement('div');
  el.textContent = message;
  el.style.padding = '.75rem 1rem';
  el.style.borderRadius = '.5rem';
  el.style.background = type === 'error' ? '#fee2e2' : (type === 'success' ? '#dcfce7' : '#e5e7eb');
  el.style.border = '1px solid rgba(0,0,0,.1)';
  el.style.fontSize = '.9rem';
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
