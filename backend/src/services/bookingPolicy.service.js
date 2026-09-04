const prisma = require('../config/prisma');

// A single configuration row, always id 1 — there is exactly one
// platform-wide booking policy, not a table of named policies. Created
// lazily with documented defaults on first read so a fresh database (or one
// mid-migration) never has to run a seed step just to make booking work.
const POLICY_ID = 1;
const DEFAULTS = { minAdvanceMinutes: 30, maxAdvanceDays: 30, allowSameDayBooking: true };

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function getPolicy() {
  const existing = await prisma.bookingPolicy.findUnique({ where: { id: POLICY_ID } });
  if (existing) return existing;
  return prisma.bookingPolicy.upsert({
    where: { id: POLICY_ID },
    update: {},
    create: { id: POLICY_ID, ...DEFAULTS },
  });
}

// Same values availability.service.js and booking.service.js enforce
// against — used internally by both rather than each keeping its own copy
// (see the doc comment on this model in schema.prisma).
async function getActivePolicy() {
  return getPolicy();
}

function validate({ minAdvanceMinutes, maxAdvanceDays, allowSameDayBooking }) {
  if (
    !Number.isInteger(minAdvanceMinutes) ||
    minAdvanceMinutes < 0 ||
    minAdvanceMinutes > 10_080 // one week, generous upper bound against fat-fingering
  ) {
    throw badRequest('minAdvanceMinutes must be an integer between 0 and 10080');
  }
  if (!Number.isInteger(maxAdvanceDays) || maxAdvanceDays < 1 || maxAdvanceDays > 365) {
    throw badRequest('maxAdvanceDays must be an integer between 1 and 365');
  }
  if (typeof allowSameDayBooking !== 'boolean') {
    throw badRequest('allowSameDayBooking must be a boolean');
  }
}

// `updatedByAdminId` always comes from the verified JWT (see
// admin.controller.js), never from the request body — a client cannot claim
// a different admin made this change.
async function updatePolicy({ minAdvanceMinutes, maxAdvanceDays, allowSameDayBooking }, updatedByAdminId) {
  validate({ minAdvanceMinutes, maxAdvanceDays, allowSameDayBooking });

  return prisma.bookingPolicy.upsert({
    where: { id: POLICY_ID },
    update: { minAdvanceMinutes, maxAdvanceDays, allowSameDayBooking, updatedByAdminId },
    create: { id: POLICY_ID, minAdvanceMinutes, maxAdvanceDays, allowSameDayBooking, updatedByAdminId },
  });
}

module.exports = { getPolicy, getActivePolicy, updatePolicy, POLICY_ID, DEFAULTS };
