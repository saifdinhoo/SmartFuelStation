const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

const FUEL_TYPES = ['GASOLINE_95', 'GASOLINE_98', 'DIESEL'];
const MIN_YEAR = 1900;

function currentMaxYear() {
  // A model year one ahead of the calendar year is normal (next year's
  // models go on sale early), so the ceiling is not simply "this year".
  return new Date().getFullYear() + 1;
}

function requireNonEmpty(value, label) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw badRequest(`${label} is required`);
  return trimmed;
}

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > currentMaxYear()) {
    throw badRequest(`year must be an integer between ${MIN_YEAR} and ${currentMaxYear()}`);
  }
  return year;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeFuelType(value) {
  if (value === undefined || value === null || value === '') return null;
  if (!FUEL_TYPES.includes(value)) {
    throw badRequest(`fuelType must be one of ${FUEL_TYPES.join(', ')}`);
  }
  return value;
}

async function listMyVehicles(ownerId) {
  return prisma.vehicle.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getOwnedVehicle(vehicleIdParam, ownerId) {
  const vehicleId = toId(vehicleIdParam, 'vehicle id');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw notFound('Vehicle not found');
  if (vehicle.ownerId !== ownerId) {
    throw forbidden('You do not have permission to access this vehicle');
  }
  return vehicle;
}

async function createVehicle(ownerId, { make, model, year, plate, color, fuelType }) {
  return prisma.vehicle.create({
    data: {
      ownerId,
      make: requireNonEmpty(make, 'make'),
      model: requireNonEmpty(model, 'model'),
      year: normalizeYear(year),
      plate: normalizeOptionalText(plate),
      color: normalizeOptionalText(color),
      fuelType: normalizeFuelType(fuelType),
    },
  });
}

async function updateVehicle(vehicleIdParam, ownerId, { make, model, year, plate, color, fuelType }) {
  const existing = await getOwnedVehicle(vehicleIdParam, ownerId);

  return prisma.vehicle.update({
    where: { id: existing.id },
    data: {
      make: make === undefined ? undefined : requireNonEmpty(make, 'make'),
      model: model === undefined ? undefined : requireNonEmpty(model, 'model'),
      year: year === undefined ? undefined : normalizeYear(year),
      plate: plate === undefined ? undefined : normalizeOptionalText(plate),
      color: color === undefined ? undefined : normalizeOptionalText(color),
      fuelType: fuelType === undefined ? undefined : normalizeFuelType(fuelType),
    },
  });
}

async function deleteVehicle(vehicleIdParam, ownerId) {
  const existing = await getOwnedVehicle(vehicleIdParam, ownerId);
  await prisma.vehicle.delete({ where: { id: existing.id } });
}

module.exports = {
  listMyVehicles,
  getOwnedVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
