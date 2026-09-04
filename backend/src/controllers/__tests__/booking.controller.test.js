jest.mock('../../services/booking.service');
jest.mock('../../sockets/queueEvents');
jest.mock('../../services/notification.service');
jest.mock('../../services/auditLog.service');

const bookingService = require('../../services/booking.service');
const socketEvents = require('../../sockets/queueEvents');
const notificationService = require('../../services/notification.service');
const auditLogService = require('../../services/auditLog.service');
const bookingController = require('../booking.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('create', () => {
  it('notifies the owning provider (never the customer who acted) using server-derived data', async () => {
    const booking = {
      id: 1,
      scheduledAt: new Date('2026-01-01T15:00:00Z'),
      providerService: {
        name: 'Oil Change',
        provider: { id: 2, userId: 77, businessName: 'Al-Nour Auto' },
      },
    };
    bookingService.createBooking.mockResolvedValue(booking);
    const req = {
      user: { userId: 33, role: 'CUSTOMER' },
      body: { providerServiceId: 5, scheduledAt: '2026-01-01T15:00:00Z' },
    };
    const res = fakeRes();

    await bookingController.create(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 77, type: 'BOOKING_CREATED', relatedBookingId: 1 }),
    );
    expect(socketEvents.notifyProviderAvailabilityChanged).toHaveBeenCalledWith({ providerId: 2 });
  });

  it('a notification failure never turns an already-sent 201 into an error', async () => {
    bookingService.createBooking.mockResolvedValue({
      id: 1,
      scheduledAt: new Date(),
      providerService: { name: 'Oil Change', provider: { userId: 77, businessName: 'Al-Nour' } },
    });
    notificationService.createNotification.mockRejectedValue(new Error('db down'));
    const res = fakeRes();
    const next = jest.fn();

    await bookingController.create(
      { user: { userId: 33, role: 'CUSTOMER' }, body: {} },
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('updateStatus', () => {
  function booking(status, overrides = {}) {
    return {
      id: 1,
      status,
      customerId: 33,
      scheduledAt: new Date('2026-01-01T15:00:00Z'),
      providerService: { provider: { id: 2, userId: 77, businessName: 'Al-Nour Auto' } },
      ...overrides,
    };
  }

  it('notifies the customer exactly once when a provider confirms', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CONFIRMED'));
    const req = { user: { userId: 77, role: 'PROVIDER' }, params: { id: 1 }, body: { status: 'CONFIRMED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 33, type: 'BOOKING_CONFIRMED' }),
    );
  });

  it('notifies the provider (not the customer who acted) when the customer cancels', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CANCELLED'));
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { id: 1 }, body: { status: 'CANCELLED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 77, type: 'BOOKING_CANCELLED' }),
    );
  });

  it('notifies the customer (not the provider who acted) when the provider cancels', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CANCELLED'));
    const req = { user: { userId: 77, role: 'PROVIDER' }, params: { id: 1 }, body: { status: 'CANCELLED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 33, type: 'BOOKING_CANCELLED' }),
    );
  });

  it('sends no notification for ARRIVED (front-desk check-in, not noteworthy)', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('ARRIVED'));
    const req = { user: { userId: 77, role: 'PROVIDER' }, params: { id: 1 }, body: { status: 'ARRIVED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('still emits the existing booking:status_changed socket event unchanged', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CONFIRMED'));
    const req = { user: { userId: 77, role: 'PROVIDER' }, params: { id: 1 }, body: { status: 'CONFIRMED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(socketEvents.notifyBookingStatusChanged).toHaveBeenCalledWith(33, 1, 'CONFIRMED', 2);
  });

  it('also broadcasts an availability-changed event for the owning provider', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CANCELLED'));
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { id: 1 }, body: { status: 'CANCELLED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(socketEvents.notifyProviderAvailabilityChanged).toHaveBeenCalledWith({ providerId: 2 });
  });

  it('records a BOOKING_STATUS_CHANGED audit entry when an ADMIN changes the status', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CANCELLED'));
    const req = { user: { userId: 1, role: 'ADMIN' }, params: { id: 1 }, body: { status: 'CANCELLED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'BOOKING_STATUS_CHANGED',
        entityType: 'Booking',
        entityId: 1,
      }),
    );
  });

  it('does not record an audit entry when a customer or provider changes their own booking', async () => {
    bookingService.updateBookingStatus.mockResolvedValue(booking('CONFIRMED'));
    const req = { user: { userId: 77, role: 'PROVIDER' }, params: { id: 1 }, body: { status: 'CONFIRMED' } };

    await bookingController.updateStatus(req, fakeRes(), jest.fn());

    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});
