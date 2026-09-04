jest.mock('../../config/prisma', () => ({
  bookingPolicy: { findUnique: jest.fn(), upsert: jest.fn() },
}));

const prisma = require('../../config/prisma');
const bookingPolicyService = require('../bookingPolicy.service');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getPolicy', () => {
  it('returns the existing row when one exists', async () => {
    const existing = { id: 1, minAdvanceMinutes: 45, maxAdvanceDays: 14, allowSameDayBooking: false };
    prisma.bookingPolicy.findUnique.mockResolvedValue(existing);

    const result = await bookingPolicyService.getPolicy();

    expect(result).toBe(existing);
    expect(prisma.bookingPolicy.upsert).not.toHaveBeenCalled();
  });

  it('lazily creates the documented defaults when no row exists yet', async () => {
    prisma.bookingPolicy.findUnique.mockResolvedValue(null);
    const created = { id: 1, minAdvanceMinutes: 30, maxAdvanceDays: 30, allowSameDayBooking: true };
    prisma.bookingPolicy.upsert.mockResolvedValue(created);

    const result = await bookingPolicyService.getPolicy();

    expect(prisma.bookingPolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        create: { id: 1, minAdvanceMinutes: 30, maxAdvanceDays: 30, allowSameDayBooking: true },
      }),
    );
    expect(result).toBe(created);
  });
});

describe('updatePolicy', () => {
  const VALID = { minAdvanceMinutes: 60, maxAdvanceDays: 14, allowSameDayBooking: false };

  it('writes the given admin id as updatedByAdminId, never trusting a client-supplied one', async () => {
    prisma.bookingPolicy.upsert.mockResolvedValue({ id: 1, ...VALID, updatedByAdminId: 7 });

    await bookingPolicyService.updatePolicy(VALID, 7);

    expect(prisma.bookingPolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ updatedByAdminId: 7 }),
        create: expect.objectContaining({ updatedByAdminId: 7 }),
      }),
    );
  });

  it.each([
    [{ minAdvanceMinutes: -1, maxAdvanceDays: 14, allowSameDayBooking: true }, 'negative minAdvanceMinutes'],
    [{ minAdvanceMinutes: 1.5, maxAdvanceDays: 14, allowSameDayBooking: true }, 'non-integer minAdvanceMinutes'],
    [{ minAdvanceMinutes: 30, maxAdvanceDays: 0, allowSameDayBooking: true }, 'maxAdvanceDays below 1'],
    [{ minAdvanceMinutes: 30, maxAdvanceDays: 400, allowSameDayBooking: true }, 'maxAdvanceDays above 365'],
    [{ minAdvanceMinutes: 30, maxAdvanceDays: 14, allowSameDayBooking: 'yes' }, 'non-boolean allowSameDayBooking'],
  ])('rejects an invalid policy: %s', async (input) => {
    await expect(bookingPolicyService.updatePolicy(input, 7)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.bookingPolicy.upsert).not.toHaveBeenCalled();
  });

  it('accepts the documented boundary values', async () => {
    prisma.bookingPolicy.upsert.mockResolvedValue({ id: 1 });
    await expect(
      bookingPolicyService.updatePolicy({ minAdvanceMinutes: 0, maxAdvanceDays: 1, allowSameDayBooking: true }, 7),
    ).resolves.toBeDefined();
    await expect(
      bookingPolicyService.updatePolicy({ minAdvanceMinutes: 10_080, maxAdvanceDays: 365, allowSameDayBooking: false }, 7),
    ).resolves.toBeDefined();
  });
});
