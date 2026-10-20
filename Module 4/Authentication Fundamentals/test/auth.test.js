const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/authService');

function memoryRepository() {
  const records = new Map();
  let nextId = 1;
  const calls = { lookups: 0, creates: 0 };
  return {
    calls,
    records,
    async findByEmail(email) {
      calls.lookups += 1;
      return records.get(email) || null;
    },
    async createUser(user) {
      calls.creates += 1;
      if (records.has(user.email)) {
        const error = new Error('unique constraint');
        error.code = 'P2002';
        throw error;
      }
      const record = { id: nextId++, createdAt: new Date(), ...user };
      records.set(record.email, record);
      return record;
    },
  };
}

async function startServer(t, service) {
  const server = createApp({ authService: service }).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function post(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('registration normalizes email, persists a bcrypt hash, and returns only public fields', async t => {
  const users = memoryRepository();
  const service = createAuthService({ users, costFactor: 4 });
  const baseUrl = await startServer(t, service);

  const response = await post(baseUrl, '/auth/register', {
    name: '  Sam Example  ',
    email: '  Sam@Example.com  ',
    password: 'correct horse battery staple',
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name']);
  assert.deepEqual(body, { id: 1, name: 'Sam Example', email: 'sam@example.com' });

  const saved = users.records.get('sam@example.com');
  assert.ok(saved.passwordHash.startsWith('$2'));
  assert.notEqual(saved.passwordHash, 'correct horse battery staple');
  assert.equal(await bcrypt.compare('correct horse battery staple', saved.passwordHash), true);
  assert.equal(JSON.stringify(body).includes(saved.passwordHash), false);
});

test('duplicate normalized email returns 409 without creating a second account', async t => {
  const users = memoryRepository();
  const baseUrl = await startServer(t, createAuthService({ users, costFactor: 4 }));
  const first = await post(baseUrl, '/auth/register', {
    name: 'Sam', email: 'sam@example.com', password: 'first-password',
  });
  const duplicate = await post(baseUrl, '/auth/register', {
    name: 'Another Sam', email: '  SAM@EXAMPLE.COM ', password: 'second-password',
  });
  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
  assert.equal(users.calls.creates, 1);
  assert.equal(users.records.size, 1);
});

test('valid login succeeds while unknown email and wrong password share the exact generic 401 body', async t => {
  const users = memoryRepository();
  const baseUrl = await startServer(t, createAuthService({ users, costFactor: 4 }));
  await post(baseUrl, '/auth/register', {
    name: 'Sam', email: 'sam@example.com', password: 'correct-password',
  });

  const valid = await post(baseUrl, '/auth/login', {
    email: ' SAM@EXAMPLE.COM ', password: 'correct-password',
  });
  assert.equal(valid.status, 200);
  const publicBody = await valid.json();
  assert.deepEqual(Object.keys(publicBody).sort(), ['email', 'id', 'name']);

  const wrongPassword = await post(baseUrl, '/auth/login', {
    email: 'sam@example.com', password: 'wrong-password',
  });
  const unknownEmail = await post(baseUrl, '/auth/login', {
    email: 'unknown@example.com', password: 'wrong-password',
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  const expected = '{"error":{"code":"INVALID_CREDENTIALS","message":"Invalid email or password"}}';
  assert.equal(await wrongPassword.text(), expected);
  assert.equal(await unknownEmail.text(), expected);
});

test('invalid input is rejected before repository or bcrypt work', async t => {
  const users = memoryRepository();
  let hashCalls = 0;
  let compareCalls = 0;
  const instrumentedBcrypt = {
    hashSync: bcrypt.hashSync.bind(bcrypt),
    hash: async (...args) => { hashCalls += 1; return bcrypt.hash(...args); },
    compare: async (...args) => { compareCalls += 1; return bcrypt.compare(...args); },
  };
  const service = createAuthService({ users, bcryptImplementation: instrumentedBcrypt, costFactor: 4 });
  const baseUrl = await startServer(t, service);

  const register = await post(baseUrl, '/auth/register', { name: ' ', email: 'sam@example.com', password: 'pw' });
  const login = await post(baseUrl, '/auth/login', { email: 'sam@example.com', password: '' });
  assert.equal(register.status, 400);
  assert.equal(login.status, 400);
  assert.deepEqual(users.calls, { lookups: 0, creates: 0 });
  assert.equal(hashCalls, 0);
  assert.equal(compareCalls, 0);
});

test('malformed JSON and internal errors receive controlled responses', async t => {
  const users = memoryRepository();
  const baseUrl = await startServer(t, createAuthService({
    users: { ...users, async findByEmail() { throw new Error('sensitive database details'); } },
    costFactor: 4,
  }));

  const malformed = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');

  const failed = await post(baseUrl, '/auth/login', {
    email: 'sam@example.com', password: 'some-password',
  });
  assert.equal(failed.status, 500);
  const responseText = await failed.text();
  assert.equal(responseText.includes('sensitive database details'), false);
  assert.equal(responseText, '{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}');
});
