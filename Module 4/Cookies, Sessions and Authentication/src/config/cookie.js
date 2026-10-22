const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;

function getSessionTtlMs() {
  const configured = process.env.SESSION_TTL_MS;
  const ttlMs = configured === undefined ? DEFAULT_SESSION_TTL_MS : Number(configured);
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('SESSION_TTL_MS must be a positive integer');
  }
  return ttlMs;
}

function cookieOptions({ clearing = false } = {}) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    signed: true,
    path: '/',
  };

  if (!clearing) options.maxAge = getSessionTtlMs();
  return options;
}

module.exports = { cookieOptions, getSessionTtlMs };
