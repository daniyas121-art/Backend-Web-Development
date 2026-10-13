const prisma = require('../db/prisma');
const { withDatabaseErrors } = require('./prismaErrors');

// Keep the API response shape stable; timestamps and relations remain storage details.
const postFields = {
  id: true,
  title: true,
  body: true,
  authorId: true,
};

function normalizeId(id) {
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function findAll() {
  return withDatabaseErrors(() => prisma.post.findMany({
    orderBy: { id: 'asc' },
    select: postFields,
  }));
}

async function findById(id) {
  const postId = normalizeId(id);
  if (postId === null) return null;

  return withDatabaseErrors(() => prisma.post.findUnique({
    where: { id: postId },
    select: postFields,
  }));
}

async function create(fields) {
  return withDatabaseErrors(() => prisma.post.create({
    data: {
      title: fields.title,
      body: fields.body || '',
      authorId: fields.authorId,
    },
    select: postFields,
  }));
}

async function update(id, patch) {
  const postId = normalizeId(id);
  if (postId === null) return null;

  const existing = await findById(postId);
  if (!existing) return null;

  const data = {};
  if (patch && patch.title !== undefined) data.title = patch.title;
  if (patch && patch.body !== undefined) data.body = patch.body;

  return withDatabaseErrors(async () => {
    try {
      return await prisma.post.update({ where: { id: postId }, data, select: postFields });
    } catch (error) {
      if (error && error.code === 'P2025') return null;
      throw error;
    }
  });
}

async function remove(id) {
  const postId = normalizeId(id);
  if (postId === null) return false;

  const existing = await findById(postId);
  if (!existing) return false;

  return withDatabaseErrors(async () => {
    try {
      await prisma.post.delete({ where: { id: postId } });
      return true;
    } catch (error) {
      if (error && error.code === 'P2025') return false;
      throw error;
    }
  });
}

module.exports = { findAll, findById, create, update, remove };
