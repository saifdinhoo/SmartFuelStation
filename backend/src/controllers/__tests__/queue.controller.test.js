jest.mock('../../services/queue.service');
jest.mock('../../sockets/queueEvents');
jest.mock('../../services/notification.service');

const queueService = require('../../services/queue.service');
const socketEvents = require('../../sockets/queueEvents');
const notificationService = require('../../services/notification.service');
const queueController = require('../queue.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

const PROVIDER = { userId: 77, role: 'PROVIDER' };

beforeEach(() => {
  jest.resetAllMocks();
  socketEvents.broadcastProviderQueueUpdate.mockResolvedValue(null);
});

describe('create', () => {
  it('notifies the linked customer that they joined the queue', async () => {
    const entry = {
      id: 10,
      providerId: 2,
      bookingId: null,
      customerId: 33,
      provider: { businessName: 'Al-Nour Auto' },
    };
    queueService.createQueueEntry.mockResolvedValue(entry);

    await queueController.create({ user: PROVIDER, body: {} }, fakeRes(), jest.fn());

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 33, type: 'QUEUE_JOINED', relatedQueueEntryId: 10 }),
    );
  });

  it('sends no QUEUE_JOINED notification for a walk-in with no linked account', async () => {
    queueService.createQueueEntry.mockResolvedValue({
      id: 10,
      providerId: 2,
      bookingId: null,
      customerId: null,
      provider: { businessName: 'Al-Nour Auto' },
    });

    await queueController.create({ user: PROVIDER, body: {} }, fakeRes(), jest.fn());

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('checks for an "almost your turn" notification using the fresh broadcast snapshot', async () => {
    const snapshot = { providerId: 2, entries: [] };
    socketEvents.broadcastProviderQueueUpdate.mockResolvedValue(snapshot);
    queueService.createQueueEntry.mockResolvedValue({
      id: 10,
      providerId: 2,
      bookingId: null,
      customerId: null,
    });

    await queueController.create({ user: PROVIDER, body: {} }, fakeRes(), jest.fn());

    expect(notificationService.notifyAlmostTurnIfNeeded).toHaveBeenCalledWith(snapshot);
  });
});

describe('updateStatus', () => {
  function entry(overrides = {}) {
    return {
      id: 10,
      providerId: 2,
      customerId: 33,
      bookingId: 5,
      provider: { businessName: 'Al-Nour Auto', userId: 77 },
      booking: { status: 'IN_SERVICE', customerId: 33, scheduledAt: new Date('2026-01-01T15:00:00Z') },
      ...overrides,
    };
  }

  it('notifies the customer once when the linked booking syncs to IN_SERVICE', async () => {
    queueService.updateQueueEntryStatus.mockResolvedValue(entry());

    await queueController.updateStatus(
      { user: PROVIDER, params: { id: 10 }, body: { status: 'IN_SERVICE' } },
      fakeRes(),
      jest.fn(),
    );

    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 33, type: 'SERVICE_STARTED' }),
    );
  });

  it('sends no booking-sync notification for a walk-in entry with no linked booking', async () => {
    queueService.updateQueueEntryStatus.mockResolvedValue(
      entry({ bookingId: null, booking: null }),
    );

    await queueController.updateStatus(
      { user: PROVIDER, params: { id: 10 }, body: { status: 'IN_SERVICE' } },
      fakeRes(),
      jest.fn(),
    );

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('notifies the customer of cancellation when a booking-linked WAITING entry is removed', async () => {
    queueService.removeQueueEntry.mockResolvedValue({
      id: 10,
      providerId: 2,
      customerId: 33,
      bookingId: 5,
    });

    await queueController.remove({ user: PROVIDER, params: { id: 10 } }, fakeRes(), jest.fn());

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 33, type: 'BOOKING_CANCELLED', relatedBookingId: 5 }),
    );
  });

  it('sends no booking-cancelled notification when the removed entry had no linked booking', async () => {
    queueService.removeQueueEntry.mockResolvedValue({
      id: 10,
      providerId: 2,
      customerId: 33,
      bookingId: null,
    });

    await queueController.remove({ user: PROVIDER, params: { id: 10 } }, fakeRes(), jest.fn());

    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });
});

describe('reorder', () => {
  it('checks for an "almost your turn" notification after a reorder', async () => {
    const snapshot = { providerId: 2, entries: [] };
    socketEvents.broadcastProviderQueueUpdate.mockResolvedValue(snapshot);
    queueService.reorderQueue.mockResolvedValue([{ id: 1, providerId: 2 }]);

    await queueController.reorder({ user: PROVIDER, body: { orderedIds: [1] } }, fakeRes(), jest.fn());

    expect(notificationService.notifyAlmostTurnIfNeeded).toHaveBeenCalledWith(snapshot);
  });
});
