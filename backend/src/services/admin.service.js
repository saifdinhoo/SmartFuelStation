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

// Booking statuses that represent work still in flight, as opposed to
// history. Mirrors ACTIVE_STATUSES in shared/bookingTransitions.js.
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE'];
const ACTIVE_QUEUE_STATUSES = ['WAITING', 'IN_SERVICE'];

// Every figure below is a count or an aggregate over rows that exist.
// Deliberately absent: revenue, AI usage, notification/stream metrics,
// demographics, and "system health" — none of those have a source in this
// database, so reporting them would mean inventing them.
async function getOverview() {
  const [
    totalUsers,
    totalCustomers,
    totalProviderAccounts,
    totalAdmins,
    totalProviders,
    approvedProviders,
    openProviders,
    totalBookings,
    activeBookings,
    completedBookings,
    cancelledBookings,
    rejectedBookings,
    totalReviews,
    ratingAgg,
    activeQueueEntries,
    totalCategories,
    activeCategories,
    totalServices,
    openComplaints,
    totalComplaints,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.provider.count(),
    prisma.provider.count({ where: { isApproved: true } }),
    prisma.provider.count({ where: { isOpen: true, isApproved: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ACTIVE_BOOKING_STATUSES } } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
    prisma.booking.count({ where: { status: 'REJECTED' } }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.queueEntry.count({ where: { status: { in: ACTIVE_QUEUE_STATUSES } } }),
    prisma.serviceCategory.count(),
    prisma.serviceCategory.count({ where: { isActive: true } }),
    prisma.providerService.count(),
    prisma.complaint.count({ where: { status: 'OPEN' } }),
    prisma.complaint.count(),
  ]);

  const [recentRegistrations, pendingProviderList, recentComplaints] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['CUSTOMER', 'PROVIDER'] } },
      select: { id: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.provider.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        businessName: true,
        address: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.complaint.findMany({
      select: {
        id: true,
        subject: true,
        severity: true,
        status: true,
        createdAt: true,
        submittedBy: { select: { id: true, name: true } },
        provider: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      customers: totalCustomers,
      providerAccounts: totalProviderAccounts,
      admins: totalAdmins,
    },
    providers: {
      total: totalProviders,
      approved: approvedProviders,
      pending: totalProviders - approvedProviders,
      openNow: openProviders,
    },
    bookings: {
      total: totalBookings,
      active: activeBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      rejected: rejectedBookings,
    },
    reviews: {
      total: totalReviews,
      averageRating:
        ratingAgg._avg.rating === null ? null : Math.round(ratingAgg._avg.rating * 10) / 10,
    },
    queue: { activeEntries: activeQueueEntries },
    catalog: { categories: totalCategories, activeCategories, services: totalServices },
    complaints: { open: openComplaints, total: totalComplaints },
    recentRegistrations,
    pendingProviders: pendingProviderList,
    recentComplaints,
  };
}

// ---------------------------------------------------------------------------
// Platform analytics
// ---------------------------------------------------------------------------

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

async function getAnalytics(rangeKey = '30d') {
  const days = RANGE_DAYS[rangeKey];
  if (!days) {
    throw badRequest(`range must be one of: ${Object.keys(RANGE_DAYS).join(', ')}`);
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [bookings, signups, reviews, providers] = await Promise.all([
    prisma.booking.findMany({
      where: { scheduledAt: { gte: since } },
      select: {
        status: true,
        scheduledAt: true,
        providerService: {
          select: {
            name: true,
            category: { select: { name: true } },
            provider: { select: { id: true, businessName: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since }, role: { in: ['CUSTOMER', 'PROVIDER'] } },
      select: { role: true, createdAt: true },
    }),
    prisma.review.findMany({ where: { createdAt: { gte: since } }, select: { rating: true } }),
    // Category distribution is over every provider service on the platform,
    // not just this window — it describes the catalog, not activity in it.
    prisma.providerService.findMany({
      select: { providerId: true, category: { select: { name: true } } },
    }),
  ]);

  const dayKeys = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const bookingByDay = new Map(dayKeys.map((k) => [k, 0]));
  for (const b of bookings) {
    const key = new Date(b.scheduledAt).toISOString().slice(0, 10);
    if (bookingByDay.has(key)) bookingByDay.set(key, bookingByDay.get(key) + 1);
  }

  const signupByDay = new Map(dayKeys.map((k) => [k, { customers: 0, providers: 0 }]));
  for (const u of signups) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10);
    const bucket = signupByDay.get(key);
    if (!bucket) continue;
    if (u.role === 'CUSTOMER') bucket.customers += 1;
    else bucket.providers += 1;
  }

  const statusCounts = new Map();
  for (const b of bookings) statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);

  const serviceCounts = new Map();
  for (const b of bookings) {
    const name = b.providerService.name;
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }

  const providerCounts = new Map();
  for (const b of bookings) {
    const name = b.providerService.provider.businessName;
    providerCounts.set(name, (providerCounts.get(name) ?? 0) + 1);
  }

  // One provider counted once per category it offers, not once per service.
  const categoryProviders = new Map();
  for (const s of providers) {
    const key = s.category.name;
    if (!categoryProviders.has(key)) categoryProviders.set(key, new Set());
    categoryProviders.get(key).add(s.providerId);
  }

  const cancelled = bookings.filter(
    (b) => b.status === 'CANCELLED' || b.status === 'REJECTED',
  ).length;

  return {
    range: rangeKey,
    since: since.toISOString(),
    summary: {
      bookings: bookings.length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      cancelled,
      cancellationRate:
        bookings.length === 0 ? 0 : Math.round((cancelled / bookings.length) * 1000) / 10,
      newCustomers: signups.filter((u) => u.role === 'CUSTOMER').length,
      newProviders: signups.filter((u) => u.role === 'PROVIDER').length,
      reviews: reviews.length,
      averageRating:
        reviews.length === 0
          ? null
          : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10,
    },
    bookingTrend: dayKeys.map((label) => ({ label, bookings: bookingByDay.get(label) })),
    userGrowth: dayKeys.map((label) => ({ label, ...signupByDay.get(label) })),
    statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    popularServices: [...serviceCounts.entries()]
      .map(([service, count]) => ({ service, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6),
    topProviders: [...providerCounts.entries()]
      .map(([provider, count]) => ({ provider, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6),
    providerCategories: [...categoryProviders.entries()]
      .map(([category, set]) => ({ category, count: set.size }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const USER_ROLES = ['CUSTOMER', 'PROVIDER', 'ADMIN'];

// Read-only by design. The User model has no status/isActive/deletedAt
// column, so there is nothing to activate or deactivate against — adding a
// pretend toggle would be a lie. Role changes are likewise not offered:
// a PROVIDER account is structurally tied to a Provider row, so flipping a
// role would strand that record. Both are reported as gaps instead.
async function listUsers({ role, search } = {}) {
  const where = {};
  if (role !== undefined && role !== 'ALL') {
    if (!USER_ROLES.includes(role)) throw badRequest('role is not a recognized user role');
    where.role = role;
  }
  if (search) {
    const term = String(search).trim();
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      provider: { select: { id: true, businessName: true, isApproved: true } },
      _count: { select: { bookings: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getUserById(idParam) {
  const id = toId(idParam, 'user id');
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          businessName: true,
          address: true,
          isApproved: true,
          isOpen: true,
          _count: { select: { services: true, reviews: true } },
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          providerService: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      },
      reviews: {
        select: { id: true, rating: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { bookings: true, reviews: true, complaints: true } },
    },
  });
  if (!user) throw notFound('User not found');
  return user;
}

// ---------------------------------------------------------------------------
// Reviews (platform-wide moderation list)
// ---------------------------------------------------------------------------

async function listAllReviews({ rating, providerId } = {}) {
  const where = {};
  if (rating !== undefined && rating !== 'ALL') {
    const parsed = Number(rating);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      throw badRequest('rating must be an integer from 1 to 5');
    }
    where.rating = parsed;
  }
  if (providerId !== undefined) {
    where.providerId = toId(providerId, 'providerId');
  }

  return prisma.review.findMany({
    where,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      bookingId: true,
      customer: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, businessName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

const COMPLAINT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
const CLOSED_COMPLAINT_STATUSES = ['RESOLVED', 'DISMISSED'];

const COMPLAINT_SHAPE = {
  id: true,
  subject: true,
  details: true,
  severity: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  submittedBy: { select: { id: true, name: true, email: true, role: true } },
  provider: { select: { id: true, businessName: true } },
};

async function listComplaints({ status, severity } = {}) {
  const where = {};
  if (status !== undefined && status !== 'ALL') {
    if (!COMPLAINT_STATUSES.includes(status)) throw badRequest('status is not a recognized complaint status');
    where.status = status;
  }
  if (severity !== undefined && severity !== 'ALL') {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(severity)) {
      throw badRequest('severity is not a recognized complaint severity');
    }
    where.severity = severity;
  }

  return prisma.complaint.findMany({
    where,
    select: COMPLAINT_SHAPE,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

// resolvedAt is derived from the status rather than accepted from the
// client, so it can never disagree with the status it is supposed to
// timestamp — and it is cleared again if a closed complaint is reopened.
async function updateComplaintStatus(idParam, nextStatus) {
  const id = toId(idParam, 'complaint id');
  if (!COMPLAINT_STATUSES.includes(nextStatus)) {
    throw badRequest(`status must be one of: ${COMPLAINT_STATUSES.join(', ')}`);
  }

  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) throw notFound('Complaint not found');

  return prisma.complaint.update({
    where: { id },
    data: {
      status: nextStatus,
      resolvedAt: CLOSED_COMPLAINT_STATUSES.includes(nextStatus) ? new Date() : null,
    },
    select: COMPLAINT_SHAPE,
  });
}

module.exports = {
  getOverview,
  getAnalytics,
  listUsers,
  getUserById,
  listAllReviews,
  listComplaints,
  updateComplaintStatus,
};
