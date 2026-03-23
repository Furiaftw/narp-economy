// netlify/functions/admin-refresh.js
// ─────────────────────────────────────────────────────
//  RETIRED — Google Sheet sync is no longer used.
//  Economy history is now entered directly via admin/history.html
//  and stored in Netlify Blobs.
// ─────────────────────────────────────────────────────

exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Sheet sync retired. Use admin/history.html to enter data directly.' })
});
