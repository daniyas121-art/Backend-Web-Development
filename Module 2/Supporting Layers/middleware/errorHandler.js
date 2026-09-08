const { nodeEnv } = require("../config");

module.exports = function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const body = {
    error: err.message || "Internal Server Error",
  };

  if (nodeEnv !== "production" && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};