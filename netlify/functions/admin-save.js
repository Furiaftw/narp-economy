// netlify/functions/admin-save.js
// ─────────────────────────────────────────────────────
//  ADMIN endpoint — requires valid Netlify Identity JWT.
//  Writes economy data to Netlify Blobs.
//
//  Body: { key: 'config'|'shop'|'incomes'|'history', data: {...} }
//
//  Admin emails stored in environment variable ADMIN_EMAILS
//  as a comma-separated list: "email1@gmail.com,email2@gmail.com"
// ─────────────────────────────────────────────────────

const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = { 'Content-Type': 'application/json' };

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify admin identity via Netlify Identity context
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  // Check email against ADMIN_EMAILS environment variable
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0 && !adminEmails.includes(user.email.toLowerCase())) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { key, data } = payload;
  const allowedKeys = ['config', 'shop', 'incomes', 'history', 'auctions'];
  if (!allowedKeys.includes(key)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid key: ' + key }) };
  }

  try {
    connectLambda(event);
    const store = getStore('economy');
    await store.setJSON(key, data);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, key, saved_at: new Date().toISOString() }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
