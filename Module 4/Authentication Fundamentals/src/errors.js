class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists');
    this.name = 'DuplicateEmailError';
  }
}

module.exports = { AppError, DuplicateEmailError };
