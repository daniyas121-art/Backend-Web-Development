const { PrismaClient } = require('@prisma/client');

// One client owns database access for this application process.
const prisma = new PrismaClient();

module.exports = prisma;
