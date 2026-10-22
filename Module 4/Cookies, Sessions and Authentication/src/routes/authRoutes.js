const express = require('express');
const bcrypt = require('bcryptjs');
const cookieOptions = require('../config/cookie').cookieOptions;
const userRepository = require('../repositories/userRepository');
const sessionStore = require('../session/sessionStore');
const requireSession = require('../middleware/requireSession');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function invalidCredentials(res) {
  return res.status(401).json({
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
}

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body?.password;
    if (
      !email || email.length > 254 || !EMAIL_PATTERN.test(email) ||
      typeof password !== 'string' || password.length === 0 || password.length > 1024
    ) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email and password are required' },
      });
    }

    const user = await userRepository.findCredentialsByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return invalidCredentials(res);
    }

    const session = sessionStore.create(user.id);
    res.cookie('sid', session.id, cookieOptions());
    return res.status(200).json({ data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, (req, res) => {
  return res.status(200).json({ data: req.user });
});

router.post('/logout', (req, res, next) => {
  try {
    const sessionId = req.signedCookies && req.signedCookies.sid;
    if (typeof sessionId === 'string') sessionStore.destroy(sessionId);
    res.clearCookie('sid', cookieOptions({ clearing: true }));
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
