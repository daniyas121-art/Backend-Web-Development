const express = require('express');
const controller = require('../controllers/postController');

const router = express.Router();

// The public contract is resource-oriented: methods carry the action and
// paths name the resource being acted on.
router.get('/posts', controller.listPosts);
router.get('/posts/:id', controller.getPost);
router.post('/posts', controller.createPost);
router.post('/posts/:id/likes', controller.likePost);

module.exports = router;
