const store = require('../data/postStore');

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 100;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function listPosts(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const requestedLimit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const allPosts = store.getAllPosts();
  const total = allPosts.length;
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    rows: allPosts.slice(start, start + limit),
    meta: { page, limit, total, pages }
  };
}

function getPost(id) {
  return store.getPostById(id);
}

function createPost(body = {}) {
  return store.createPost({
    title: body.title,
    author: body.author
  });
}

function likePost(id) {
  const post = store.incrementLikes(id);
  if (!post) return null;
  return post;
}

function explode() {
  const err = new Error('SQLITE_CONSTRAINT in posts table');
  err.statusCode = 500;
  throw err;
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
