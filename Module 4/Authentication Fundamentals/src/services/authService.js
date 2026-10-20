const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { AppError, DuplicateEmailError } = require('../errors');

const INVALID_CREDENTIALS = Object.freeze({
  status: 401,
  code: 'INVALID_CREDENTIALS',
  message: 'Invalid email or password',
});
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuredCostFactor(value = process.env.BCRYPT_COST) {
  if (value === undefined || value === '') return 12;
  const cost = Number(value);
  if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
    throw new Error('BCRYPT_COST must be an integer from 4 to 31');
  }
  return cost;
}

function validationError() {
  return new AppError(400, 'VALIDATION_ERROR', 'Name, email, and password are required');
}

function invalidCredentials() {
  return new AppError(
    INVALID_CREDENTIALS.status,
    INVALID_CREDENTIALS.code,
    INVALID_CREDENTIALS.message,
  );
}

function publicUser(user) {
  // Keep an explicit allowlist: credential columns must never reach an API response.
  return { id: user.id, name: user.name, email: user.email };
}

function createAuthService({
  users = userRepository,
  bcryptImplementation = bcrypt,
  costFactor = configuredCostFactor(),
} = {}) {
  if (!Number.isInteger(costFactor) || costFactor < 4 || costFactor > 31) {
    throw new Error('BCRYPT_COST must be an integer from 4 to 31');
  }

  // Build a valid, same-cost hash once at startup for comparable work on unknown emails.
  // The random input and hash stay in memory and are never persisted or logged.
  const dummyPasswordHash = bcryptImplementation.hashSync(
    randomBytes(32).toString('hex'),
    costFactor,
  );

  async function register(input = {}) {
    const { name, email, password } = input && typeof input === 'object' ? input : {};
    if (
      typeof name !== 'string' || name.trim().length === 0 ||
      typeof email !== 'string' || email.trim().length === 0 ||
      !EMAIL_PATTERN.test(email.trim()) ||
      typeof password !== 'string' || password.length === 0
    ) {
      throw validationError();
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    if (await users.findByEmail(normalizedEmail)) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await bcryptImplementation.hash(password, costFactor);
    try {
      const user = await users.createUser({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
      });
      return publicUser(user);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
      }
      throw error;
    }
  }

  async function login(input = {}) {
    const { email, password } = input && typeof input === 'object' ? input : {};
    if (
      typeof email !== 'string' || email.trim().length === 0 ||
      !EMAIL_PATTERN.test(email.trim()) ||
      typeof password !== 'string' || password.length === 0
    ) {
      throw validationError();
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await users.findByEmail(normalizedEmail);
    if (!user) {
      await bcryptImplementation.compare(password, dummyPasswordHash);
      throw invalidCredentials();
    }

    const passwordMatches = await bcryptImplementation.compare(password, user.passwordHash);
    if (!passwordMatches) throw invalidCredentials();
    return publicUser(user);
  }

  return { register, login };
}

const authService = createAuthService();
module.exports = { authService, createAuthService, publicUser };
