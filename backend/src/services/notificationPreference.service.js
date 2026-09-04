const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const DEFAULTS = {
  bookingUpdates: true,
  queueUpdates: true,
  reviewUpdates: true,
  providerUpdates: true,
};

const EDITABLE_FIELDS = Object.keys(DEFAULTS);

// Maps every real NotificationType (see schema.prisma) to the one
// preference category it belongs to. Deliberately exhaustive — a type with
// no entry here would silently bypass preference checks, so
// notification.service.js's enforcement point asserts every type it is
// asked to create is listed.
const CATEGORY_BY_TYPE = {
  BOOKING_CREATED: 'bookingUpdates',
  BOOKING_CONFIRMED: 'bookingUpdates',
  BOOKING_REJECTED: 'bookingUpdates',
  BOOKING_CANCELLED: 'bookingUpdates',
  SERVICE_STARTED: 'bookingUpdates',
  SERVICE_COMPLETED: 'bookingUpdates',
  QUEUE_JOINED: 'queueUpdates',
  QUEUE_ALMOST_TURN: 'queueUpdates',
  NEW_REVIEW: 'reviewUpdates',
  PROVIDER_REGISTERED: 'providerUpdates',
  PROVIDER_APPROVED: 'providerUpdates',
  PROVIDER_REJECTED: 'providerUpdates',
};

// Every category maps to a real, currently-emitted NotificationType — there
// is deliberately no "complaintUpdates"/"financeUpdates"/"systemUpdates"
// field, because no NotificationType for those exists yet (see the enum in
// schema.prisma). Adding a toggle with nothing behind it would be a lie.
// None of today's types are security/system-critical, so nothing here is
// unsuppressible — if a mandatory category is ever introduced, it must be
// left out of DEFAULTS/EDITABLE_FIELDS rather than added as "always true".

async function getOwnPreferences(userId) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, ...DEFAULTS },
  });
}

function validate(input) {
  for (const field of EDITABLE_FIELDS) {
    if (field in input && typeof input[field] !== 'boolean') {
      throw badRequest(`${field} must be a boolean`);
    }
  }
  const unknown = Object.keys(input).filter((key) => !EDITABLE_FIELDS.includes(key));
  if (unknown.length > 0) {
    throw badRequest(`Unknown preference field(s): ${unknown.join(', ')}`);
  }
}

// `userId` always comes from the verified JWT (see notification.controller.js)
// — there is no id parameter here at all, so a user can only ever update
// their own row, by construction rather than by an ownership check.
async function updateOwnPreferences(userId, input) {
  validate(input);
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in input) data[field] = input[field];
  }

  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...DEFAULTS, ...data },
  });
}

// The one enforcement point notification.service.js's createNotification
// calls before persisting/emitting anything. Absence of a preference row
// means every category is still enabled (the lazy-create default), so a
// user who has never opened Settings behaves exactly as before this
// feature existed.
async function isCategoryEnabled(userId, notificationType) {
  const category = CATEGORY_BY_TYPE[notificationType];
  if (!category) {
    throw new Error(
      `notificationPreference.service.js: no preference category mapped for NotificationType "${notificationType}"`,
    );
  }

  const preference = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!preference) return true; // no row yet -> defaults (all enabled)
  return preference[category];
}

module.exports = {
  getOwnPreferences,
  updateOwnPreferences,
  isCategoryEnabled,
  CATEGORY_BY_TYPE,
  EDITABLE_FIELDS,
  DEFAULTS,
};
