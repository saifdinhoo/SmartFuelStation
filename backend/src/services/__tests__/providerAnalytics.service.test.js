jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  booking: { findMany: jest.fn() },
  queueEntry: { findMany: jest.fn() },
  review: { findMany: jest.fn() },
}));

const prisma = require('../../config/prisma');
const analytics = require('../providerAnalytics.service');

const OWNER_USER_ID = 2;

function minutesAgo(n) {
  return new Date(Date.now() - n * 60000);
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.provider.findUnique.mockResolvedValue({ id: 1, userId: OWNER_USER_ID });
  prisma.booking.findMany.mockResolvedValue([]);
  prisma.queueEntry.findMany.mockResolvedValue([]);
  prisma.review.findMany.mockResolvedValue([]);
});

describe('range validation', () => {
  it.each(['1d', 'year', '', 'abc'])('rejects an unsupported range: %p', async (range) => {
    await expect(analytics.getProviderAnalytics(OWNER_USER_ID, range)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it.each(['7d', '30d', '90d'])('accepts %s', async (range) => {
    const result = await analytics.getProviderAnalytics(OWNER_USER_ID, range);
    expect(result.range).toBe(range);
  });

  it('defaults to 30d', async () => {
    const result = await analytics.getProviderAnalytics(OWNER_USER_ID);
    expect(result.range).toBe('30d');
    expect(result.trend).toHaveLength(30);
  });
});

describe('empty database', () => {
  it('returns zeroes and a null rating rather than fabricated numbers', async () => {
    const { summary, popularServices, busyHours, statusBreakdown } =
      await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');

    expect(summary.totalBookings).toBe(0);
    expect(summary.completedBookings).toBe(0);
    expect(summary.cancellationRate).toBe(0);
    expect(summary.averageWaitMinutes).toBe(0);
    expect(summary.averageRating).toBeNull();
    expect(popularServices).toEqual([]);
    expect(busyHours).toEqual([]);
    expect(statusBreakdown).toEqual([]);
  });

  it('never reports revenue or any non-database metric', async () => {
    const result = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    const keys = Object.keys(result.summary);
    expect(keys).not.toContain('revenue');
    expect(keys).not.toContain('revenueEstimate');
    expect(keys).not.toContain('profit');
  });
});

describe('computed metrics', () => {
  beforeEach(() => {
    const at = new Date();
    at.setHours(9, 0, 0, 0);
    prisma.booking.findMany.mockResolvedValue([
      { status: 'COMPLETED', scheduledAt: at, providerService: { id: 1, name: 'Oil Change' } },
      { status: 'COMPLETED', scheduledAt: at, providerService: { id: 1, name: 'Oil Change' } },
      { status: 'CANCELLED', scheduledAt: at, providerService: { id: 2, name: 'Tire Repair' } },
      { status: 'REJECTED', scheduledAt: at, providerService: { id: 2, name: 'Tire Repair' } },
    ]);
    prisma.review.findMany.mockResolvedValue([
      { rating: 5, createdAt: new Date() },
      { rating: 4, createdAt: new Date() },
    ]);
  });

  it('counts completions and treats REJECTED as a cancellation', async () => {
    const { summary } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(summary.totalBookings).toBe(4);
    expect(summary.completedBookings).toBe(2);
    expect(summary.cancelledBookings).toBe(2);
    expect(summary.cancellationRate).toBe(50);
  });

  it('ranks popular services by real booking counts', async () => {
    const { popularServices } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(popularServices[0]).toEqual({ service: 'Oil Change', bookings: 2 });
  });

  it('averages real ratings', async () => {
    const { summary } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(summary.averageRating).toBe(4.5);
    expect(summary.reviewCount).toBe(2);
  });

  it('reports only real booking statuses, never an invented one', async () => {
    const { statusBreakdown } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    const statuses = statusBreakdown.map((s) => s.status);
    expect(statuses.sort()).toEqual(['CANCELLED', 'COMPLETED', 'REJECTED']);
    expect(statuses).not.toContain('No-show');
  });
});

describe('wait-time metric', () => {
  it('averages only entries that actually reached service', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([
      { joinedAt: minutesAgo(40), startedAt: minutesAgo(20) }, // waited 20
      { joinedAt: minutesAgo(30), startedAt: minutesAgo(20) }, // waited 10
      { joinedAt: minutesAgo(5), startedAt: null }, // still waiting — excluded
    ]);
    const { summary } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(summary.averageWaitMinutes).toBe(15);
    expect(summary.queueEntriesHandled).toBe(3);
  });

  it('reports zero rather than NaN when nothing has been served', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([{ joinedAt: minutesAgo(5), startedAt: null }]);
    const { summary } = await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(summary.averageWaitMinutes).toBe(0);
  });
});

describe('ownership', () => {
  it('refuses an account with no provider profile', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(analytics.getProviderAnalytics(999, '7d')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('scopes every query to the caller\'s own provider id', async () => {
    await analytics.getProviderAnalytics(OWNER_USER_ID, '7d');
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerService: { providerId: 1 } }),
      }),
    );
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ providerId: 1 }) }),
    );
  });
});
