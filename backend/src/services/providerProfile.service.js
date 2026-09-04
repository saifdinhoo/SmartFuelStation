const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

// Every route in this module is "my own business" — the provider id is
// always resolved from the JWT's userId, never accepted from the client.
// That makes ownership structurally impossible to spoof, rather than
// something each handler has to remember to check.
async function requireOwnProvider(userId, tx = prisma) {
  const provider = await tx.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw forbidden('No provider profile is linked to this account');
  }
  return provider;
}

const PROFILE_SHAPE = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  services: {
    include: { category: { select: { id: true, name: true, isActive: true } } },
    orderBy: { name: 'asc' },
  },
};

// Decimal columns (price, latitude, longitude) come back as Prisma Decimal
// objects, which JSON.stringify renders as strings. The web client wants
// numbers it can put straight into inputs and charts, so they're widened
// here once rather than parsed at every call site.
function serializeProvider(provider, ratingSummary) {
  return {
    id: provider.id,
    userId: provider.userId,
    businessName: provider.businessName,
    address: provider.address,
    description: provider.description,
    isApproved: provider.isApproved,
    isOpen: provider.isOpen,
    latitude: provider.latitude === null ? null : Number(provider.latitude),
    longitude: provider.longitude === null ? null : Number(provider.longitude),
    estimatedWaitMinutes: provider.estimatedWaitMinutes,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    user: provider.user,
    services: (provider.services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      durationMinutes: s.durationMinutes,
      isAvailable: s.isAvailable,
      categoryId: s.categoryId,
      category: s.category,
    })),
    ...(ratingSummary ? { rating: ratingSummary } : {}),
  };
}

async function ratingFor(providerId) {
  const result = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    averageRating: result._avg.rating === null ? null : Math.round(result._avg.rating * 10) / 10,
    reviewCount: result._count.rating,
  };
}

async function getOwnProfile(userId) {
  const base = await requireOwnProvider(userId);
  const provider = await prisma.provider.findUnique({
    where: { id: base.id },
    include: PROFILE_SHAPE,
  });
  return serializeProvider(provider, await ratingFor(provider.id));
}

function parseCoordinate(value, label, limit) {
  if (value === null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw badRequest(`${label} must be a number`);
  if (num < -limit || num > limit) {
    throw badRequest(`${label} must be between -${limit} and ${limit}`);
  }
  return num;
}

// Partial update: only keys actually present in the body are touched, so a
// form that submits one field can't blank out the others.
async function updateOwnProfile(userId, input) {
  const provider = await requireOwnProvider(userId);

  const data = {};
  if (input.businessName !== undefined) {
    const name = String(input.businessName).trim();
    if (!name) throw badRequest('businessName cannot be empty');
    data.businessName = name;
  }
  if (input.address !== undefined) {
    const address = String(input.address).trim();
    if (!address) throw badRequest('address cannot be empty');
    data.address = address;
  }
  if (input.description !== undefined) {
    const description = input.description === null ? null : String(input.description).trim();
    data.description = description || null;
  }
  if (input.latitude !== undefined) {
    data.latitude = parseCoordinate(input.latitude, 'latitude', 90);
  }
  if (input.longitude !== undefined) {
    data.longitude = parseCoordinate(input.longitude, 'longitude', 180);
  }
  if (input.isOpen !== undefined) {
    if (typeof input.isOpen !== 'boolean') throw badRequest('isOpen must be a boolean');
    data.isOpen = input.isOpen;
  }
  if (input.estimatedWaitMinutes !== undefined) {
    const minutes = Number(input.estimatedWaitMinutes);
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw badRequest('estimatedWaitMinutes must be a non-negative integer');
    }
    data.estimatedWaitMinutes = minutes;
  }

  // Contact details live on the linked User, not Provider — updated in the
  // same transaction so the profile screen can't half-save.
  const userData = {};
  if (input.phone !== undefined) {
    userData.phone = input.phone === null || input.phone === '' ? null : String(input.phone).trim();
  }
  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw badRequest('name cannot be empty');
    userData.name = name;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.provider.update({ where: { id: provider.id }, data });
    }
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: userId }, data: userData });
    }
  });

  const updated = await prisma.provider.findUnique({
    where: { id: provider.id },
    include: PROFILE_SHAPE,
  });
  return serializeProvider(updated, await ratingFor(provider.id));
}

// ---------------------------------------------------------------------------
// Services owned by this provider
// ---------------------------------------------------------------------------

async function assertOwnedService(providerId, serviceIdParam, tx = prisma) {
  const serviceId = toId(serviceIdParam, 'service id');
  const service = await tx.providerService.findUnique({ where: { id: serviceId } });
  if (!service) throw notFound('Service not found');
  if (service.providerId !== providerId) {
    throw forbidden('You can only manage services for your own business');
  }
  return service;
}

function validateServiceFields({ name, price, durationMinutes, categoryId }, { partial }) {
  const data = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw badRequest('name is required');
    data.name = trimmed;
  } else if (!partial) {
    throw badRequest('name is required');
  }

  if (price !== undefined) {
    const num = Number(price);
    if (!Number.isFinite(num) || num < 0) throw badRequest('price must be a non-negative number');
    data.price = num;
  } else if (!partial) {
    throw badRequest('price is required');
  }

  if (durationMinutes !== undefined) {
    const num = Number(durationMinutes);
    if (!Number.isInteger(num) || num <= 0) {
      throw badRequest('durationMinutes must be a positive integer');
    }
    data.durationMinutes = num;
  } else if (!partial) {
    throw badRequest('durationMinutes is required');
  }

  if (categoryId !== undefined) {
    data.categoryId = toId(categoryId, 'categoryId');
  } else if (!partial) {
    throw badRequest('categoryId is required');
  }

  return data;
}

async function createService(userId, input) {
  const provider = await requireOwnProvider(userId);
  const data = validateServiceFields(input, { partial: false });

  const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw notFound('Service category not found');

  try {
    const created = await prisma.providerService.create({
      data: {
        ...data,
        providerId: provider.id,
        isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
      },
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
    return { ...created, price: Number(created.price) };
  } catch (err) {
    // @@unique([providerId, name]) — a clean 409 rather than a raw P2002.
    if (err.code === 'P2002') {
      throw conflict('You already offer a service with this name');
    }
    throw err;
  }
}

async function updateService(userId, serviceId, input) {
  const provider = await requireOwnProvider(userId);
  await assertOwnedService(provider.id, serviceId);

  const data = validateServiceFields(input, { partial: true });
  if (input.isAvailable !== undefined) {
    data.isAvailable = Boolean(input.isAvailable);
  }
  if (Object.keys(data).length === 0) {
    throw badRequest('No updatable fields were provided');
  }

  if (data.categoryId !== undefined) {
    const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) throw notFound('Service category not found');
  }

  try {
    const updated = await prisma.providerService.update({
      where: { id: Number(serviceId) },
      data,
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
    return { ...updated, price: Number(updated.price) };
  } catch (err) {
    if (err.code === 'P2002') {
      throw conflict('You already offer a service with this name');
    }
    throw err;
  }
}

// A service that has ever been booked is historical record, not just a
// menu item: Booking.providerServiceId is a required relation, so deleting
// it would either orphan or cascade away real bookings (and the reviews
// hanging off them). Those are refused with a 409 that points at the
// non-destructive alternative — marking it unavailable, which is exactly
// what isAvailable is for. Queue entries block for the same reason.
async function deleteService(userId, serviceIdParam) {
  const provider = await requireOwnProvider(userId);
  const service = await assertOwnedService(provider.id, serviceIdParam);

  const [bookingCount, queueCount] = await Promise.all([
    prisma.booking.count({ where: { providerServiceId: service.id } }),
    prisma.queueEntry.count({ where: { providerServiceId: service.id } }),
  ]);

  if (bookingCount > 0 || queueCount > 0) {
    throw conflict(
      `This service has ${bookingCount} booking(s) and ${queueCount} queue entry(ies) on record and cannot be deleted. ` +
        'Mark it unavailable instead to stop taking new bookings while keeping its history.',
    );
  }

  await prisma.providerService.delete({ where: { id: service.id } });
  return { id: service.id };
}

// Self-service deactivation, not deletion: nothing is removed. The linked
// User is marked inactive (blocks future logins — see auth.service.js's
// login()) and the business is closed to new bookings (isOpen: false, the
// same flag Live Status already uses), but every service, booking, review,
// finance/fuel/queue record, and audit trail entry is left exactly as it
// is. There is no path back to true here on purpose — re-activation isn't
// asked for by this feature, so it isn't built.
async function deactivateOwnAccount(userId) {
  const provider = await requireOwnProvider(userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: false } });
    await tx.provider.update({ where: { id: provider.id }, data: { isOpen: false } });
  });

  return { deactivated: true };
}

module.exports = {
  requireOwnProvider,
  getOwnProfile,
  updateOwnProfile,
  createService,
  updateService,
  deleteService,
  deactivateOwnAccount,
};
