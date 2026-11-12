'use strict';

const rateLimit = require('express-rate-limit');

// MemoryStore is process-local. In a multi-instance deployment behind a load
// balancer, requests can hit different instances and each instance would allow
// its own five attempts. Install `rate-limit-redis` and pass a shared RedisStore
// (for example, `new RedisStore({ sendCommand: (...args) => redis.call(...args) })`)
// as the `store` option so every instance uses the same counter.
module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfterSeconds = resetTime instanceof Date
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil((15 * 60 * 1000) / 1000);

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});
