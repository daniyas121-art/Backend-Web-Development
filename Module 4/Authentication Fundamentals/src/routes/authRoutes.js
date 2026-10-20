const express = require('express');
const { authService } = require('../services/authService');

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createAuthRouter(service = authService) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const user = await service.register(req.body);
    return res.status(201).json(user);
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const user = await service.login(req.body);
    return res.status(200).json(user);
  }));

  return router;
}

module.exports = createAuthRouter;
