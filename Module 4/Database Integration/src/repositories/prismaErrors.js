function applicationError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function translatePrismaError(error) {
  switch (error && error.code) {
    case 'P2002':
      return applicationError('A record with these details already exists', 409);
    case 'P2000':
    case 'P2003':
    case 'P2011':
    case 'P2012':
    case 'P2013':
    case 'P2014':
      return applicationError('The supplied data or relationship is invalid', 422);
    default:
      if (error && error.name === 'PrismaClientValidationError') {
        return applicationError('The supplied data is invalid', 422);
      }
      // Never send raw database, connection, or Prisma messages to API clients.
      return applicationError('Database operation failed', 503);
  }
}

async function withDatabaseErrors(operation) {
  try {
    return await operation();
  } catch (error) {
    throw translatePrismaError(error);
  }
}

module.exports = { withDatabaseErrors };
