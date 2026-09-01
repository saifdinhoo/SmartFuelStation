// Shared by availability.service.js and booking.service.js, so a booking's
// own enforcement can never drift from what the availability endpoint
// showed the customer a moment earlier — both compute "does this instant
// fall in operating hours / does it fit before closing / does it overlap an
// existing booking" the exact same way.
//
// --- Local-time strategy (see the professor's date/time correction ask) ---
// This platform has no per-provider timezone model, and the existing
// booking flow (both web and Flutter) already builds a booking's instant
// from local date/time *components* via each platform's own local-time
// Date constructor, then serializes to a real UTC instant
// (`toISOString()` / `.toUtc().toIso8601String()`) — never a bare
// date-only string run through UTC-based parsing. That is exactly the
// pattern this module continues:
//   - A wall-clock "HH:mm" (operating hours, slot labels) and a plain
//     "YYYY-MM-DD" calendar date never pass through `new Date(string)`
//     anywhere in this file — that constructor treats a date-only string
//     as UTC midnight but a date-time string as local time, which is the
//     inconsistency that causes the classic "selects Sept 1, backend sees
//     Aug 31" bug.
//   - Instead, every date/time value is parsed into plain integers
//     (year, month, day, hour, minute) and only ever combined via the
//     multi-argument `new Date(y, m-1, d, h, min)` constructor, which is
//     unambiguous and always interpreted as local time — on whichever
//     machine runs it.
//   - The documented assumption this establishes: "local time" means the
//     timezone the Node server process itself runs in, and every
//     customer/provider is assumed to share that same local timezone
//     (there is exactly one region's worth of providers today — see the
//     Known Limitations note in the Phase report for what would need to
//     change to support providers spread across real timezones).

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Validates "YYYY-MM-DD" and rejects calendar-impossible dates (e.g.
// 2026-02-30) by round-tripping through the local Date constructor rather
// than ever parsing the string itself as a Date.
function parseDateOnly(value, label = 'date') {
  const match = typeof value === 'string' ? value.match(DATE_PATTERN) : null;
  if (!match) {
    throw badRequest(`${label} must be a valid date in the form YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    throw badRequest(`${label} is not a real calendar date`);
  }
  return { year, month, day };
}

// Validates "HH:mm" (24-hour, zero-padded).
function parseTimeOnly(value, label = 'time') {
  const match = typeof value === 'string' ? value.match(TIME_PATTERN) : null;
  if (!match) {
    throw badRequest(`${label} must be a valid 24-hour time in the form HH:mm`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function timeToMinutes(time) {
  return time.hour * 60 + time.minute;
}

function minutesToTimeString(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// The one place a date + a wall-clock time become a real point in time —
// always via the unambiguous multi-arg local constructor.
function combineLocalDateTime(dateOnly, timeOnly) {
  return new Date(dateOnly.year, dateOnly.month - 1, dateOnly.day, timeOnly.hour, timeOnly.minute, 0, 0);
}

// Local calendar day (Sunday-first, matching Date#getDay()) as the same
// DayOfWeek enum values used in the schema/API.
function dayOfWeekOf(dateOnly) {
  const probe = new Date(dateOnly.year, dateOnly.month - 1, dateOnly.day, 12, 0, 0, 0);
  return DAY_NAMES[probe.getDay()];
}

function localDateOnlyOf(date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function localTimeOnlyOf(date) {
  return { hour: date.getHours(), minute: date.getMinutes() };
}

function formatDateOnly(dateOnly) {
  return `${dateOnly.year}-${String(dateOnly.month).padStart(2, '0')}-${String(dateOnly.day).padStart(2, '0')}`;
}

function formatTimeOnly(timeOnly) {
  return `${String(timeOnly.hour).padStart(2, '0')}:${String(timeOnly.minute).padStart(2, '0')}`;
}

// Half-open interval overlap — identical to booking.service.js's existing
// `overlaps()`, kept here too so availability.service.js doesn't need to
// import a booking-module internal to reuse it. A slot that ends exactly
// when another starts (or starts exactly when another ends) does not
// overlap it.
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

module.exports = {
  DAY_NAMES,
  parseDateOnly,
  parseTimeOnly,
  timeToMinutes,
  minutesToTimeString,
  combineLocalDateTime,
  dayOfWeekOf,
  localDateOnlyOf,
  localTimeOnlyOf,
  formatDateOnly,
  formatTimeOnly,
  overlaps,
};
