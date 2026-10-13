const test = require('node:test');
const assert = require('node:assert/strict');

const prismaModulePath = require.resolve('../src/db/prisma');
const repositoryPath = require.resolve('../src/repositories/postRepository');
const postFields = { id: true, title: true, body: true, authorId: true };

function loadRepository(prisma) {
  require.cache[prismaModulePath] = {
    id: prismaModulePath,
    filename: prismaModulePath,
    loaded: true,
    exports: prisma,
  };
  delete require.cache[repositoryPath];
  return require(repositoryPath);
}

function prismaWith(overrides = {}) {
  return {
    post: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async () => null,
      update: async () => null,
      delete: async () => null,
      ...overrides,
    },
  };
}

test('findAll returns ordered rows selected in the stable API shape', async () => {
  const expected = [{ id: 1, title: 'First', body: '', authorId: 1 }];
  let args;
  const repository = loadRepository(prismaWith({ findMany: async (value) => { args = value; return expected; } }));

  assert.deepEqual(await repository.findAll(), expected);
  assert.deepEqual(args, { orderBy: { id: 'asc' }, select: postFields });
});

test('findById normalizes IDs and returns null for invalid or missing records', async () => {
  let args;
  const row = { id: 7, title: 'Existing', body: '', authorId: 1 };
  const repository = loadRepository(prismaWith({ findUnique: async (value) => { args = value; return row; } }));

  assert.equal(await repository.findById('7'), row);
  assert.deepEqual(args, { where: { id: 7 }, select: postFields });

  const missingRepository = loadRepository(prismaWith());
  assert.equal(await missingRepository.findById(99), null);
  assert.equal(await missingRepository.findById('not-an-id'), null);
});

test('create returns the Prisma-created record and preserves empty-body default', async () => {
  const created = { id: 9, title: 'Created', body: '', authorId: 1 };
  let args;
  const repository = loadRepository(prismaWith({ create: async (value) => { args = value; return created; } }));

  assert.equal(await repository.create({ title: 'Created', authorId: 1 }), created);
  assert.deepEqual(args, {
    data: { title: 'Created', body: '', authorId: 1 },
    select: postFields,
  });
});

test('update returns null when missing and updates only the original mutable fields', async () => {
  const updated = { id: 1, title: 'Updated', body: 'Body', authorId: 1 };
  const calls = [];
  const prisma = prismaWith({
    findUnique: async ({ where }) => where.id === 1 ? { id: 1 } : null,
    update: async (args) => { calls.push(args); return updated; },
  });
  const repository = loadRepository(prisma);

  assert.equal(await repository.update(404, { title: 'ignored' }), null);
  assert.equal(await repository.update(1, { title: 'Updated', body: 'Body', authorId: 88 }), updated);
  assert.deepEqual(calls[0], {
    where: { id: 1 },
    data: { title: 'Updated', body: 'Body' },
    select: postFields,
  });
});

test('remove returns true when deleted and false when missing or concurrently deleted', async () => {
  let deleteBehavior = async () => undefined;
  const repository = loadRepository(prismaWith({
    findUnique: async ({ where }) => where.id === 1 ? { id: 1 } : null,
    delete: async (...args) => deleteBehavior(...args),
  }));

  assert.equal(await repository.remove(404), false);
  assert.equal(await repository.remove(1), true);
  deleteBehavior = async () => { const error = new Error('raw database detail'); error.code = 'P2025'; throw error; };
  assert.equal(await repository.remove(1), false);
});

test('constraint and infrastructure failures become safe application errors', async () => {
  const duplicate = new Error('raw index name and SQL');
  duplicate.code = 'P2002';
  const repository = loadRepository(prismaWith({ findMany: async () => { throw duplicate; } }));

  await assert.rejects(repository.findAll(), (error) => {
    assert.equal(error.statusCode, 409);
    assert.equal(error.message, 'A record with these details already exists');
    assert.equal(error.message.includes('SQL'), false);
    return true;
  });

  const unavailable = new Error('postgres://secret-host/password');
  const unavailableRepository = loadRepository(prismaWith({ findMany: async () => { throw unavailable; } }));
  await assert.rejects(unavailableRepository.findAll(), (error) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.message, 'Database operation failed');
    assert.equal(error.message.includes('secret-host'), false);
    return true;
  });
});
