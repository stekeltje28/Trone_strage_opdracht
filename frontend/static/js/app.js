import { auth } from '/static/js/auth.js';
import { qs, ui } from '/static/js/core.js';

function updateUserBadge() {
  const elUser = qs('[data-user]');
  if (!elUser) return;
  const u = auth.user;
  const display = u?.name || u?.full_name || u?.username || u?.email || 'Gebruiker';
  elUser.textContent = display;
}

function setupLogoutDelegation() {
  document.addEventListener('click', async (e) => {
    const trigger = e.target.closest?.('[data-logout]');
    if (!trigger) return;
    e.preventDefault();
    if (trigger.getAttribute('aria-disabled') === 'true') return;
    trigger.setAttribute('aria-disabled', 'true');
    trigger.style.pointerEvents = 'none';
    try {
      await auth.logout({ server: true, silent: false, redirectTo: '/pages/login.html' });
      window.location.replace('/pages/login.html');
    } catch {
      window.location.replace('/pages/login.html');
    }
  }, { capture: true });
}

export async function initApp({ protect = false } = {}) {
  if (protect) {
    const ok = auth.requireAuth();
    if (!ok) return;
  }
  if (auth.isAuthenticated && !auth.user) {
    try { await auth.fetchMe(); } catch {}
  }
  updateUserBadge();
  setupLogoutDelegation();
  window.addEventListener('storage', (e) => {
    if (e.key === 'ps_logout_broadcast') {
      window.location.replace('/pages/login.html');
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    ui.toast(e.reason?.message || 'Onbekende fout', 'error');
  });
}
