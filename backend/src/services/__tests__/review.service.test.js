jest.mock('../../config/prisma', () => ({
  booking: { findUnique: jest.fn() },
  provider: { findUnique: jest.fn() },
  review: {
    create: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../notification.service', () => ({
  createNotification: jest.fn(),
}));

const prisma = require('../../config/prisma');
const notificationService = require('../notification.service');
const reviewService = require('../review.service');

const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const OTHER_CUSTOMER = { userId: 99, role: 'CUSTOMER' };
const ADMIN = { userId: 1, role: 'ADMIN' };

function completedBooking(overrides = {}) {
  return {
    id: 4,
    customerId: 33,
    status: 'COMPLETED',
    review: null,
    providerService: { providerId: 2, provider: { userId: 77, businessName: 'Al-Nour Auto' } },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createReview', () => {
  it('rejects a non-integer bookingId', async () => {
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 'abc', rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([0, 6, 3.5, -1, null, undefined])('rejects an invalid rating: %p', async (rating) => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking());
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 4, rating }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects when the booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 999, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects reviewing someone else's booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking({ customerId: 999 }));
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 4, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a booking that is not completed', async () => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking({ status: 'CONFIRMED' }));
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 4, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a booking that already has a review', async () => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking({ review: { id: 1 } }));
    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 4, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates the review with the derived providerId when every rule passes', async () => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking());
    prisma.review.create.mockResolvedValue({ id: 10, rating: 5 });

    const result = await reviewService.createReview({
      customerId: 33,
      bookingId: 4,
      rating: 5,
      comment: 'Great',
    });

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bookingId: 4, customerId: 33, providerId: 2, rating: 5, comment: 'Great' },
      }),
    );
    expect(result).toEqual({ id: 10, rating: 5 });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 77,
        type: 'NEW_REVIEW',
        relatedReviewId: 10,
      }),
    );
  });

  it('converts a raw unique-constraint race into a 409', async () => {
    prisma.booking.findUnique.mockResolvedValue(completedBooking());
    const raceError = new Error('Unique constraint failed');
    raceError.code = 'P2002';
    prisma.review.create.mockRejectedValue(raceError);

    await expect(
      reviewService.createReview({ customerId: 33, bookingId: 4, rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('listProviderReviews / getProviderRatingSummary permissions', () => {
  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(reviewService.listProviderReviews(2, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lets a customer read any provider’s reviews', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce({ id: 2 });
    prisma.review.findMany.mockResolvedValue([{ id: 1 }]);
    const result = await reviewService.listProviderReviews(2, CUSTOMER);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('lets an admin read any provider’s reviews', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce({ id: 2 });
    prisma.review.findMany.mockResolvedValue([]);
    await expect(reviewService.listProviderReviews(2, ADMIN)).resolves.toEqual([]);
  });

  it('blocks a provider from reading a different business’s reviews', async () => {
    const providerUser = { userId: 77, role: 'PROVIDER' };
    prisma.provider.findUnique
      .mockResolvedValueOnce({ id: 2 }) // the target provider (exists check)
      .mockResolvedValueOnce({ id: 5 }); // this user's own provider row
    await expect(reviewService.listProviderReviews(2, providerUser)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets a provider read their own business’s reviews', async () => {
    const providerUser = { userId: 77, role: 'PROVIDER' };
    prisma.provider.findUnique
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 2 });
    prisma.review.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(reviewService.listProviderReviews(2, providerUser)).resolves.toEqual([{ id: 1 }]);
  });

  it('computes the average via aggregation and rounds to one decimal', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce({ id: 2 });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 }, _count: { rating: 3 } });
    const summary = await reviewService.getProviderRatingSummary(2, CUSTOMER);
    expect(summary).toEqual({ averageRating: 4.7, reviewCount: 3 });
  });

  it('returns a null average (not a fabricated number) when there are no reviews', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce({ id: 2 });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
    const summary = await reviewService.getProviderRatingSummary(2, CUSTOMER);
    expect(summary).toEqual({ averageRating: null, reviewCount: 0 });
  });
});

describe('deleteReview', () => {
  it('404s when the review does not exist', async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(reviewService.deleteReview(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lets a customer delete their own review', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, customerId: 33 });
    prisma.review.delete.mockResolvedValue({});
    await reviewService.deleteReview(1, CUSTOMER);
    expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("blocks a customer from deleting someone else's review", async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, customerId: 33 });
    await expect(reviewService.deleteReview(1, OTHER_CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets an admin delete any review', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, customerId: 33 });
    prisma.review.delete.mockResolvedValue({});
    await reviewService.deleteReview(1, ADMIN);
    expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('blocks a provider from deleting a review entirely', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, customerId: 33 });
    await expect(
      reviewService.deleteReview(1, { userId: 77, role: 'PROVIDER' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
