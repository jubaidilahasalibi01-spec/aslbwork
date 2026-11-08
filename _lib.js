const admin = require('firebase-admin');

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) throw new Error('Missing environment variable: ' + name);
  return String(value).trim();
}
function paypalMode() {
  const mode = required('PAYPAL_ENV').toLowerCase();
  if (mode !== 'live' && mode !== 'sandbox') throw new Error('PAYPAL_ENV must be exactly "live" or "sandbox".');
  return mode;
}
if (!admin.apps.length) {
  const raw = required('FIREBASE_SERVICE_ACCOUNT');
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch (_) { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain the full Firebase service-account JSON.'); }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing project_id, client_email, or private_key.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: required('FIREBASE_DB_URL')
  });
}
const base = () => paypalMode() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function readJson(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : {}; } catch (_) { return { message: raw.slice(0, 300) }; }
}
async function pp(path, method, body) {
  const clientId = required('PAYPAL_CLIENT_ID');
  const secret = required('PAYPAL_SECRET');
  const host = base();
  const tokenResponse = await fetch(host + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const token = await readJson(tokenResponse);
  if (!tokenResponse.ok || !token.access_token) {
    const detail = token.error_description || token.error || ('HTTP ' + tokenResponse.status);
    throw new Error('PayPal OAuth failed: ' + String(detail).slice(0, 180));
  }
  const response = await fetch(host + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token.access_token,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'aslb-' + require('crypto').randomUUID()
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await readJson(response);
  if (!response.ok) {
    const detail = data.message || data.name || (data.details && data.details[0] && data.details[0].description) || ('HTTP ' + response.status);
    throw new Error('PayPal API ' + response.status + ': ' + String(detail).slice(0, 180));
  }
  return data;
}
function parsePrice(v) {
  let s = String(v == null ? '' : v).replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = (/,\d{1,2}$/.test(s) && s.split(',').length === 2) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (ld > -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 && n < 1e7 ? Math.round(n * 100) / 100 : 0;
}
async function findProject(title) {
  const value = (await admin.database().ref('profile/projects').get()).val();
  const list = Array.isArray(value) ? value : Object.values(value || {});
  return list.find(item => item && String(item.t) === title) || null;
}
module.exports = { admin, pp, parsePrice, findProject };
