const crypto = require('node:crypto');
const { getSessionTtlMs } = require('../config/cookie');

const sessions = new Map();

function removeExpiredSessions(now = Date.now()) {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
}

function create(userId) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TypeError('A valid user ID is required to create a session');
  }

  const now = Date.now();
  removeExpiredSessions(now);

  let id;
  do {
    id = crypto.randomBytes(32).toString('hex');
  } while (sessions.has(id));

  const session = { userId, expiresAt: now + getSessionTtlMs() };
  sessions.set(id, session);
  return { id, ...session };
}

function get(id) {
  if (typeof id !== 'string' || id.length === 0) return null;
  const session = sessions.get(id);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }

  return { ...session };
}

function destroy(id) {
  if (typeof id !== 'string' || id.length === 0) return false;
  return sessions.delete(id);
}

module.exports = { create, get, destroy };
