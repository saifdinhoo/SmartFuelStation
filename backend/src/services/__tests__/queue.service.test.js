jest.mock('../../config/prisma', () => {
  const prisma = {
    queueEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    providerService: { findUnique: jest.fn() },
    provider: { findUnique: jest.fn() },
  };
  prisma.$transaction = jest.fn((cb) => cb(prisma));
  return prisma;
});
jest.mock('../finance.service', () => ({
  createTransactionForCompletedBooking: jest.fn(),
}));

const prisma = require('../../config/prisma');
const financeService = require('../finance.service');
const queueService = require('../queue.service');

const PROVIDER_USER = { userId: 77, role: 'PROVIDER' };
const OTHER_PROVIDER_USER = { userId: 88, role: 'PROVIDER' };
const ADMIN = { userId: 1, role: 'ADMIN' };
const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const OTHER_CUSTOMER = { userId: 44, role: 'CUSTOMER' };

function queueEntry(overrides = {}) {
  return {
    id: 1,
    providerId: 2,
    providerServiceId: 5,
    bookingId: null,
    customerId: null,
    customerName: 'Walk-in Customer',
    status: 'WAITING',
    position: 1,
    joinedAt: new Date(),
    startedAt: null,
    completedAt: null,
    provider: { id: 2, userId: 77, businessName: 'Cedars Auto' },
    providerService: { id: 5, providerId: 2, name: 'Oil Change', durationMinutes: 30 },
    customer: null,
    booking: null,
    ...overrides,
  };
}

function bookingRecord(status, overrides = {}) {
  return {
    id: 10,
    customerId: 33,
    providerServiceId: 5,
    status,
    providerService: { id: 5, providerId: 2, provider: { id: 2, userId: 77 } },
    customer: { id: 33, name: 'Layla Hassan' },
    queueEntry: null,
    ...overrides,
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): this suite spans many describe
  // blocks sharing the same prisma mock object, and mockResolvedValue set
  // in one test must not leak its return value into the next — only call
  // history should ever be intentionally shared, never implementations.
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((cb) => cb(prisma));
});

describe('listQueue', () => {
  it('scopes a customer to their own queue entries only', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    await queueService.listQueue(CUSTOMER);
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 33 } }),
    );
  });

  it("scopes a provider to their own business's queue", async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findMany.mockResolvedValue([]);
    await queueService.listQueue(PROVIDER_USER);
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 2 } }),
    );
  });

  it('gives an admin every entry, unfiltered, when no providerId is given', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    await queueService.listQueue(ADMIN);
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('lets an admin narrow to a single provider', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    await queueService.listQueue(ADMIN, { providerId: '9' });
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 9 } }),
    );
  });

  it('returns an empty array for an empty queue without error', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findMany.mockResolvedValue([]);
    const result = await queueService.listQueue(PROVIDER_USER);
    expect(result).toEqual([]);
  });

  it('returns an empty array for a customer with no queue entries, without a second query', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    const result = await queueService.listQueue(CUSTOMER);
    expect(result).toEqual([]);
    expect(prisma.queueEntry.findMany).toHaveBeenCalledTimes(1);
  });

  it("gives a customer their own entry's correct position/wait using the full provider queue, without returning other rows", async () => {
    const mine = queueEntry({
      id: 5,
      customerId: 33,
      status: 'WAITING',
      position: 2,
      providerService: { id: 5, providerId: 2, name: 'Oil Change', durationMinutes: 20 },
    });
    const someoneInService = queueEntry({
      id: 1,
      customerId: 999,
      customerName: 'Someone Else',
      status: 'IN_SERVICE',
      position: 1,
      startedAt: new Date(),
      providerService: { id: 6, providerId: 2, name: 'Battery Check', durationMinutes: 30 },
    });

    prisma.queueEntry.findMany
      .mockResolvedValueOnce([mine]) // the customer's own rows
      .mockResolvedValueOnce([someoneInService, mine]); // full provider queue for estimation

    const [result] = await queueService.listQueue(CUSTOMER);

    expect(result.id).toBe(5);
    expect(result.customersAhead).toBe(1);
    expect(result.estimatedWaitMinutes).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain('Someone Else');
  });
});

describe('getQueueSummary', () => {
  it('returns only an aggregate count and wait — no entry-level detail', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([
      {
        status: 'IN_SERVICE',
        startedAt: new Date(),
        providerService: { durationMinutes: 30 },
      },
      { status: 'WAITING', providerService: { durationMinutes: 20 } },
      { status: 'WAITING', providerService: { durationMinutes: 15 } },
    ]);

    const summary = await queueService.getQueueSummary('2');

    expect(summary).toEqual({
      providerId: 2,
      queueLength: 3,
      estimatedWaitMinutes: expect.any(Number),
    });
    expect(summary.estimatedWaitMinutes).toBeGreaterThanOrEqual(64); // ~30 + 20 + 15
    expect(Object.keys(summary)).toEqual(['providerId', 'queueLength', 'estimatedWaitMinutes']);
  });

  it('returns zero for a provider with no active queue entries', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    const summary = await queueService.getQueueSummary('2');
    expect(summary).toEqual({ providerId: 2, queueLength: 0, estimatedWaitMinutes: 0 });
  });

  it('rejects a non-integer provider id', async () => {
    await expect(queueService.getQueueSummary('abc')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('getProviderQueueSnapshot', () => {
  it('feeds the Socket.IO layer a full active-entries list plus the same summary getQueueSummary would return', async () => {
    const active = [
      queueEntry({
        id: 1,
        status: 'IN_SERVICE',
        position: 1,
        customerId: 33,
        startedAt: new Date(),
        providerService: { id: 5, providerId: 2, name: 'Oil Change', durationMinutes: 30 },
      }),
      queueEntry({
        id: 2,
        status: 'WAITING',
        position: 2,
        customerId: 44,
        providerService: { id: 6, providerId: 2, name: 'Tire Repair', durationMinutes: 20 },
      }),
    ];
    prisma.queueEntry.findMany.mockResolvedValue(active);

    const snapshot = await queueService.getProviderQueueSnapshot(2);

    expect(snapshot.providerId).toBe(2);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries.map((e) => e.id)).toEqual([1, 2]);
    // Each active, customer-linked entry carries its own privacy-safe
    // numbers — this is exactly what gets pushed to that customer alone.
    expect(snapshot.entries[1].customersAhead).toBe(1);
    expect(snapshot.summary).toEqual({
      providerId: 2,
      queueLength: 2,
      estimatedWaitMinutes: expect.any(Number),
    });
  });

  it('excludes COMPLETED/CANCELLED history — only the live queue, not an audit log', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([]);
    const snapshot = await queueService.getProviderQueueSnapshot(2);
    expect(snapshot.entries).toEqual([]);
    expect(snapshot.summary.queueLength).toBe(0);
    // Confirms the query itself is scoped to WAITING/IN_SERVICE, not "all
    // history for this provider".
    expect(prisma.queueEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['WAITING', 'IN_SERVICE'] } }),
      }),
    );
  });
});

describe('getQueueEntryById', () => {
  it('404s when missing', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(null);
    await expect(queueService.getQueueEntryById(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("blocks a customer from viewing another customer's entry", async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry({ customerId: 33 }));
    await expect(queueService.getQueueEntryById(1, OTHER_CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets the owning customer view their own entry', async () => {
    const entry = queueEntry({ customerId: 33 });
    prisma.queueEntry.findUnique.mockResolvedValue(entry);
    prisma.queueEntry.findMany.mockResolvedValue([entry]);
    await expect(queueService.getQueueEntryById(1, CUSTOMER)).resolves.toBeDefined();
  });

  it("blocks a provider from viewing another business's entry", async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry());
    await expect(queueService.getQueueEntryById(1, OTHER_PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prisma.provider.findUnique).toHaveBeenCalledWith({ where: { userId: 88 } });
  });

  it('lets the owning provider and an admin view any entry', async () => {
    const entry = queueEntry();
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findUnique.mockResolvedValue(entry);
    prisma.queueEntry.findMany.mockResolvedValue([entry]);
    await expect(queueService.getQueueEntryById(1, PROVIDER_USER)).resolves.toBeDefined();
    await expect(queueService.getQueueEntryById(1, ADMIN)).resolves.toBeDefined();
  });

  it("computes the caller's wait/position from the full provider queue without leaking other rows", async () => {
    // Same setup as the audited bug: a customer's own row alone would look
    // like an empty line ahead of them. Feeding the full provider queue
    // into the estimate must still only return this customer's own entry.
    const mine = queueEntry({
      id: 5,
      customerId: 33,
      status: 'WAITING',
      position: 3,
      providerService: { id: 5, providerId: 2, name: 'Oil Change', durationMinutes: 20 },
    });
    const someoneInService = queueEntry({
      id: 1,
      customerId: 999,
      customerName: 'Someone Else',
      status: 'IN_SERVICE',
      position: 1,
      startedAt: new Date(),
      providerService: { id: 6, providerId: 2, name: 'Battery Check', durationMinutes: 30 },
    });
    const someoneWaitingAhead = queueEntry({
      id: 2,
      customerId: 888,
      customerName: 'Another Person',
      status: 'WAITING',
      position: 2,
      providerService: { id: 7, providerId: 2, name: 'Tire Repair', durationMinutes: 15 },
    });

    prisma.queueEntry.findUnique.mockResolvedValue(mine);
    prisma.queueEntry.findMany.mockResolvedValue([someoneInService, someoneWaitingAhead, mine]);

    const result = await queueService.getQueueEntryById(5, CUSTOMER);

    expect(result.id).toBe(5);
    expect(result.customersAhead).toBe(2); // the in-service one + the one waiting ahead
    expect(result.estimatedWaitMinutes).toBeGreaterThanOrEqual(45); // ~30 + 15
    // Never leaks the other rows themselves.
    expect(result.customerName).toBe('Walk-in Customer');
    expect(JSON.stringify(result)).not.toContain('Someone Else');
    expect(JSON.stringify(result)).not.toContain('Another Person');
  });
});

describe('createQueueEntry — walk-in', () => {
  it('rejects a customer outright', async () => {
    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: 'Sam' }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a missing customerName', async () => {
    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: '  ' }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects providing neither bookingId nor walk-in fields', async () => {
    await expect(queueService.createQueueEntry({}, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects providing both bookingId and walk-in fields', async () => {
    await expect(
      queueService.createQueueEntry(
        { bookingId: 10, providerServiceId: 5, customerName: 'Sam' },
        PROVIDER_USER,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s when the service does not exist', async () => {
    prisma.providerService.findUnique.mockResolvedValue(null);
    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: 'Sam' }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks a provider from adding a walk-in to another business's service", async () => {
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: 999 });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: 'Sam' }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('assigns position = last position + 1 for that provider', async () => {
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: 2 });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findFirst.mockResolvedValue({ position: 3 });
    prisma.queueEntry.create.mockResolvedValue(queueEntry({ position: 4 }));

    await queueService.createQueueEntry(
      { providerServiceId: 5, customerName: 'Sam' },
      PROVIDER_USER,
    );

    expect(prisma.queueEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 4, status: 'WAITING' }) }),
    );
  });

  it('starts a new provider queue at position 1', async () => {
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: 2 });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findFirst.mockResolvedValue(null);
    prisma.queueEntry.create.mockResolvedValue(queueEntry({ position: 1 }));

    await queueService.createQueueEntry(
      { providerServiceId: 5, customerName: 'Sam' },
      PROVIDER_USER,
    );

    expect(prisma.queueEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 1 }) }),
    );
  });

  it('lets an admin add a walk-in for any provider without an ownership check', async () => {
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: 2 });
    prisma.queueEntry.findFirst.mockResolvedValue(null);
    prisma.queueEntry.create.mockResolvedValue(queueEntry());

    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: 'Sam' }, ADMIN),
    ).resolves.toBeDefined();
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it('translates a unique-constraint race into a clean 409', async () => {
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: 2 });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findFirst.mockResolvedValue(null);
    const raceErr = new Error('Unique constraint failed');
    raceErr.code = 'P2002';
    prisma.queueEntry.create.mockRejectedValue(raceErr);

    await expect(
      queueService.createQueueEntry({ providerServiceId: 5, customerName: 'Sam' }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('createQueueEntry — booking-backed', () => {
  it('404s when the booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(
      queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks a provider from enqueueing another business's booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(
      bookingRecord('ARRIVED', { providerService: { id: 5, providerId: 999, provider: { id: 999, userId: 5555 } } }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a booking that already has a queue entry (duplicate prevention)', async () => {
    prisma.booking.findUnique.mockResolvedValue(
      bookingRecord('ARRIVED', { queueEntry: { id: 99 } }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects a booking that has not reached ARRIVED (invalid booking status)', async () => {
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('CONFIRMED'));
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a COMPLETED booking from being (re-)added', async () => {
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('COMPLETED'));
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates the entry and synchronizes the booking to IN_QUEUE', async () => {
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('ARRIVED'));
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findFirst.mockResolvedValue(null);
    prisma.queueEntry.create.mockResolvedValue(queueEntry({ bookingId: 10, customerId: 33 }));
    prisma.booking.update.mockResolvedValue({ id: 10, status: 'IN_QUEUE' });
    // Post-sync re-fetch (so the returned entry's nested booking.status
    // reflects IN_QUEUE, not the pre-sync ARRIVED it was created with).
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ bookingId: 10, customerId: 33, booking: { id: 10, status: 'IN_QUEUE' } }),
    );

    const entry = await queueService.createQueueEntry({ bookingId: 10 }, PROVIDER_USER);

    expect(prisma.queueEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 10,
          customerId: 33,
          customerName: 'Layla Hassan',
          status: 'WAITING',
        }),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ status: 'IN_QUEUE' }),
      }),
    );
    expect(entry).toBeDefined();
  });

  it('lets an admin enqueue any booking without an ownership check', async () => {
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('ARRIVED'));
    prisma.queueEntry.findFirst.mockResolvedValue(null);
    prisma.queueEntry.create.mockResolvedValue(queueEntry({ bookingId: 10 }));
    prisma.booking.update.mockResolvedValue({ id: 10, status: 'IN_QUEUE' });
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry({ bookingId: 10 }));

    await expect(queueService.createQueueEntry({ bookingId: 10 }, ADMIN)).resolves.toBeDefined();
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });
});

describe('updateQueueEntryStatus', () => {
  it('rejects a customer outright', async () => {
    await expect(
      queueService.updateQueueEntryStatus(1, 'IN_SERVICE', CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('404s when missing', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(null);
    await expect(
      queueService.updateQueueEntryStatus(1, 'IN_SERVICE', PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks a provider from moving another business's entry", async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry());
    prisma.provider.findUnique.mockResolvedValue({ id: 999 });
    await expect(
      queueService.updateQueueEntryStatus(1, 'IN_SERVICE', PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an edge that does not exist in the state machine', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry({ status: 'WAITING' }));
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.updateQueueEntryStatus(1, 'COMPLETED', PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('starts service on a walk-in without touching any booking', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry({ status: 'WAITING', bookingId: null }));
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.update.mockResolvedValue(queueEntry({ status: 'IN_SERVICE' }));

    await queueService.updateQueueEntryStatus(1, 'IN_SERVICE', PROVIDER_USER);

    expect(prisma.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_SERVICE', startedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('starting service on a booking-linked entry synchronizes the booking to IN_SERVICE and returns the fresh status', async () => {
    prisma.queueEntry.findUnique
      .mockResolvedValueOnce(queueEntry({ status: 'WAITING', bookingId: 10, customerId: 33 })) // initial fetch
      .mockResolvedValueOnce(
        queueEntry({
          status: 'IN_SERVICE',
          bookingId: 10,
          customerId: 33,
          booking: { id: 10, status: 'IN_SERVICE' },
        }),
      ); // post-sync re-fetch
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.update.mockResolvedValue(queueEntry({ status: 'IN_SERVICE', bookingId: 10 }));
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('IN_QUEUE'));
    prisma.booking.update.mockResolvedValue({ id: 10, status: 'IN_SERVICE' });

    const result = await queueService.updateQueueEntryStatus(1, 'IN_SERVICE', PROVIDER_USER);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_SERVICE' }) }),
    );
    // The fix under test: the returned entry's nested booking must reflect
    // the just-synced status, not the pre-sync one it was fetched with.
    expect(result.booking.status).toBe('IN_SERVICE');
  });

  it('completing service synchronizes a linked booking to COMPLETED with completedAt', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ status: 'IN_SERVICE', bookingId: 10, customerId: 33 }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.update.mockResolvedValue(queueEntry({ status: 'COMPLETED', bookingId: 10 }));
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('IN_SERVICE'));
    prisma.booking.update.mockResolvedValue({ id: 10, status: 'COMPLETED' });

    await queueService.updateQueueEntryStatus(1, 'COMPLETED', PROVIDER_USER);

    expect(prisma.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      }),
    );
    // A queue-driven completion reaches the same finance hook a direct
    // booking completion does (see booking.service.js's updateBookingStatus)
    // — the FinancialTransaction is created inside the same transaction as
    // both the queue entry and booking status updates.
    expect(financeService.createTransactionForCompletedBooking).toHaveBeenCalledWith(
      { id: 10, status: 'COMPLETED' },
      prisma,
    );
  });

  it('rolls back the whole operation when booking synchronization is impossible', async () => {
    // The queue entry says WAITING (so the queue-level edge to IN_SERVICE
    // is legal), but the linked booking has drifted to a status with no
    // IN_SERVICE edge — booking.service.js's own validation must reject
    // this, and that rejection must propagate out of updateQueueEntryStatus
    // instead of the queue status change silently going through anyway.
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ status: 'WAITING', bookingId: 10, customerId: 33 }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.update.mockResolvedValue(queueEntry({ status: 'IN_SERVICE', bookingId: 10 }));
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('CANCELLED'));

    await expect(
      queueService.updateQueueEntryStatus(1, 'IN_SERVICE', PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lets an admin drive any queue entry', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry({ status: 'WAITING' }));
    prisma.queueEntry.update.mockResolvedValue(queueEntry({ status: 'IN_SERVICE' }));
    await expect(
      queueService.updateQueueEntryStatus(1, 'IN_SERVICE', ADMIN),
    ).resolves.toBeDefined();
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });
});

describe('removeQueueEntry', () => {
  it('rejects a customer outright', async () => {
    await expect(queueService.removeQueueEntry(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('404s when missing', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(null);
    await expect(queueService.removeQueueEntry(1, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("blocks a provider from removing another business's entry", async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(queueEntry());
    prisma.provider.findUnique.mockResolvedValue({ id: 999 });
    await expect(queueService.removeQueueEntry(1, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('removes a walk-in regardless of status without touching any booking, and returns a socket-friendly summary', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ id: 7, status: 'IN_SERVICE', bookingId: null, customerId: null }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.delete.mockResolvedValue({});

    const result = await queueService.removeQueueEntry(1, PROVIDER_USER);

    expect(prisma.queueEntry.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 7, providerId: 2, customerId: null, bookingId: null });
  });

  it('removing a WAITING booking-linked entry cancels the linked booking and returns its ids for the socket layer', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ id: 8, status: 'WAITING', bookingId: 10, customerId: 33 }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.delete.mockResolvedValue({});
    prisma.booking.findUnique.mockResolvedValue(bookingRecord('IN_QUEUE'));
    prisma.booking.update.mockResolvedValue({ id: 10, status: 'CANCELLED' });

    const result = await queueService.removeQueueEntry(1, PROVIDER_USER);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      }),
    );
    expect(result).toEqual({ id: 8, providerId: 2, customerId: 33, bookingId: 10 });
  });

  it('refuses to remove an IN_SERVICE booking-linked entry (no valid booking edge exists)', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ status: 'IN_SERVICE', bookingId: 10, customerId: 33 }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });

    await expect(queueService.removeQueueEntry(1, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.queueEntry.delete).not.toHaveBeenCalled();
  });

  it('removes a COMPLETED booking-linked entry without re-touching the (already terminal) booking', async () => {
    prisma.queueEntry.findUnique.mockResolvedValue(
      queueEntry({ status: 'COMPLETED', bookingId: 10, customerId: 33 }),
    );
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.delete.mockResolvedValue({});

    await queueService.removeQueueEntry(1, PROVIDER_USER);

    expect(prisma.queueEntry.delete).toHaveBeenCalled();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});

describe('reorderQueue', () => {
  it('rejects a customer outright', async () => {
    await expect(
      queueService.reorderQueue({ orderedIds: [1, 2] }, CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an empty list', async () => {
    await expect(
      queueService.reorderQueue({ orderedIds: [] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects duplicate ids', async () => {
    await expect(
      queueService.reorderQueue({ orderedIds: [1, 1] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s when an id does not exist', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([queueEntry({ id: 1 })]);
    await expect(
      queueService.reorderQueue({ orderedIds: [1, 2] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects ids spanning more than one provider', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([
      queueEntry({ id: 1, providerId: 2 }),
      queueEntry({ id: 2, providerId: 3 }),
    ]);
    await expect(
      queueService.reorderQueue({ orderedIds: [1, 2] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a non-WAITING entry in the list', async () => {
    prisma.queueEntry.findMany.mockResolvedValue([
      queueEntry({ id: 1, providerId: 2, status: 'WAITING' }),
      queueEntry({ id: 2, providerId: 2, status: 'IN_SERVICE' }),
    ]);
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      queueService.reorderQueue({ orderedIds: [1, 2] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("blocks a provider from reordering another business's queue", async () => {
    prisma.queueEntry.findMany.mockResolvedValue([
      queueEntry({ id: 1, providerId: 2, status: 'WAITING' }),
    ]);
    prisma.provider.findUnique.mockResolvedValue({ id: 999 });
    await expect(
      queueService.reorderQueue({ orderedIds: [1] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a partial subset of the current WAITING set (determinism guard)', async () => {
    prisma.queueEntry.findMany
      .mockResolvedValueOnce([queueEntry({ id: 1, providerId: 2, status: 'WAITING' })])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]); // full current WAITING set has 2 entries
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });

    await expect(
      queueService.reorderQueue({ orderedIds: [1] }, PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('swaps positions via a two-phase update with no duplicate positions', async () => {
    const entryA = queueEntry({ id: 1, providerId: 2, status: 'WAITING', position: 1 });
    const entryB = queueEntry({ id: 2, providerId: 2, status: 'WAITING', position: 2 });
    prisma.queueEntry.findMany
      .mockResolvedValueOnce([entryA, entryB]) // fetch by ids
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // current WAITING set check
      .mockResolvedValueOnce([entryB, entryA]); // final re-fetch, now reordered
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.update.mockResolvedValue({});

    // Reverse the order: entry 2 should end up ahead of entry 1.
    await queueService.reorderQueue({ orderedIds: [2, 1] }, PROVIDER_USER);

    const calls = prisma.queueEntry.update.mock.calls.map((c) => c[0]);
    // Phase 1: each row moved to its own positive sentinel (never negative
    // — the schema has a DB-level CHECK (position > 0)).
    expect(calls).toContainEqual({ where: { id: 2 }, data: { position: 1_000_000_002 } });
    expect(calls).toContainEqual({ where: { id: 1 }, data: { position: 1_000_000_001 } });
    // Phase 2: positions 1 and 2 (the original set) reassigned in the new order.
    expect(calls).toContainEqual({ where: { id: 2 }, data: { position: 1 } });
    expect(calls).toContainEqual({ where: { id: 1 }, data: { position: 2 } });
    // No position value appears twice among the final-phase writes.
    const finalPositions = calls
      .filter((c) => c.data.position < 1_000_000_000)
      .map((c) => c.data.position);
    expect(new Set(finalPositions).size).toBe(finalPositions.length);
  });
});

describe('waiting-time calculation', () => {
  it('derives estimated wait from real service durations and remaining in-service time', async () => {
    const inService = queueEntry({
      id: 1,
      status: 'IN_SERVICE',
      position: 1,
      startedAt: new Date(Date.now() - 10 * 60_000), // started 10 min ago
      providerService: { id: 5, providerId: 2, name: 'Oil Change', durationMinutes: 30 }, // ~20 left
    });
    const waitingFirst = queueEntry({
      id: 2,
      status: 'WAITING',
      position: 2,
      providerService: { id: 6, providerId: 2, name: 'Tire Repair', durationMinutes: 20 },
    });
    const waitingSecond = queueEntry({
      id: 3,
      status: 'WAITING',
      position: 3,
      providerService: { id: 7, providerId: 2, name: 'Battery Check', durationMinutes: 15 },
    });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findMany.mockResolvedValue([inService, waitingFirst, waitingSecond]);

    const result = await queueService.listQueue(PROVIDER_USER);

    const first = result.find((e) => e.id === 2);
    const second = result.find((e) => e.id === 3);
    const inServiceResult = result.find((e) => e.id === 1);

    expect(first.estimatedWaitMinutes).toBeGreaterThanOrEqual(19);
    expect(first.estimatedWaitMinutes).toBeLessThanOrEqual(21);
    expect(second.estimatedWaitMinutes).toBeGreaterThanOrEqual(first.estimatedWaitMinutes + 20 - 1);
    // An IN_SERVICE entry doesn't get a "waiting" estimate of its own.
    expect(inServiceResult.estimatedWaitMinutes).toBeNull();
  });

  it('gives the front-of-line WAITING entry a wait of 0 when nobody is in service', async () => {
    const onlyWaiting = queueEntry({ id: 1, status: 'WAITING', position: 1 });
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.queueEntry.findMany.mockResolvedValue([onlyWaiting]);

    const [result] = await queueService.listQueue(PROVIDER_USER);
    expect(result.estimatedWaitMinutes).toBe(0);
  });
});
