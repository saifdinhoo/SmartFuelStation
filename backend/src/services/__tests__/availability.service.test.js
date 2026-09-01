jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  providerService: { findUnique: jest.fn() },
  providerOperatingHour: { findUnique: jest.fn() },
  booking: { findMany: jest.fn() },
}));

const prisma = require('../../config/prisma');
const { getAvailability } = require('../availability.service');

const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const ADMIN = { userId: 1, role: 'ADMIN' };

// A fixed future Tuesday, far enough out that "PAST" never applies to any
// slot on it regardless of when this suite actually runs.
function farFutureDateString() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  // Any real calendar date works for the OPEN-day tests below — the
  // provider-hours mock, not the real day-of-week, decides open/closed.
  return `${d.getFullYear()}-01-15`;
}
const DATE = farFutureDateString();

function providerRow(overrides = {}) {
  return { id: 2, isApproved: true, ...overrides };
}

function serviceRow(overrides = {}) {
  return { id: 5, providerId: 2, durationMinutes: 30, isAvailable: true, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.provider.findUnique.mockResolvedValue(providerRow());
  prisma.providerService.findUnique.mockResolvedValue(serviceRow());
  prisma.booking.findMany.mockResolvedValue([]);
});

describe('getAvailability — validation', () => {
  it('rejects a non-integer providerId', async () => {
    await expect(
      getAvailability({ providerId: 'abc', serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a non-integer serviceId', async () => {
    await expect(
      getAvailability({ providerId: 2, serviceId: 'abc', date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each(['2026-13-01', '2026-02-30', '01-01-2026', '2026/01/01', 'not-a-date', ''])(
    'rejects a malformed or impossible date: %p',
    async (bad) => {
      await expect(
        getAvailability({ providerId: 2, serviceId: 5, date: bad }, CUSTOMER),
      ).rejects.toMatchObject({ statusCode: 400 });
    },
  );

  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('404s (never 403) for a customer requesting an unapproved provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('404s when the service does not exist', async () => {
    prisma.providerService.findUnique.mockResolvedValue(null);
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects a service that belongs to a different provider', async () => {
    prisma.providerService.findUnique.mockResolvedValue(serviceRow({ providerId: 999 }));
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a service that is not currently available', async () => {
    prisma.providerService.findUnique.mockResolvedValue(serviceRow({ isAvailable: false }));
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('getAvailability — day-level status', () => {
  it('reports HOURS_NOT_CONFIGURED when no row exists for that weekday, without fabricating hours', async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue(null);
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    expect(result.status).toBe('HOURS_NOT_CONFIGURED');
    expect(result.openingTime).toBeNull();
    expect(result.closingTime).toBeNull();
    expect(result.slots).toEqual([]);
  });

  it('reports CLOSED for a day explicitly marked closed', async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: true,
      openTime: null,
      closeTime: null,
    });
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    expect(result.status).toBe('CLOSED');
    expect(result.slots).toEqual([]);
  });

  it('reports OPEN with the configured opening/closing times', async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    expect(result.status).toBe('OPEN');
    expect(result.openingTime).toBe('09:00');
    expect(result.closingTime).toBe('18:00');
    expect(result.providerId).toBe(2);
    expect(result.serviceId).toBe(5);
    expect(result.date).toBe(DATE);
    expect(result.serviceDurationMinutes).toBe(30);
  });
});

describe('getAvailability — slot generation (30-minute service)', () => {
  beforeEach(() => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '11:00',
    });
  });

  it('generates 30-minute-interval slots covering the whole open window', async () => {
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    expect(result.slots.map((s) => s.startTime)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
    ]);
    expect(result.slots.every((s) => s.status === 'AVAILABLE')).toBe(true);
  });

  it('marks a booked interval BOOKED and leaves the rest AVAILABLE', async () => {
    prisma.booking.findMany.mockResolvedValue([
      { scheduledAt: localDateTime(DATE, '10:00'), providerService: { durationMinutes: 30 } },
    ]);
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const byStart = Object.fromEntries(result.slots.map((s) => [s.startTime, s.status]));
    expect(byStart['09:00']).toBe('AVAILABLE');
    expect(byStart['09:30']).toBe('AVAILABLE');
    expect(byStart['10:00']).toBe('BOOKED');
    expect(byStart['10:30']).toBe('AVAILABLE');
  });

  it('never includes booking id, customer id, or any user-identifying field', async () => {
    prisma.booking.findMany.mockResolvedValue([
      { scheduledAt: localDateTime(DATE, '10:00'), providerService: { durationMinutes: 30 } },
    ]);
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/customerId|customerName|email|phone|bookingId/i);
    // Only ever the two allow-listed shapes below ever reach the response.
    for (const slot of result.slots) {
      expect(Object.keys(slot).sort()).toEqual(['endTime', 'startTime', 'status']);
    }
  });

  it('queries only scheduledAt and the service duration needed to compute overlap — never selects customer fields', async () => {
    await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const [args] = prisma.booking.findMany.mock.calls[0];
    expect(args.select).toEqual({
      scheduledAt: true,
      providerService: { select: { durationMinutes: true } },
    });
  });
});

describe('getAvailability — 60-minute service duration', () => {
  beforeEach(() => {
    prisma.providerService.findUnique.mockResolvedValue(serviceRow({ durationMinutes: 60 }));
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
  });

  it('excludes a start time whose 60-minute service would end after closing', async () => {
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const starts = result.slots.map((s) => s.startTime);
    expect(starts).not.toContain('17:30');
  });

  it('includes a start time whose 60-minute service ends exactly at closing', async () => {
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const last = result.slots.find((s) => s.startTime === '17:00');
    expect(last).toEqual({ startTime: '17:00', endTime: '18:00', status: 'AVAILABLE' });
  });

  it('matches the professor’s worked example: a 60-min booking at 10:00–11:00 blocks 09:30/10:00/10:30 but not 09:00/11:00', async () => {
    prisma.booking.findMany.mockResolvedValue([
      { scheduledAt: localDateTime(DATE, '10:00'), providerService: { durationMinutes: 60 } },
    ]);
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const byStart = Object.fromEntries(result.slots.map((s) => [s.startTime, s.status]));
    expect(byStart['09:00']).toBe('AVAILABLE');
    expect(byStart['09:30']).toBe('BOOKED');
    expect(byStart['10:00']).toBe('BOOKED');
    expect(byStart['10:30']).toBe('BOOKED');
    expect(byStart['11:00']).toBe('AVAILABLE');
  });
});

describe('getAvailability — PAST slots', () => {
  it('marks a slot PAST when its start time has already passed today, and leaves later slots AVAILABLE', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Open the whole day so "an hour ago" and "an hour from now" both land
    // inside operating hours regardless of the current wall-clock time.
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '00:00',
      closeTime: '23:30',
    });

    const result = await getAvailability({ providerId: 2, serviceId: 5, date: today }, CUSTOMER);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const past = result.slots.find((s) => minutesOf(s.startTime) < nowMinutes - 30);
    const future = result.slots.find((s) => minutesOf(s.startTime) > nowMinutes + 30);

    if (past) expect(past.status).toBe('PAST');
    if (future) expect(future.status).not.toBe('PAST');
  });

  it('treats a cancelled booking as releasing the slot (terminal statuses never block)', async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    // A cancelled/completed/rejected booking must never be fetched as
    // "blocking" in the first place — the query itself filters by
    // ACTIVE_STATUSES, so returning none here simulates that correctly.
    prisma.booking.findMany.mockResolvedValue([]);
    const result = await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    expect(result.slots.find((s) => s.startTime === '10:00').status).toBe('AVAILABLE');
  });

  it("queries bookings only by ACTIVE_STATUSES — cancelled/completed/rejected can never block a slot", async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    await getAvailability({ providerId: 2, serviceId: 5, date: DATE }, CUSTOMER);
    const [args] = prisma.booking.findMany.mock.calls[0];
    expect(args.where.status.in).toEqual(
      expect.arrayContaining(['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE']),
    );
    expect(args.where.status.in).not.toEqual(
      expect.arrayContaining(['COMPLETED', 'CANCELLED', 'REJECTED']),
    );
  });
});

describe('getAvailability — access control', () => {
  it('allows an admin to check availability for any provider', async () => {
    prisma.providerOperatingHour.findUnique.mockResolvedValue({
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    await expect(
      getAvailability({ providerId: 2, serviceId: 5, date: DATE }, ADMIN),
    ).resolves.toBeDefined();
  });
});

// --- helpers ----------------------------------------------------------------

function localDateTime(dateString, timeString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function minutesOf(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
}
