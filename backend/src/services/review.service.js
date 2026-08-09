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

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
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

const WITH_CUSTOMER = { customer: { select: { id: true, name: true } } };

async function createReview({ customerId, bookingId, rating, comment }) {
  const parsedBookingId = toId(bookingId, 'bookingId');

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw badRequest('rating must be an integer from 1 to 5');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsedBookingId },
    include: { providerService: true, review: true },
  });
  if (!booking) {
    throw notFound('Booking not found');
  }
  if (booking.customerId !== customerId) {
    throw forbidden('You can only review your own bookings');
  }
  if (booking.status !== 'COMPLETED') {
    throw badRequest('Only completed bookings can be reviewed');
  }
  if (booking.review) {
    throw conflict('This booking has already been reviewed');
  }

  try {
    return await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId,
        providerId: booking.providerService.providerId,
        rating,
        comment: comment || null,
      },
      include: WITH_CUSTOMER,
    });
  } catch (err) {
    // Race condition fallback: two simultaneous requests both passed the
    // check above before either had committed. The unique index on
    // bookingId is the real guarantee; this just gives a clean 409
    // instead of a raw Prisma error.
    if (err.code === 'P2002') {
      throw conflict('This booking has already been reviewed');
    }
    throw err;
  }
}

// Providers may only read their own business's reviews/rating; customers
// and admins can read any provider's (this is public-facing rating data —
// the same information shown on that provider's profile to customers).
async function assertProviderReadAccess(providerId, requestingUser) {
  if (requestingUser.role !== 'PROVIDER') return;
  const own = await prisma.provider.findUnique({ where: { userId: requestingUser.userId } });
  if (!own || own.id !== providerId) {
    throw forbidden('You can only view reviews for your own business');
  }
}

async function listProviderReviews(providerIdParam, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');

  await assertProviderReadAccess(providerId, requestingUser);

  return prisma.review.findMany({
    where: { providerId },
    include: WITH_CUSTOMER,
    orderBy: { createdAt: 'desc' },
  });
}

async function getProviderRatingSummary(providerIdParam, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');

  await assertProviderReadAccess(providerId, requestingUser);

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

async function deleteReview(reviewIdParam, requestingUser) {
  const reviewId = toId(reviewIdParam, 'review id');

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw notFound('Review not found');

  const isOwnCustomer =
    requestingUser.role === 'CUSTOMER' && review.customerId === requestingUser.userId;
  const isAdmin = requestingUser.role === 'ADMIN';

  if (!isOwnCustomer && !isAdmin) {
    throw forbidden('You do not have permission to delete this review');
  }

  await prisma.review.delete({ where: { id: reviewId } });
}

module.exports = {
  createReview,
  listProviderReviews,
  getProviderRatingSummary,
  deleteReview,
};
