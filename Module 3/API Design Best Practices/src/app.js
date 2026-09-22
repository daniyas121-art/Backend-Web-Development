const express = require('express');
const postRoutes = require('./routes/postRoutes');
const { resetData } = require('./data/postStore');
const controller = require('./controllers/postController');
const http = require('./utils/http');

function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/', postRoutes);
  app.get('/explode', controller.explode);

  // Keep all public failures on the same safe, machine-readable contract.
  app.use((req, res) => {
    http.sendError(res, 404, 'NOT_FOUND', 'Route not found');
  });

  app.use((err, req, res, next) => {
    console.error(err);
    http.sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = 3000;
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

module.exports = {
  createApp,
  resetData
};
