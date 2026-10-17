const COOKIE = 'aec_private_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_CATALOGUE_BYTES = 1_500_000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
}
function b64url(bytes) {
  let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
async function makeSession(user, secret) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ sub: user, exp: Math.floor(Date.now()/1000) + SESSION_SECONDS })));
  return payload + '.' + b64url(await hmac(secret, payload));
}
async function readSession(request, secret) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(COOKIE.length + 1));
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = await hmac(secret, payload);
  let actual; try { actual = fromB64url(signature); } catch { return null; }
  if (actual.length !== expected.length) return null;
  let diff = 0; for (let i=0;i<actual.length;i++) diff |= actual[i] ^ expected[i];
  if (diff) return null;
  try { const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))); if (!['owner','partner'].includes(data.sub) || data.exp < Math.floor(Date.now()/1000)) return null; return data.sub; } catch { return null; }
}
function cookie(value, maxAge = SESSION_SECONDS) { return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
function validOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
function normaliseProducts(value) {
  if (!Array.isArray(value) || value.length > 5000) throw new Error('Catalogue must be a list of no more than 5,000 products.');
  const seen = new Set();
  return value.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Product ${i+1} is invalid.`);
    const id = String(raw.id ?? '').trim();
    const name = String(raw.name ?? '').trim();
    const price = Number(raw.price);
    if (!id || id.length > 200 || seen.has(id)) throw new Error(`Product ${i+1} needs a unique product ID.`);
    if (!name || name.length > 200) throw new Error(`Product ${i+1} needs a name of 1–200 characters.`);
    if (!Number.isFinite(price) || price < 0 || price > 10000000) throw new Error(`${name}: price must be £0 or more and within the allowed range.`);
    seen.add(id);
    const image = String(raw.image ?? '');
    if (image.length > 900000) throw new Error(`${name}: image is too large for this shared catalogue. Use a smaller image or an image URL.`);
    if (image && !/^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(image)) throw new Error(`${name}: image must be an image URL or supported image file.`);
    return { id, name, category: String(raw.category || 'Other').slice(0,100), price: Math.round(price*100)/100, description: String(raw.description || '').slice(0,5000), tag: String(raw.tag || '').slice(0,100), image, art: Number.isInteger(raw.art) ? raw.art : i % 6 };
  });
}
async function login(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Math.floor(Date.now()/1000);
  const row = await env.DB.prepare('SELECT attempts, window_started FROM login_attempts WHERE ip_key = ?').bind(ip).first();
  if (row && now - row.window_started < 900 && row.attempts >= 8) return json({ error: 'Too many attempts. Wait 15 minutes before trying again.' }, 429);
  let body; try { body = await request.json(); } catch { return json({ error: 'Enter your sign-in details.' }, 400); }
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const allowed = username === 'owner' ? env.AEC_OWNER_PASSWORD : username === 'partner' ? env.AEC_PARTNER_PASSWORD : null;
  let accepted = false;
  if (allowed && password.length <= 500) {
    const a = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(allowed));
    const aa = new Uint8Array(a), bb = new Uint8Array(b); let diff = 0; for (let i=0;i<aa.length;i++) diff |= aa[i] ^ bb[i]; accepted = diff === 0;
  }
  if (!accepted) {
    if (row && now - row.window_started < 900) await env.DB.prepare('UPDATE login_attempts SET attempts = attempts + 1 WHERE ip_key = ?').bind(ip).run();
    else await env.DB.prepare('INSERT INTO login_attempts (ip_key, attempts, window_started) VALUES (?, 1, ?) ON CONFLICT(ip_key) DO UPDATE SET attempts=1, window_started=excluded.window_started').bind(ip, now).run();
    return json({ error: 'Those sign-in details were not recognised.' }, 401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_key = ?').bind(ip).run();
  const token = await makeSession(username, env.AEC_SESSION_SECRET);
  return json({ ok: true, user: username }, 200, { 'set-cookie': cookie(token), 'cache-control': 'no-store' });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!validOrigin(request)) return json({ error: 'Request origin not allowed.' }, 403);
      if (request.method === 'POST' && url.pathname === '/api/login') return login(request, env);
      if (request.method === 'POST' && url.pathname === '/api/logout') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
      const user = await readSession(request, env.AEC_SESSION_SECRET || '');
      if (!user) return json({ error: 'Please sign in to the private workspace.' }, 401);
      if (request.method === 'GET' && url.pathname === '/api/session') return json({ ok: true, user });
      if (url.pathname === '/api/catalogue' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT payload, updated_at, updated_by FROM catalogue WHERE id = 1').first();
        let products = []; if (row) { try { products = JSON.parse(row.payload); } catch { return json({ error: 'Saved catalogue could not be read.' }, 500); } }
        return json({ products, updatedAt: row?.updated_at || null, updatedBy: row?.updated_by || null, user });
      }
      if (url.pathname === '/api/catalogue' && request.method === 'PUT') {
        let body; try { body = await request.json(); } catch { return json({ error: 'Catalogue update was not valid JSON.' }, 400); }
        const current = await env.DB.prepare('SELECT updated_at FROM catalogue WHERE id = 1').first();
        const expected = body.expectedUpdatedAt ?? null;
        if ((current?.updated_at || null) !== expected) return json({ error: 'The catalogue changed on another computer since you opened it. Refresh the catalogue before saving so nobody’s updates are overwritten.', conflict: true }, 409);
        let products; try { products = normaliseProducts(body.products); } catch (e) { return json({ error: e.message }, 400); }
        const payload = JSON.stringify(products);
        if (new TextEncoder().encode(payload).length > MAX_CATALOGUE_BYTES) return json({ error: 'The shared catalogue is too large. Reduce image sizes or use image URLs, then save again.' }, 413);
        const updatedAt = new Date().toISOString();
        let write;
        if (current?.updated_at) {
          write = await env.DB.prepare('UPDATE catalogue SET payload = ?, updated_at = ?, updated_by = ? WHERE id = 1 AND updated_at = ?').bind(payload, updatedAt, user, expected).run();
        } else {
          write = await env.DB.prepare('INSERT OR IGNORE INTO catalogue (id, payload, updated_at, updated_by) VALUES (1, ?, ?, ?)').bind(payload, updatedAt, user).run();
        }
        if (!write?.meta || write.meta.changes !== 1) return json({ error: 'The catalogue was just changed by another user. Refresh before saving to avoid overwriting their work.', conflict: true }, 409);
        return json({ ok: true, count: products.length, updatedAt, updatedBy: user });
      }
      return json({ error: 'API route not found.' }, 404);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
  }
};
