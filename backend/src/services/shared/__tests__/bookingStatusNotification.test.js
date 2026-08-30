const { bookingStatusNotification } = require('../bookingStatusNotification');

function booking(status, overrides = {}) {
  return {
    id: 1,
    status,
    scheduledAt: new Date('2026-01-01T15:00:00Z'),
    customerId: 33,
    businessName: 'Al-Nour Auto',
    providerUserId: 77,
    ...overrides,
  };
}

describe('bookingStatusNotification', () => {
  it('returns null for transitions that are not notification-worthy', () => {
    expect(bookingStatusNotification(booking('PENDING'), 'PROVIDER')).toBeNull();
    expect(bookingStatusNotification(booking('ARRIVED'), 'PROVIDER')).toBeNull();
    expect(bookingStatusNotification(booking('IN_QUEUE'), 'PROVIDER')).toBeNull();
  });

  it('notifies the customer when confirmed', () => {
    const n = bookingStatusNotification(booking('CONFIRMED'), 'PROVIDER');
    expect(n).toMatchObject({ userId: 33, type: 'BOOKING_CONFIRMED', relatedBookingId: 1 });
  });

  it('notifies the customer when rejected', () => {
    const n = bookingStatusNotification(booking('REJECTED'), 'PROVIDER');
    expect(n).toMatchObject({ userId: 33, type: 'BOOKING_REJECTED', relatedBookingId: 1 });
  });

  it('notifies the customer when the service starts', () => {
    const n = bookingStatusNotification(booking('IN_SERVICE'), 'PROVIDER');
    expect(n).toMatchObject({ userId: 33, type: 'SERVICE_STARTED' });
  });

  it('notifies the customer when completed', () => {
    const n = bookingStatusNotification(booking('COMPLETED'), 'PROVIDER');
    expect(n).toMatchObject({ userId: 33, type: 'SERVICE_COMPLETED' });
  });

  describe('CANCELLED — recipient is always the other party, never the actor', () => {
    it('notifies the provider when the customer cancels', () => {
      const n = bookingStatusNotification(booking('CANCELLED'), 'CUSTOMER');
      expect(n).toMatchObject({ userId: 77, type: 'BOOKING_CANCELLED' });
    });

    it('notifies the customer when the provider cancels', () => {
      const n = bookingStatusNotification(booking('CANCELLED'), 'PROVIDER');
      expect(n).toMatchObject({ userId: 33, type: 'BOOKING_CANCELLED' });
    });

    it('notifies the customer when an admin cancels', () => {
      const n = bookingStatusNotification(booking('CANCELLED'), 'ADMIN');
      expect(n).toMatchObject({ userId: 33, type: 'BOOKING_CANCELLED' });
    });
  });
});
