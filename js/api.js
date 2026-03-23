// ═══════════════════════════════════════════════════════
//  api.js — Data fetching layer
//
//  PUBLIC data comes from /api/data (Netlify Function)
//  which reads from Netlify Blobs.
//
//  Admin writes go to /api/admin/save
//  Admin refresh goes to /api/admin/refresh
//
//  localStorage cache: 1 hour TTL for public visitors.
//  Admins use forceRefresh() to bypass cache.
// ═══════════════════════════════════════════════════════

const CACHE_KEY = 'narp_economy_v2';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── PUBLIC FETCH ──────────────────────────────────────

async function fetchAPI(forceRefreshFlag = false) {
  if (!forceRefreshFlag) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) return parsed.data;
      }
    } catch (e) {}
  }

  try {
    const res  = await fetch('/api/data?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch (e) {}
    return data;
  } catch (err) {
    // Stale cache fallback
    try {
      const stale = localStorage.getItem(CACHE_KEY);
      if (stale) return JSON.parse(stale).data;
    } catch (e) {}
    throw err;
  }
}

async function forceRefresh() {
  try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  return fetchAPI(true);
}

// ── ADMIN WRITES ──────────────────────────────────────
// key: 'config' | 'shop' | 'incomes' | 'history'

async function adminSave(key, data) {
  const token = await getIdentityToken();
  const res   = await fetch('/api/admin/save', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body:    JSON.stringify({ key, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Save failed');
  }
  try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  return res.json();
}

async function adminRefreshAW() {
  const token = await getIdentityToken();
  const res   = await fetch('/api/admin/refresh', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body:    '{}',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Refresh failed');
  }
  try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  return res.json();
}

async function getIdentityToken() {
  if (typeof netlifyIdentity === 'undefined') throw new Error('Netlify Identity not loaded');
  const user = netlifyIdentity.currentUser();
  if (!user) throw new Error('Not logged in');
  const token = await user.jwt();
  return token;
}

// ── ECONOMY CALCULATIONS ──────────────────────────────

function calcAW(data)          { return data?.meta?.current_aw || 0; }
function calcDial(data)        { return data?.meta?.master_dial || 0.005; }
function calcBaseReward(data)  { return calcAW(data) * calcDial(data); }

function calcItemPrice(tierGRP, data) {
  return Math.round(tierGRP * calcDial(data) * calcAW(data));
}
function calcGRPToRyo(grp, data) {
  return Math.round(grp * calcDial(data) * calcAW(data));
}
function calcEffort(priceRyo, data) {
  const base = calcBaseReward(data);
  return base > 0 ? Math.round(priceRyo / base) : 0;
}
function calcDialStatus(dial) {
  if (dial === 0.005)  return { label: '✅ Standard',      cls: 'status-standard' };
  if (dial < 0.003)    return { label: '🔵🔵 Very Slow',   cls: 'status-slow'     };
  if (dial < 0.005)    return { label: '🔵 Slowed Down',   cls: 'status-slow'     };
  if (dial >= 0.010)   return { label: '🔴 High Stimulus', cls: 'status-stimulus' };
  return                      { label: '🟠 Accelerated',   cls: 'status-accel'    };
}
function calcEconomyStatus(pct) {
  if (pct > 0.15)  return { label: '⚠️ High Inflation', cls: 'status-inflate' };
  if (pct > 0.05)  return { label: '📈 Mild Inflation',  cls: 'status-mild'    };
  if (pct < -0.05) return { label: '📉 Deflation',       cls: 'status-deflate' };
  return                  { label: '✅ Stable',           cls: 'status-stable'  };
}
function calcGiniStatus(gini) {
  if (gini < 0.20) return { label: 'Very Equal',          cls: 'status-stable'  };
  if (gini < 0.35) return { label: 'Moderate Inequality', cls: 'status-mild'    };
  if (gini < 0.50) return { label: 'High Inequality',     cls: 'status-accel'   };
  return                  { label: '🐋 Extreme — Whale',  cls: 'status-inflate' };
}
function calcGini(data) {
  return Math.min((data?.meta?.inequality_cv || 0) / Math.sqrt(2), 1);
}
function calcPurchasingPower(incomeGRP, tierGRP) {
  return Math.ceil(tierGRP / incomeGRP);
}
function getTiers(data) {
  if (data?.tiers?.length > 0) return data.tiers;
  return [
    { name:'Lowest Cost',grp:2 },{ name:'Base Cost',grp:4 },
    { name:'Standard',grp:16 },  { name:'Premium',grp:40 },
    { name:'Luxury',grp:90 },    { name:'Deluxe',grp:150 },
    { name:'Epic',grp:250 },     { name:'Legendary',grp:500 },
    { name:'Mythical',grp:1000 },{ name:'Exclusive',grp:2000 },
  ];
}
function tierCSSClass(n) {
  return 'tier-' + (n||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z-]/g,'');
}

// ── FORMATTING ────────────────────────────────────────
function fmtRyo(n)  { return '¥' + Math.round(n).toLocaleString(); }
function fmtGRP(n)  { return Math.round(n).toLocaleString() + ' GRP'; }
function fmtPct(n)  { return (n>=0?'+':'')+(n*100).toFixed(1)+'%'; }
function fmtNum(n)  { return Number(n).toLocaleString(); }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

export {
  fetchAPI, forceRefresh, adminSave, adminRefreshAW,
  calcAW, calcDial, calcBaseReward, calcItemPrice,
  calcGRPToRyo, calcEffort, calcDialStatus,
  calcEconomyStatus, calcGiniStatus, calcGini,
  calcPurchasingPower, getTiers, tierCSSClass,
  fmtRyo, fmtGRP, fmtPct, fmtNum, fmtDate,
};
