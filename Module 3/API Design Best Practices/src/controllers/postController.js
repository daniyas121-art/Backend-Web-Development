const service = require('../services/postService');
const http = require('../utils/http');

function listPosts(req, res) {
  const { rows, meta } = service.listPosts(req.query);
  return http.sendList(res, rows, meta);
}

function getPost(req, res) {
  const post = service.getPost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'NOT_FOUND', 'Post not found');
  }
  return http.sendOk(res, post);
}

function createPost(req, res) {
  const { title, author } = req.body || {};
  const details = [];
  if (typeof title !== 'string' || title.trim() === '') {
    details.push({ field: 'title', message: 'Title is required' });
  }
  if (typeof author !== 'string' || author.trim() === '') {
    details.push({ field: 'author', message: 'Author is required' });
  }
  if (details.length > 0) {
    return http.sendError(res, 400, 'VALIDATION_ERROR', 'Invalid input', details);
  }

  const post = service.createPost({ title: title.trim(), author: author.trim() });
  return http.sendCreated(res, post);
}

function likePost(req, res) {
  const post = service.likePost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'NOT_FOUND', 'Post not found');
  }
  return http.sendCreated(res, { postId: post.id, likes: post.likes });
}

function explode(req, res) {
  try {
    service.explode();
  } catch (err) {
    console.error(err);
    return http.sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
  }
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
