jest.mock('../../config/prisma', () => ({
  user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  provider: { count: jest.fn(), findMany: jest.fn() },
  booking: { count: jest.fn(), findMany: jest.fn() },
  review: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  queueEntry: { count: jest.fn() },
  serviceCategory: { count: jest.fn() },
  providerService: { count: jest.fn(), findMany: jest.fn() },
  complaint: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}));

const prisma = require('../../config/prisma');
const admin = require('../admin.service');

beforeEach(() => {
  jest.clearAllMocks();
  for (const model of ['user', 'provider', 'booking', 'review', 'queueEntry', 'serviceCategory', 'providerService', 'complaint']) {
    if (prisma[model].count) prisma[model].count.mockResolvedValue(0);
    if (prisma[model].findMany) prisma[model].findMany.mockResolvedValue([]);
  }
  prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null } });
});

describe('getOverview', () => {
  it('returns null average rating rather than a fabricated 0 when there are no reviews', async () => {
    const data = await admin.getOverview();
    expect(data.reviews.averageRating).toBeNull();
  });

  it('derives pending providers from total minus approved', async () => {
    prisma.provider.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    const data = await admin.getOverview();
    expect(data.providers).toMatchObject({ total: 10, approved: 4, pending: 6 });
  });

  it('never reports revenue, AI, notification, stream or health metrics', async () => {
    const data = await admin.getOverview();
    const serialized = JSON.stringify(data);
    for (const forbidden of ['revenue', 'profit', 'aiUsage', 'notifications', 'stream', 'platformHealth', 'uptime']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('counts only in-flight bookings as active', async () => {
    await admin.getOverview();
    const activeCall = prisma.booking.count.mock.calls.find(
      (c) => c[0]?.where?.status?.in !== undefined,
    );
    expect(activeCall[0].where.status.in).toEqual([
      'PENDING',
      'CONFIRMED',
      'ARRIVED',
      'IN_QUEUE',
      'IN_SERVICE',
    ]);
  });

  it('counts only WAITING/IN_SERVICE queue entries as active', async () => {
    await admin.getOverview();
    expect(prisma.queueEntry.count).toHaveBeenCalledWith({
      where: { status: { in: ['WAITING', 'IN_SERVICE'] } },
    });
  });
});

describe('getAnalytics', () => {
  it.each(['1d', 'year', 'abc', ''])('rejects unsupported range %p', async (range) => {
    await expect(admin.getAnalytics(range)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('defaults to 30 daily points', async () => {
    const data = await admin.getAnalytics();
    expect(data.range).toBe('30d');
    expect(data.bookingTrend).toHaveLength(30);
    expect(data.userGrowth).toHaveLength(30);
  });

  it('reports zeroes and a null rating on an empty platform', async () => {
    const { summary } = await admin.getAnalytics('7d');
    expect(summary).toMatchObject({ bookings: 0, completed: 0, cancelled: 0, cancellationRate: 0 });
    expect(summary.averageRating).toBeNull();
  });

  it('treats REJECTED as a cancellation in the rate', async () => {
    const at = new Date();
    prisma.booking.findMany.mockResolvedValue([
      { status: 'COMPLETED', scheduledAt: at, providerService: { name: 'A', category: { name: 'C' }, provider: { id: 1, businessName: 'P' } } },
      { status: 'CANCELLED', scheduledAt: at, providerService: { name: 'A', category: { name: 'C' }, provider: { id: 1, businessName: 'P' } } },
      { status: 'REJECTED', scheduledAt: at, providerService: { name: 'B', category: { name: 'C' }, provider: { id: 1, businessName: 'P' } } },
    ]);
    const { summary } = await admin.getAnalytics('7d');
    expect(summary.cancelled).toBe(2);
    expect(summary.cancellationRate).toBeCloseTo(66.7, 1);
  });

  it('counts a provider once per category, not once per service', async () => {
    prisma.providerService.findMany.mockResolvedValue([
      { providerId: 1, category: { name: 'Oil' } },
      { providerId: 1, category: { name: 'Oil' } },
      { providerId: 2, category: { name: 'Oil' } },
    ]);
    const { providerCategories } = await admin.getAnalytics('7d');
    expect(providerCategories).toEqual([{ category: 'Oil', count: 2 }]);
  });

  describe('day-bucketing (timezone regression)', () => {
    // A live Phase D verification found the same bug in
    // finance.service.js's day-bucketing: a local-time window boundary
    // combined with UTC-sliced bucket keys silently dropped "today"'s rows
    // on a server whose local timezone runs ahead of UTC (e.g. UTC+3).
    // This service used the exact same pattern for bookingTrend and
    // userGrowth — fixed the same way (UTC throughout, inclusive of today).

    it("a booking scheduled right now lands in today's bookingTrend bucket", async () => {
      prisma.booking.findMany.mockResolvedValue([
        {
          status: 'PENDING',
          scheduledAt: new Date(),
          providerService: { name: 'A', category: { name: 'C' }, provider: { id: 1, businessName: 'P' } },
        },
      ]);
      const { bookingTrend } = await admin.getAnalytics('7d');
      expect(bookingTrend[bookingTrend.length - 1].bookings).toBe(1);
    });

    it("a signup right now lands in today's userGrowth bucket", async () => {
      prisma.user.findMany.mockResolvedValue([{ role: 'CUSTOMER', createdAt: new Date() }]);
      const { userGrowth } = await admin.getAnalytics('7d');
      expect(userGrowth[userGrowth.length - 1].customers).toBe(1);
    });

    it('bookingTrend and userGrowth both always include today as their last bucket', async () => {
      const { bookingTrend, userGrowth } = await admin.getAnalytics('7d');
      const todayKey = new Date().toISOString().slice(0, 10);
      expect(bookingTrend[bookingTrend.length - 1].label).toBe(todayKey);
      expect(userGrowth[userGrowth.length - 1].label).toBe(todayKey);
    });

    it('no off-by-one: exactly `days` distinct labels, each one calendar day apart', async () => {
      const { bookingTrend } = await admin.getAnalytics('30d');
      expect(bookingTrend).toHaveLength(30);
      expect(new Set(bookingTrend.map((p) => p.label)).size).toBe(30);
      for (let i = 1; i < bookingTrend.length; i += 1) {
        const prev = new Date(`${bookingTrend[i - 1].label}T00:00:00.000Z`);
        const curr = new Date(`${bookingTrend[i].label}T00:00:00.000Z`);
        expect(curr.getTime() - prev.getTime()).toBe(24 * 60 * 60 * 1000);
      }
    });
  });
});

describe('listUsers', () => {
  it('rejects an unrecognized role filter', async () => {
    await expect(admin.listUsers({ role: 'SUPERUSER' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each(['CUSTOMER', 'PROVIDER', 'ADMIN'])('accepts role %s', async (role) => {
    await admin.listUsers({ role });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role }) }),
    );
  });

  it('applies no role filter for ALL', async () => {
    await admin.listUsers({ role: 'ALL' });
    expect(prisma.user.findMany.mock.calls[0][0].where.role).toBeUndefined();
  });

  it('never selects the password column', async () => {
    await admin.listUsers({});
    expect(prisma.user.findMany.mock.calls[0][0].select.password).toBeUndefined();
  });

  it('searches name and email case-insensitively', async () => {
    await admin.listUsers({ search: 'saif' });
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: 'saif', mode: 'insensitive' } },
      { email: { contains: 'saif', mode: 'insensitive' } },
    ]);
  });
});

describe('getUserById', () => {
  it('rejects a non-integer id', async () => {
    await expect(admin.getUserById('abc')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s on a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(admin.getUserById(7)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('never selects the password column', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7 });
    await admin.getUserById(7);
    expect(prisma.user.findUnique.mock.calls[0][0].select.password).toBeUndefined();
  });
});

describe('listAllReviews', () => {
  it.each([0, 6, 2.5, 'x'])('rejects an invalid rating filter %p', async (rating) => {
    await expect(admin.listAllReviews({ rating })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('applies no rating filter for ALL', async () => {
    await admin.listAllReviews({ rating: 'ALL' });
    expect(prisma.review.findMany.mock.calls[0][0].where.rating).toBeUndefined();
  });

  it('filters by provider when asked', async () => {
    await admin.listAllReviews({ providerId: 3 });
    expect(prisma.review.findMany.mock.calls[0][0].where.providerId).toBe(3);
  });
});

describe('listComplaints', () => {
  it.each(['NEW', 'CLOSED', 'bogus'])('rejects unrecognized status %p', async (status) => {
    await expect(admin.listComplaints({ status })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an unrecognized severity', async () => {
    await expect(admin.listComplaints({ severity: 'CRITICAL' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it.each(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'])('accepts status %s', async (status) => {
    await admin.listComplaints({ status });
    expect(prisma.complaint.findMany.mock.calls[0][0].where.status).toBe(status);
  });
});

describe('updateComplaintStatus', () => {
  beforeEach(() => {
    prisma.complaint.findUnique.mockResolvedValue({ id: 1, status: 'OPEN' });
    prisma.complaint.update.mockResolvedValue({ id: 1 });
  });

  it('rejects an unrecognized status', async () => {
    await expect(admin.updateComplaintStatus(1, 'ARCHIVED')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('404s on a missing complaint', async () => {
    prisma.complaint.findUnique.mockResolvedValue(null);
    await expect(admin.updateComplaintStatus(99, 'RESOLVED')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it.each(['RESOLVED', 'DISMISSED'])('stamps resolvedAt when closing as %s', async (status) => {
    await admin.updateComplaintStatus(1, status);
    expect(prisma.complaint.update.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
  });

  it.each(['OPEN', 'IN_REVIEW'])('clears resolvedAt when reopening as %s', async (status) => {
    await admin.updateComplaintStatus(1, status);
    expect(prisma.complaint.update.mock.calls[0][0].data.resolvedAt).toBeNull();
  });
});
