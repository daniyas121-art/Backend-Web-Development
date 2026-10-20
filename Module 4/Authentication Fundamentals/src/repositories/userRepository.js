const prisma = require('../db/prisma');
const { DuplicateEmailError } = require('../errors');

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function createUser({ name, email, passwordHash }) {
  try {
    return await prisma.user.create({
      data: { name, email, passwordHash },
    });
  } catch (error) {
    // The unique constraint is the final guarantee if two signups race.
    if (error && error.code === 'P2002') {
      throw new DuplicateEmailError();
    }
    throw error;
  }
}

module.exports = { findByEmail, createUser };
