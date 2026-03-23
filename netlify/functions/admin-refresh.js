// netlify/functions/admin-refresh.js
// ─────────────────────────────────────────────────────
//  ADMIN endpoint — requires valid Netlify Identity JWT.
//  Fetches latest AW data from Apps Script web app,
//  updates the history blob, clears public data cache.
//
//  APPS_SCRIPT_URL must be set in Netlify environment variables.
// ─────────────────────────────────────────────────────

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify admin
  const user = event.context?.clientContext?.user;
  if (!user || !user.email) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (adminEmails.length > 0 && !adminEmails.includes(user.email.toLowerCase())) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'APPS_SCRIPT_URL not configured in Netlify env vars' }) };
  }

  try {
    // Fetch from Apps Script
    const res = await fetch(`${appsScriptUrl}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}`);
    const sheetData = await res.json();
    if (sheetData.error) throw new Error(sheetData.error);

    // Build history entries from sheet data
    const store = getStore('economy');
    const existing = await store.get('history', { type: 'json' }).catch(() => []);
    const newHistory = sheetData.history || [];

    // Merge: keep existing entries, add any new dates from sheet
    const existingDates = new Set((existing || []).map(h => h.date));
    const merged = [...(existing || [])];
    newHistory.forEach(entry => {
      if (!existingDates.has(entry.date)) merged.push(entry);
    });
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

    await store.setJSON('history', merged);

    // If sheet has updated tiers/config, sync those too
    if (sheetData.config) {
      const existingConfig = await store.get('config', { type: 'json' }).catch(() => null);
      if (!existingConfig) {
        await store.setJSON('config', sheetData.config);
      }
    }

    const latest = merged.length > 0 ? merged[merged.length - 1] : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        rows_added:   newHistory.filter(e => !existingDates.has(e.date)).length,
        total_rows:   merged.length,
        latest_aw:    latest?.final_aw || 0,
        latest_date:  latest?.date || null,
        refreshed_at: new Date().toISOString(),
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
