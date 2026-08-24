jest.mock('../index', () => ({
  getIO: jest.fn(),
  roomForUser: (id) => `user:${id}`,
  roomForProvider: (id) => `provider:${id}`,
}));
jest.mock('../../services/queue.service', () => ({
  getProviderQueueSnapshot: jest.fn(),
}));

const { getIO } = require('../index');
const queueService = require('../../services/queue.service');
const socketEvents = require('../queueEvents');

// `.to()` is chainable in Socket.IO v4 and returns a new operator, so the
// fake does too. `rooms` collects every room targeted across a chain,
// which `io.to` alone cannot see once a second link is added.
function fakeIo() {
  const emit = jest.fn();
  const rooms = [];
  const operator = () => ({
    to: jest.fn((room) => {
      rooms.push(room);
      return operator();
    }),
    emit,
  });
  const to = jest.fn((room) => {
    rooms.push(room);
    return operator();
  });
  return { to, emit, rooms };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('broadcastProviderQueueUpdate', () => {
  it('no-ops when Socket.IO has not been initialized (e.g. under Jest / no HTTP server)', async () => {
    getIO.mockReturnValue(null);
    await socketEvents.broadcastProviderQueueUpdate(2);
    expect(queueService.getProviderQueueSnapshot).not.toHaveBeenCalled();
  });

  it("emits the snapshot to the provider room and each active entry's own customer room — never a customer's data to anyone else's room", async () => {
    const io = fakeIo();
    getIO.mockReturnValue(io);
    queueService.getProviderQueueSnapshot.mockResolvedValue({
      providerId: 2,
      entries: [
        { id: 1, customerId: 33, status: 'WAITING' },
        { id: 2, customerId: null, status: 'WAITING' }, // walk-in — no private room to push to
        { id: 3, customerId: 44, status: 'IN_SERVICE' },
      ],
      summary: { providerId: 2, queueLength: 3, estimatedWaitMinutes: 10 },
    });

    await socketEvents.broadcastProviderQueueUpdate(2);

    expect(io.to).toHaveBeenCalledWith('provider:2');
    expect(io.to).toHaveBeenCalledWith('user:33');
    expect(io.to).toHaveBeenCalledWith('user:44');
    expect(io.to).not.toHaveBeenCalledWith('user:null');
    // Exactly 3 room targets: the provider room + the two customer-linked entries.
    expect(io.to).toHaveBeenCalledTimes(3);

    expect(io.emit).toHaveBeenCalledWith(
      'queue:provider_updated',
      expect.objectContaining({ providerId: 2 }),
    );
    expect(io.emit).toHaveBeenCalledWith(
      'queue:my_update',
      expect.objectContaining({ id: 1, customerId: 33 }),
    );
    expect(io.emit).toHaveBeenCalledWith(
      'queue:my_update',
      expect.objectContaining({ id: 3, customerId: 44 }),
    );
  });
});

describe('notifyCustomerEntry / notifyCustomerRemoved / notifyBookingStatusChanged', () => {
  it('each targets exactly one customer room, never a broader one', () => {
    const io = fakeIo();
    getIO.mockReturnValue(io);

    socketEvents.notifyCustomerEntry(33, { id: 1, status: 'COMPLETED' });
    expect(io.to).toHaveBeenCalledWith('user:33');
    expect(io.emit).toHaveBeenCalledWith('queue:my_update', { id: 1, status: 'COMPLETED' });

    socketEvents.notifyCustomerRemoved(33, 7);
    expect(io.emit).toHaveBeenCalledWith('queue:my_update', { id: 7, removed: true });

    socketEvents.notifyBookingStatusChanged(33, 10, 'CANCELLED');
    expect(io.emit).toHaveBeenCalledWith('booking:status_changed', {
      bookingId: 10,
      status: 'CANCELLED',
    });
    // All three calls targeted the same single customer room — nothing
    // else, and no provider room was chained on.
    expect(io.to.mock.calls).toEqual([['user:33'], ['user:33'], ['user:33']]);
    expect(io.rooms).toEqual(['user:33', 'user:33', 'user:33']);
  });

  it('all no-op silently when Socket.IO has not been initialized', () => {
    getIO.mockReturnValue(null);
    expect(() => socketEvents.notifyCustomerEntry(33, {})).not.toThrow();
    expect(() => socketEvents.notifyCustomerRemoved(33, 1)).not.toThrow();
    expect(() => socketEvents.notifyBookingStatusChanged(33, 1, 'CANCELLED')).not.toThrow();
  });
});
