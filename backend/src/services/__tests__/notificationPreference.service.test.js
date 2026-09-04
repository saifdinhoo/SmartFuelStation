jest.mock('../../config/prisma', () => ({
  notificationPreference: { findUnique: jest.fn(), upsert: jest.fn() },
}));

const prisma = require('../../config/prisma');
const notificationPreferenceService = require('../notificationPreference.service');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('CATEGORY_BY_TYPE', () => {
  it('maps every real NotificationType (schema.prisma) to a real preference field', () => {
    // Kept in sync by hand with schema.prisma's NotificationType enum —
    // this test fails loudly the moment the two drift.
    const REAL_TYPES = [
      'BOOKING_CREATED',
      'BOOKING_CONFIRMED',
      'BOOKING_REJECTED',
      'BOOKING_CANCELLED',
      'QUEUE_JOINED',
      'QUEUE_ALMOST_TURN',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'NEW_REVIEW',
      'PROVIDER_REGISTERED',
      'PROVIDER_APPROVED',
      'PROVIDER_REJECTED',
    ];
    for (const type of REAL_TYPES) {
      expect(notificationPreferenceService.EDITABLE_FIELDS).toContain(
        notificationPreferenceService.CATEGORY_BY_TYPE[type],
      );
    }
  });

  it('has no category that is not backed by a real, editable field', () => {
    const categories = new Set(Object.values(notificationPreferenceService.CATEGORY_BY_TYPE));
    for (const category of categories) {
      expect(notificationPreferenceService.EDITABLE_FIELDS).toContain(category);
    }
  });

  it('has exactly four categories — no complaintUpdates/financeUpdates/systemUpdates, since no NotificationType backs them', () => {
    expect(notificationPreferenceService.EDITABLE_FIELDS.sort()).toEqual(
      ['bookingUpdates', 'providerUpdates', 'queueUpdates', 'reviewUpdates'].sort(),
    );
  });
});

describe('getOwnPreferences', () => {
  it('returns the existing row when one exists', async () => {
    const existing = { id: 1, userId: 7, bookingUpdates: false, queueUpdates: true, reviewUpdates: true, providerUpdates: true };
    prisma.notificationPreference.findUnique.mockResolvedValue(existing);

    const result = await notificationPreferenceService.getOwnPreferences(7);

    expect(result).toBe(existing);
    expect(prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });

  it('lazily creates all-enabled defaults when no row exists yet', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    prisma.notificationPreference.upsert.mockResolvedValue({ id: 1, userId: 7, ...notificationPreferenceService.DEFAULTS });

    await notificationPreferenceService.getOwnPreferences(7);

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        create: { userId: 7, ...notificationPreferenceService.DEFAULTS },
      }),
    );
  });
});

describe('updateOwnPreferences (IDOR prevention by construction)', () => {
  it('writes only the given userId — there is no id parameter to spoof another user with', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({ id: 1, userId: 7, bookingUpdates: false });

    await notificationPreferenceService.updateOwnPreferences(7, { bookingUpdates: false });

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 } }),
    );
  });

  it('applies a partial update without touching the other fields', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({});
    await notificationPreferenceService.updateOwnPreferences(7, { queueUpdates: false });

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { queueUpdates: false } }),
    );
  });

  it('rejects a non-boolean value', async () => {
    await expect(
      notificationPreferenceService.updateOwnPreferences(7, { bookingUpdates: 'nope' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });

  it('rejects an unknown field rather than silently ignoring it', async () => {
    await expect(
      notificationPreferenceService.updateOwnPreferences(7, { financeUpdates: false }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });
});

describe('isCategoryEnabled', () => {
  it('defaults to enabled when the user has no preference row yet', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    await expect(notificationPreferenceService.isCategoryEnabled(7, 'BOOKING_CREATED')).resolves.toBe(true);
  });

  it('reflects a disabled category', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      userId: 7,
      bookingUpdates: false,
      queueUpdates: true,
      reviewUpdates: true,
      providerUpdates: true,
    });
    await expect(notificationPreferenceService.isCategoryEnabled(7, 'BOOKING_CREATED')).resolves.toBe(false);
    await expect(notificationPreferenceService.isCategoryEnabled(7, 'QUEUE_JOINED')).resolves.toBe(true);
  });

  it('throws for a type with no mapped category, rather than silently allowing it through', async () => {
    await expect(notificationPreferenceService.isCategoryEnabled(7, 'NOT_A_REAL_TYPE')).rejects.toThrow();
  });
});
