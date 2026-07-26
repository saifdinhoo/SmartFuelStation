const { PrismaClient } = require('@prisma/client');

// A single shared Prisma client, reused across the app instead of creating
// a new client (and connection pool) on every request.
const prisma = new PrismaClient();

module.exports = prisma;
