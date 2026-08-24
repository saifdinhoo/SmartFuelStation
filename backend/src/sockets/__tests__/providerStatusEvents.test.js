jest.mock('../index', () => ({
  getIO: jest.fn(),
  roomForUser: (id) => `user:${id}`,
  roomForProvider: (id) => `provider:${id}`,
}));
jest.mock('../../services/queue.service', () => ({}));

const { getIO } = require('../index');
const socketEvents = require('../queueEvents');

let io;
let emitted;

beforeEach(() => {
  jest.clearAllMocks();
  emitted = [];
  // `.to()` is chainable and returns a *new* operator in Socket.IO v4, so
  // the fake mirrors that: each link accumulates rooms and a single emit
  // records the whole target set. `room` stays as the first room so the
  // single-room expectations below still read naturally.
  function operator(rooms) {
    return {
      to: jest.fn((room) => operator([...rooms, room])),
      emit: jest.fn((event, payload) =>
        emitted.push({ room: rooms[0] ?? null, rooms, event, payload }),
      ),
    };
  }

  io = {
    emit: jest.fn((event, payload) => emitted.push({ room: null, rooms: [], event, payload })),
    to: jest.fn((room) => operator([room])),
  };
  getIO.mockReturnValue(io);
});

describe('notifyProviderStatusChanged', () => {
  const input = {
    providerId: 7,
    isOpen: false,
    estimatedWaitMinutes: 25,
    isApproved: true,
  };

  it('emits under the agreed event name', () => {
    socketEvents.notifyProviderStatusChanged(input);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('provider:status_changed');
  });

  it('broadcasts rather than targeting a private room', () => {
    socketEvents.notifyProviderStatusChanged(input);
    expect(io.emit).toHaveBeenCalled();
    // Never addressed to a user: or provider: room — this is public data
    // for every authenticated socket, not a per-account notification.
    expect(io.to).not.toHaveBeenCalled();
  });

  it('sends only the public availability fields', () => {
    socketEvents.notifyProviderStatusChanged(input);
    expect(Object.keys(emitted[0].payload).sort()).toEqual([
      'estimatedWaitMinutes',
      'isApproved',
      'isOpen',
      'providerId',
    ]);
  });

  it('never leaks private provider or account data', () => {
    // Extra fields on the input must not reach the wire — the emit builds
    // its payload explicitly rather than spreading whatever it is given.
    socketEvents.notifyProviderStatusChanged({
      ...input,
      address: '123 Private Street',
      phone: '+9611234567',
      user: { id: 2, email: 'owner@example.com' },
      approvedById: 1,
      queueEntries: [{ id: 1, customerName: 'Someone Else' }],
    });

    const serialized = JSON.stringify(emitted[0].payload);
    for (const secret of [
      'Private Street',
      '+9611234567',
      'owner@example.com',
      'approvedById',
      'Someone Else',
      'queueEntries',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('carries the values it was given', () => {
    socketEvents.notifyProviderStatusChanged(input);
    expect(emitted[0].payload).toEqual({
      providerId: 7,
      isOpen: false,
      estimatedWaitMinutes: 25,
      isApproved: true,
    });
  });

  it('is a no-op when sockets are not initialized', () => {
    getIO.mockReturnValue(null);
    expect(() => socketEvents.notifyProviderStatusChanged(input)).not.toThrow();
    expect(emitted).toHaveLength(0);
  });
});

describe('event separation', () => {
  it('booking status stays addressed to one customer, not broadcast', () => {
    socketEvents.notifyBookingStatusChanged(42, 9, 'CONFIRMED');
    expect(io.to).toHaveBeenCalledWith('user:42');
    expect(io.emit).not.toHaveBeenCalled();
    expect(emitted[0].room).toBe('user:42');
    // No providerId given — the provider room must not be pulled in.
    expect(emitted[0].rooms).toEqual(['user:42']);
  });
});

describe('notifyBookingStatusChanged reaching the owning provider', () => {
  it('adds the provider room while keeping the customer targeted', () => {
    socketEvents.notifyBookingStatusChanged(42, 9, 'CANCELLED', 7);

    // One frame, addressed at the union of the two rooms — not two emits,
    // and not a broadcast.
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('booking:status_changed');
    expect(emitted[0].rooms).toEqual(['user:42', 'provider:7']);
    expect(io.emit).not.toHaveBeenCalled();
  });

  it('never targets another provider', () => {
    socketEvents.notifyBookingStatusChanged(42, 9, 'CANCELLED', 7);
    const targeted = emitted.flatMap((e) => e.rooms);
    expect(targeted).not.toContain('provider:8');
    expect(targeted.filter((r) => r.startsWith('provider:'))).toEqual(['provider:7']);
  });

  it('carries no customer data beyond the booking id and status', () => {
    socketEvents.notifyBookingStatusChanged(42, 9, 'CANCELLED', 7);
    expect(emitted[0].payload).toEqual({ bookingId: 9, status: 'CANCELLED' });
    expect(Object.keys(emitted[0].payload).sort()).toEqual(['bookingId', 'status']);
  });

  it('stays customer-only when the booking has no provider (null id)', () => {
    socketEvents.notifyBookingStatusChanged(42, 9, 'CANCELLED', null);
    expect(emitted[0].rooms).toEqual(['user:42']);
  });

  it('is a no-op when sockets are not initialized', () => {
    getIO.mockReturnValue(null);
    expect(() => socketEvents.notifyBookingStatusChanged(42, 9, 'CANCELLED', 7)).not.toThrow();
    expect(emitted).toHaveLength(0);
  });
});
