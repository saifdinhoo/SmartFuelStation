// Shared with queue.service.js so that both booking and queue mutations
// validate Booking status transitions against the exact same state
// machine, instead of two modules each deciding independently whether a
// given edge is legal (see the Queue audit — "Do not duplicate Booking
// transition logic").

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE'];
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];
const ALL_STATUSES = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES];

// Who may drive each transition, and which side-effect field it sets.
// Admins can invoke anything a provider can — the state machine itself
// (which edges exist at all) applies equally to every role.
const TRANSITIONS = {
  PENDING: {
    CONFIRMED: { roles: ['PROVIDER', 'ADMIN'] },
    REJECTED: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['CUSTOMER', 'PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  CONFIRMED: {
    ARRIVED: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['CUSTOMER', 'PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  // Once the customer has arrived, cancellation becomes a front-desk
  // (provider/admin) action rather than something the app self-serves.
  ARRIVED: {
    IN_QUEUE: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  IN_QUEUE: {
    IN_SERVICE: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  IN_SERVICE: {
    COMPLETED: { roles: ['PROVIDER', 'ADMIN'], sets: 'completedAt' },
  },
};

module.exports = { ACTIVE_STATUSES, TERMINAL_STATUSES, ALL_STATUSES, TRANSITIONS };
