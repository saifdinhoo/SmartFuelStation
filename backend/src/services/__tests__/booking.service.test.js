jest.mock('../../config/prisma', () => ({
  providerService: { findUnique: jest.fn() },
  booking: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  provider: { findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const bookingService = require('../booking.service');

const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const OTHER_CUSTOMER = { userId: 99, role: 'CUSTOMER' };
const PROVIDER_USER = { userId: 77, role: 'PROVIDER' };
const ADMIN = { userId: 1, role: 'ADMIN' };

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function availableService(overrides = {}) {
  return {
    id: 5,
    providerId: 2,
    durationMinutes: 30,
    price: 25,
    isAvailable: true,
    provider: { id: 2, isApproved: true },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createBooking', () => {
  it('rejects an invalid providerServiceId', async () => {
    await expect(
      bookingService.createBooking({
        customerId: 33,
        providerServiceId: 'abc',
        scheduledAt: FUTURE,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an unparseable date', async () => {
    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: 'nope' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a date in the past', async () => {
    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: PAST }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s when the service does not exist', async () => {
    prisma.providerService.findUnique.mockResolvedValue(null);
    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: FUTURE }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects booking an unavailable service', async () => {
    prisma.providerService.findUnique.mockResolvedValue(availableService({ isAvailable: false }));
    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: FUTURE }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects booking an unapproved provider', async () => {
    prisma.providerService.findUnique.mockResolvedValue(
      availableService({ provider: { id: 2, isApproved: false } }),
    );
    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: FUTURE }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an overlapping booking for the same provider', async () => {
    prisma.providerService.findUnique.mockResolvedValue(availableService());
    const newStart = new Date(FUTURE);
    const existingStart = new Date(newStart.getTime() + 10 * 60_000); // overlaps 30-min slot
    prisma.booking.findMany.mockResolvedValue([
      {
        scheduledAt: existingStart,
        providerService: { durationMinutes: 30 },
      },
    ]);

    await expect(
      bookingService.createBooking({ customerId: 33, providerServiceId: 5, scheduledAt: FUTURE }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows a non-overlapping booking and snapshots the price', async () => {
    prisma.providerService.findUnique.mockResolvedValue(availableService());
    const newStart = new Date(FUTURE);
    const farAway = new Date(newStart.getTime() + 5 * 60 * 60_000); // 5h later, no overlap
    prisma.booking.findMany.mockResolvedValue([
      { scheduledAt: farAway, providerService: { durationMinutes: 30 } },
    ]);
    prisma.booking.create.mockResolvedValue({ id: 1, priceAtBooking: 25 });

    await bookingService.createBooking({
      customerId: 33,
      providerServiceId: 5,
      scheduledAt: FUTURE,
    });

    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: 33, providerServiceId: 5, priceAtBooking: 25 }),
      }),
    );
  });
});

describe('listBookings', () => {
  it('scopes a customer to their own bookings', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    await bookingService.listBookings(CUSTOMER);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 33 } }),
    );
  });

  it("scopes a provider to their own business's bookings", async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.booking.findMany.mockResolvedValue([]);
    await bookingService.listBookings(PROVIDER_USER);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerService: { providerId: 2 } } }),
    );
  });

  it('rejects a provider account with no linked business', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(bookingService.listBookings(PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('gives an admin every booking, unfiltered', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    await bookingService.listBookings(ADMIN);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});

describe('getBookingById', () => {
  function booking(overrides = {}) {
    return {
      id: 1,
      customerId: 33,
      status: 'PENDING',
      providerService: { provider: { userId: 77 } },
      ...overrides,
    };
  }

  it('404s when missing', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(bookingService.getBookingById(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('blocks a customer from viewing another customer’s booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking());
    await expect(bookingService.getBookingById(1, OTHER_CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("blocks a provider from viewing another business's booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(
      booking({ providerService: { provider: { userId: 999 } } }),
    );
    await expect(bookingService.getBookingById(1, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets the owning customer, the owning provider, and an admin all view it', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking());
    await expect(bookingService.getBookingById(1, CUSTOMER)).resolves.toBeDefined();
    await expect(bookingService.getBookingById(1, PROVIDER_USER)).resolves.toBeDefined();
    await expect(bookingService.getBookingById(1, ADMIN)).resolves.toBeDefined();
  });
});

describe('updateBookingStatus', () => {
  function booking(status, overrides = {}) {
    return {
      id: 1,
      customerId: 33,
      status,
      providerService: { provider: { userId: 77 } },
      ...overrides,
    };
  }

  it('rejects a nonsense status string', async () => {
    await expect(
      bookingService.updateBookingStatus(1, 'DELIVERED', CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s when the booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(
      bookingService.updateBookingStatus(1, 'CANCELLED', CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an edge that does not exist in the state machine', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    await expect(
      bookingService.updateBookingStatus(1, 'IN_SERVICE', PROVIDER_USER),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a role attempting an edge it is not permitted to drive', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    await expect(
      bookingService.updateBookingStatus(1, 'CONFIRMED', CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lets the customer cancel their own PENDING booking, setting cancelledAt', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    prisma.booking.update.mockResolvedValue({ id: 1, status: 'CANCELLED' });

    await bookingService.updateBookingStatus(1, 'CANCELLED', CUSTOMER);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      }),
    );
  });

  it('blocks the customer from cancelling once the booking has moved to ARRIVED', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('ARRIVED'));
    await expect(
      bookingService.updateBookingStatus(1, 'CANCELLED', CUSTOMER),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('walks a booking through the full provider-driven lifecycle', async () => {
    const steps = [
      ['PENDING', 'CONFIRMED'],
      ['CONFIRMED', 'ARRIVED'],
      ['ARRIVED', 'IN_QUEUE'],
      ['IN_QUEUE', 'IN_SERVICE'],
      ['IN_SERVICE', 'COMPLETED'],
    ];
    for (const [from, to] of steps) {
      prisma.booking.findUnique.mockResolvedValue(booking(from));
      prisma.booking.update.mockResolvedValue({ id: 1, status: to });
      await expect(
        bookingService.updateBookingStatus(1, to, PROVIDER_USER),
      ).resolves.toBeDefined();
    }
  });

  it('sets completedAt when a booking is completed', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('IN_SERVICE'));
    prisma.booking.update.mockResolvedValue({ id: 1, status: 'COMPLETED' });

    await bookingService.updateBookingStatus(1, 'COMPLETED', PROVIDER_USER);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      }),
    );
  });
});

describe('deleteBooking', () => {
  function booking(status, overrides = {}) {
    return { id: 1, customerId: 33, status, ...overrides };
  }

  it('404s when the booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(bookingService.deleteBooking(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lets a customer withdraw their own still-PENDING booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    prisma.booking.delete.mockResolvedValue({});
    await bookingService.deleteBooking(1, CUSTOMER);
    expect(prisma.booking.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('blocks a customer from deleting their own CONFIRMED booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('CONFIRMED'));
    await expect(bookingService.deleteBooking(1, CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("blocks a customer from deleting someone else's booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    await expect(bookingService.deleteBooking(1, OTHER_CUSTOMER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('blocks a provider from deleting a booking entirely', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('PENDING'));
    await expect(bookingService.deleteBooking(1, PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets an admin delete a booking regardless of status', async () => {
    prisma.booking.findUnique.mockResolvedValue(booking('COMPLETED'));
    prisma.booking.delete.mockResolvedValue({});
    await bookingService.deleteBooking(1, ADMIN);
    expect(prisma.booking.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
