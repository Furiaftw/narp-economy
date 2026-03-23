// ═══════════════════════════════════════════════════════
//  auth.js — Netlify Identity integration
// ═══════════════════════════════════════════════════════

let _user = null;

function initAuth(onReady) {
  if (typeof netlifyIdentity === 'undefined') {
    if (onReady) onReady(null);
    return;
  }
  netlifyIdentity.on('init',   u => { _user = u; updateNavAuth(); if (onReady) onReady(u); });
  netlifyIdentity.on('login',  u => { _user = u; updateNavAuth(); netlifyIdentity.close(); });
  netlifyIdentity.on('logout', () => { _user = null; updateNavAuth(); });
  netlifyIdentity.init();
}

function isLoggedIn()  { return !!_user; }
function getCurrentUser() { return _user; }

function isAdmin() {
  if (!_user) return false;
  // Check Netlify roles
  const roles = _user.app_metadata?.roles || [];
  if (roles.includes('admin')) return true;
  // Fallback: check NARP_ADMINS window variable if set
  const list = window.NARP_ADMINS || [];
  return list.includes((_user.email || '').toLowerCase());
}

function login()  { if (typeof netlifyIdentity !== 'undefined') netlifyIdentity.open('login'); }
function logout() { if (typeof netlifyIdentity !== 'undefined') netlifyIdentity.logout(); }

function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  if (!isAdmin()) {
    window.location.href = '/unauthorized.html';
    return false;
  }
  return true;
}

function updateNavAuth() {
  const userEl    = document.getElementById('nav-user');
  const loginBtn  = document.getElementById('btn-login');
  const logoutBtn = document.getElementById('btn-logout');
  const adminNav  = document.getElementById('admin-nav');
  const adminBanner = document.getElementById('admin-banner');

  if (userEl)    userEl.textContent       = _user ? (_user.email||'').split('@')[0] : '';
  if (loginBtn)  loginBtn.style.display   = isLoggedIn() ? 'none' : 'inline-flex';
  if (logoutBtn) logoutBtn.style.display  = isLoggedIn() ? 'inline-flex' : 'none';
  if (adminNav)  adminNav.style.display   = isAdmin() ? 'contents' : 'none';
  if (adminBanner) adminBanner.style.display = isAdmin() ? 'flex' : 'none';
}

export { initAuth, isLoggedIn, isAdmin, getCurrentUser, login, logout, requireAdmin, updateNavAuth };
