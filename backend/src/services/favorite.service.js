const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

const WITH_PROVIDER = {
  provider: {
    select: {
      id: true,
      businessName: true,
      address: true,
      isOpen: true,
      estimatedWaitMinutes: true,
    },
  },
};

async function listMyFavorites(userId) {
  return prisma.favorite.findMany({
    where: { userId },
    include: WITH_PROVIDER,
    orderBy: { createdAt: 'desc' },
  });
}

// Idempotent by design (unique index on [userId, providerId]): favoriting
// an already-favorited provider just returns the existing row rather than
// erroring — a customer tapping a heart icon twice (e.g. a slow network
// double-tap) should never see a 409 for what looks like the same action.
async function addFavorite(userId, providerIdParam) {
  const providerId = toId(providerIdParam, 'providerId');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');

  const existing = await prisma.favorite.findUnique({
    where: { userId_providerId: { userId, providerId } },
    include: WITH_PROVIDER,
  });
  if (existing) return existing;

  return prisma.favorite.create({
    data: { userId, providerId },
    include: WITH_PROVIDER,
  });
}

// Also idempotent: unfavoriting something already not favorited is a no-op
// success, not a 404 — the end state the caller wants is already true.
async function removeFavorite(userId, providerIdParam) {
  const providerId = toId(providerIdParam, 'providerId');
  await prisma.favorite.deleteMany({ where: { userId, providerId } });
}

module.exports = { listMyFavorites, addFavorite, removeFavorite };
