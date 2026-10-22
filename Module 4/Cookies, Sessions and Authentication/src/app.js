require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const cookieSecret = process.env.COOKIE_SECRET;
if (typeof cookieSecret !== 'string' || cookieSecret.length < 32) {
  throw new Error('COOKIE_SECRET must contain at least 32 characters');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser(cookieSecret));
app.use('/auth', authRoutes);
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
});
app.use((error, req, res, next) => {
  console.error('Unhandled API error');
  if (res.headersSent) return next(error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
