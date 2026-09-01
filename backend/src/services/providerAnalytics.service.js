const prisma = require('../config/prisma');
const { requireOwnProvider } = require('./providerProfile.service');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

// Deliberately absent from everything below: revenue, profit, demographics,
// and any "insight" the database cannot answer. Booking.priceAtBooking is
// real and revenue *could* be summed from completed bookings, but that is a
// product decision rather than a reporting one, so it is left out rather
// than guessed at. Every number returned here is a count, an average, or a
// ratio over rows that actually exist.
async function getProviderAnalytics(userId, rangeKey = '30d') {
  const days = RANGE_DAYS[rangeKey];
  if (!days) {
    throw badRequest(`range must be one of: ${Object.keys(RANGE_DAYS).join(', ')}`);
  }

  const provider = await requireOwnProvider(userId);
  // UTC-based and inclusive of today (see the trend loop below for why —
  // this used to be local-time, which let today's rows silently disappear
  // from the trend chart on a server whose local zone runs ahead of UTC).
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));

  const [bookings, queueEntries, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { providerService: { providerId: provider.id }, scheduledAt: { gte: since } },
      include: { providerService: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.queueEntry.findMany({
      where: { providerId: provider.id, joinedAt: { gte: since } },
    }),
    prisma.review.findMany({
      where: { providerId: provider.id },
      select: { rating: true, createdAt: true },
    }),
  ]);

  // --- summary ---
  const completed = bookings.filter((b) => b.status === 'COMPLETED');
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'REJECTED');
  const cancellationRate =
    bookings.length === 0 ? 0 : Math.round((cancelled.length / bookings.length) * 1000) / 10;

  // Real observed wait: how long a queue entry sat before service actually
  // started. Only entries that reached service have both timestamps, so
  // anything still waiting is excluded rather than counted as a zero.
  const servedEntries = queueEntries.filter((e) => e.startedAt);
  const averageWaitMinutes =
    servedEntries.length === 0
      ? 0
      : Math.round(
          servedEntries.reduce(
            (sum, e) => sum + (new Date(e.startedAt) - new Date(e.joinedAt)) / 60000,
            0,
          ) / servedEntries.length,
        );

  const averageRating =
    reviews.length === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  // --- trend: one point per day across the window ---
  // Bucket keys are UTC dates (see `since` above) — deliberately matching
  // how `b.scheduledAt` is keyed just below, so a booking scheduled for
  // "today" always lands in today's bucket regardless of the server's
  // local timezone.
  const trendMap = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const b of bookings) {
    const key = new Date(b.scheduledAt).toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + 1);
  }
  const trend = [...trendMap.entries()].map(([label, count]) => ({ label, bookings: count }));

  // --- popular services ---
  const serviceCounts = new Map();
  for (const b of bookings) {
    const name = b.providerService.name;
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const popularServices = [...serviceCounts.entries()]
    .map(([service, count]) => ({ service, bookings: count }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 6);

  // --- busy hours: only hours that actually have bookings ---
  const hourCounts = new Map();
  for (const b of bookings) {
    const hour = new Date(b.scheduledAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const busyHours = [...hourCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, bookings: count }));

  // --- status breakdown: real enum values, no invented "No-show" ---
  const statusCounts = new Map();
  for (const b of bookings) {
    statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);
  }
  const statusBreakdown = [...statusCounts.entries()].map(([status, count]) => ({ status, count }));

  // --- rating distribution ---
  const ratingDistribution = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  return {
    range: rangeKey,
    since: since.toISOString(),
    summary: {
      totalBookings: bookings.length,
      completedBookings: completed.length,
      cancelledBookings: cancelled.length,
      cancellationRate,
      averageWaitMinutes,
      averageRating,
      reviewCount: reviews.length,
      queueEntriesHandled: queueEntries.length,
    },
    trend,
    popularServices,
    busyHours,
    statusBreakdown,
    ratingDistribution,
  };
}

module.exports = { getProviderAnalytics };
