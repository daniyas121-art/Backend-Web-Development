let client;

function getClient() {
  if (!client) {
    const { PrismaClient } = require('@prisma/client');
    client = new PrismaClient();
  }
  return client;
}

// Load the generated Prisma client only when repository code actually accesses it.
module.exports = new Proxy({}, {
  get(_target, property) {
    const instance = getClient();
    const value = instance[property];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
