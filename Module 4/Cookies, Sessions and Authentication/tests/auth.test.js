const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { cookieOptions } = require('../src/config/cookie');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function login(email = 'sam@example.com', password = 'SessionDemo!48') {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

function cookieFrom(response) {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'login should set a cookie');
  return setCookie.split(';', 1)[0];
}

test('login creates a signed opaque cookie and returns only safe user fields', async () => {
  const response = await login(' SAM@EXAMPLE.COM ', 'SessionDemo!48');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { id: 1, name: 'Sam', email: 'sam@example.com' },
  });

  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /^sid=s%3A[^;]+/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /Max-Age=/i);
  assert.doesNotMatch(setCookie, /Secure/i, 'local HTTP configuration should not require Secure');
});

test('production cookie configuration always enables Secure', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousCookieSecure = process.env.COOKIE_SECURE;
  process.env.NODE_ENV = 'production';
  process.env.COOKIE_SECURE = 'false';
  try {
    assert.equal(cookieOptions().secure, true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousCookieSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = previousCookieSecure;
  }
});

test('unknown email and wrong password have the same generic 401 response', async () => {
  const unknown = await login('missing@example.com', 'SessionDemo!48');
  const wrongPassword = await login('sam@example.com', 'not-the-password');
  assert.equal(unknown.status, 401);
  assert.equal(wrongPassword.status, 401);
  const unknownBody = await unknown.json();
  const wrongPasswordBody = await wrongPassword.json();
  assert.deepEqual(unknownBody, wrongPasswordBody);
  assert.deepEqual(unknownBody, {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
  assert.equal(unknown.headers.get('set-cookie'), null);
});

test('malformed credentials are rejected and missing or tampered cookies are unauthorized', async () => {
  const invalidBody = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'x' }),
  });
  assert.equal(invalidBody.status, 400);

  const missing = await fetch(`${baseUrl}/auth/me`);
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), {
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });

  const loggedIn = await login();
  const originalCookie = cookieFrom(loggedIn);
  const tamperedCookie = originalCookie.replace(/.$/, originalCookie.endsWith('a') ? 'b' : 'a');
  const tampered = await fetch(`${baseUrl}/auth/me`, { headers: { cookie: tamperedCookie } });
  assert.equal(tampered.status, 401);
});

test('a valid session resolves safe identity, and logout revokes and clears it idempotently', async () => {
  const loggedIn = await login();
  const cookie = cookieFrom(loggedIn);
  const me = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), {
    data: { id: 1, name: 'Sam', email: 'sam@example.com' },
  });

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
  assert.match(logout.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(logout.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.match(logout.headers.get('set-cookie'), /Path=\//i);

  const replay = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
  assert.equal(replay.status, 401);

  const repeatedLogout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(repeatedLogout.status, 204);
});

test('expired server-side sessions are removed and cannot be resolved', async () => {
  const sessionStore = require('../src/session/sessionStore');
  const previousTtl = process.env.SESSION_TTL_MS;
  process.env.SESSION_TTL_MS = '1';
  try {
    const session = sessionStore.create(987654);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(sessionStore.get(session.id), null);
  } finally {
    if (previousTtl === undefined) delete process.env.SESSION_TTL_MS;
    else process.env.SESSION_TTL_MS = previousTtl;
  }
});
