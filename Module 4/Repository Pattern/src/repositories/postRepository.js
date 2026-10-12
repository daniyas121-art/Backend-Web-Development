// Replacing this module's Map and seed data with Prisma will change only this
// repository; services, controllers, routes, response shapes, and business rules
// will continue to use the same five-operation contract.
const posts = new Map([
  [1, { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 }],
  [2, { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 }],
]);

let nextId = 3;

function copy(post) {
  return post ? { ...post } : null;
}

function findAll() {
  return Array.from(posts.values(), copy);
}

function findById(id) {
  return copy(posts.get(Number(id)));
}

function create(fields) {
  const post = { ...fields, id: nextId++ };
  posts.set(post.id, post);
  return copy(post);
}

function update(id, patch) {
  const numericId = Number(id);
  const current = posts.get(numericId);
  if (!current) return null;

  const updated = { ...current, ...patch, id: numericId };
  posts.set(numericId, updated);
  return copy(updated);
}

function remove(id) {
  return posts.delete(Number(id));
}

module.exports = { findAll, findById, create, update, remove };
