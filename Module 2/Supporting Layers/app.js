const express = require('express');
const articlesRouter = require('./routes/articles');
const errorHandler = require('./middleware/errorHandler');
const { port } = require('./config');

const app = express();
app.use(express.json());

app.use('/articles', articlesRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`articles-api listening on http://localhost:${port}`);
});

module.exports = app;