const nodeEnv = process.env.NODE_ENV || "development";
const maxArticles = parseInt(process.env.MAX_ARTICLES, 10) || 50;
const port = parseInt(process.env.PORT, 10) || 3000;

module.exports = {
  nodeEnv,
  maxArticles,
  port,
};