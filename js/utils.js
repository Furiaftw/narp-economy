// ═══════════════════════════════════════════════════════
//  utils.js — Shared UI components
// ═══════════════════════════════════════════════════════

import { login, logout, isAdmin } from './auth.js';

// ── NAV ───────────────────────────────────────────────

function renderNav(activePage) {
  const publicPages = [
    { href: '/index.html',  label: 'Shop',   key: 'shop'   },
    { href: '/income.html', label: 'Income', key: 'income' },
  ];

  const adminPages = [
    { href: '/admin/history.html',    label: 'Weekly Update', key: 'history'   },
    { href: '/admin/dashboard.html',  label: 'Dashboard',  key: 'dashboard'  },
    { href: '/admin/shop.html',       label: 'Manage Shop', key: 'mgshop'    },
    { href: '/admin/economy.html',    label: 'Economy',    key: 'economy'    },
    { href: '/admin/commands.html',   label: 'Commands',   key: 'commands'   },
    { href: '/admin/purchasing.html', label: 'Pwr Table',  key: 'purchasing' },
    { href: '/admin/inflation.html',  label: 'Inflation',  key: 'inflation'  },
    { href: '/admin/gini.html',       label: 'Gini',       key: 'gini'       },
  ];

  return `
<nav class="nav">
  <div class="nav-inner">
    <a href="/index.html" class="nav-logo">NARP <span>Economy</span></a>
    <ul class="nav-links">
      ${publicPages.map(p =>
        `<li><a href="${p.href}" class="${p.key===activePage?'active':''}">${p.label}</a></li>`
      ).join('')}
      <span id="admin-nav" style="display:none;contents">
        ${adminPages.map(p =>
          `<li><a href="${p.href}" class="admin-link ${p.key===activePage?'active':''}">${p.label}</a></li>`
        ).join('')}
      </span>
    </ul>
    <div class="nav-auth" id="nav-auth">
      <span class="nav-user" id="nav-user"></span>
      <button class="btn btn-ghost" id="btn-login"  onclick="window._narpLogin()">Sign In</button>
      <button class="btn btn-danger" id="btn-logout" style="display:none" onclick="window._narpLogout()">Sign Out</button>
    </div>
  </div>
</nav>
<div class="admin-banner" id="admin-banner" style="display:none">
  🔒 Admin Panel — Restricted Access
</div>`;
}

// ── SHARED COMPONENTS ─────────────────────────────────

function renderLoading(msg) {
  return `<div class="loading-seal"><div class="spinner"></div><p>${msg||'Loading...'}</p></div>`;
}

function renderError(msg) {
  return `<div class="error-state">
    <h3>Something went wrong</h3>
    <p>${msg||'Could not load data.'}</p>
    <button class="btn btn-ghost" style="margin-top:1rem" onclick="location.reload()">Retry</button>
  </div>`;
}

function sectionHeader(title) {
  return `<div class="section-header">
    <span class="section-title">${title}</span>
    <div class="section-line"></div>
  </div>`;
}

function tierBadge(tierName) {
  if (!tierName) return '';
  const cls = 'tier-' + tierName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z-]/g,'');
  return `<span class="tier-badge ${cls}">${tierName}</span>`;
}

function statCard(label, value, sub, statusHtml, classes) {
  return `<div class="card ${classes||''} fade-in">
    <div class="card-label">${label}</div>
    <div class="card-value">${value}</div>
    ${sub?`<div class="card-sub">${sub}</div>`:''}
    ${statusHtml||''}
  </div>`;
}

function matrixClass(n) {
  if (n<=1)   return 'm-green';
  if (n<=5)   return 'm-yellow';
  if (n<=20)  return 'm-orange';
  if (n<=100) return 'm-salmon';
  return 'm-red';
}

// ── COPY ──────────────────────────────────────────────

function copyText(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const hint = el?.querySelector?.('.copy-hint');
    if (el) el.classList.add('copied');
    if (hint) hint.textContent = 'Copied!';
    setTimeout(() => {
      if (el) el.classList.remove('copied');
      if (hint) hint.textContent = 'Copy';
    }, 1800);
  });
}

function attachGlobalHandlers(loginFn, logoutFn) {
  window._narpLogin  = loginFn;
  window._narpLogout = logoutFn;
}

export {
  renderNav, renderLoading, renderError,
  sectionHeader, tierBadge, statCard,
  matrixClass, copyText, attachGlobalHandlers,
};
