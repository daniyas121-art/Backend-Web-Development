const jwt = require('jsonwebtoken');

const unauthorized = (res) =>
  res.status(401).json({
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const match = /^Bearer ([^\s]+)$/i.exec(authHeader);
  const token = match ? match[1] : null;

  if (!token) {
    return unauthorized(res);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = payload;
    return next();
  } catch (_error) {
    return unauthorized(res);
  }
};
