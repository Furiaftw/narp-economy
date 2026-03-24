// ═══════════════════════════════════════════════════════
//  auth.js — Netlify Identity integration
// ═══════════════════════════════════════════════════════

let _user = null;

// Admin email whitelist (fallback when Netlify Identity roles are not set)
window.NARP_ADMINS = ['grisales4000@gmail.com'];

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
  const adminNavMobileItems = document.querySelectorAll('.admin-nav-mobile');
  const adminSidebar   = document.getElementById('admin-sidebar');
  const adminBanner    = document.getElementById('admin-banner');

  if (userEl)    userEl.textContent       = _user ? (_user.email||'').split('@')[0] : '';
  if (loginBtn)  loginBtn.style.display   = isLoggedIn() ? 'none' : 'inline-flex';
  if (logoutBtn) logoutBtn.style.display  = isLoggedIn() ? 'inline-flex' : 'none';
  adminNavMobileItems.forEach(el => el.style.display = isAdmin() ? '' : 'none');
  if (adminSidebar)   adminSidebar.style.display   = isAdmin() ? 'flex' : 'none';
  if (adminBanner) adminBanner.style.display = isAdmin() ? 'flex' : 'none';

  // Toggle body class for sidebar content offset (desktop only)
  if (isAdmin()) {
    document.body.classList.add('has-admin-sidebar');
  } else {
    document.body.classList.remove('has-admin-sidebar');
  }

  // Update scroll hint visibility for admin sidebar
  if (adminSidebar && isAdmin()) {
    requestAnimationFrame(() => {
      const nav = document.getElementById('admin-sidebar-nav');
      const hint = document.getElementById('admin-scroll-hint');
      if (nav && hint) {
        hint.style.display = nav.scrollHeight > nav.clientHeight ? 'flex' : 'none';
      }
    });
  }
}

export { initAuth, isLoggedIn, isAdmin, getCurrentUser, login, logout, requireAdmin, updateNavAuth };
