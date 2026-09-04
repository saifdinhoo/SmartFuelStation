jest.mock('../../config/prisma', () => ({
  user: { findMany: jest.fn() },
  provider: { findMany: jest.fn() },
  providerService: { findMany: jest.fn() },
  serviceCategory: { findMany: jest.fn() },
  providerOperatingHour: { findMany: jest.fn() },
  booking: { findMany: jest.fn() },
  queueEntry: { findMany: jest.fn() },
  review: { findMany: jest.fn() },
  complaint: { findMany: jest.fn() },
  favorite: { findMany: jest.fn() },
  vehicle: { findMany: jest.fn() },
  notification: { findMany: jest.fn() },
  notificationPreference: { findMany: jest.fn() },
  providerFuelInventory: { findMany: jest.fn() },
  fuelInventoryHistory: { findMany: jest.fn() },
  financialTransaction: { findMany: jest.fn() },
  bookingPolicy: { findMany: jest.fn() },
  adminAuditLog: { findMany: jest.fn() },
}));

const prisma = require('../../config/prisma');
const backupService = require('../backup.service');

beforeEach(() => {
  jest.resetAllMocks();
  for (const model of Object.values(prisma)) {
    model.findMany.mockResolvedValue([]);
  }
});

describe('buildSnapshot', () => {
  it('produces the documented top-level shape', async () => {
    const snapshot = await backupService.buildSnapshot();

    expect(snapshot).toMatchObject({
      formatVersion: 1,
      application: 'Smart Automotive Service Platform',
    });
    expect(typeof snapshot.generatedAt).toBe('string');
    expect(new Date(snapshot.generatedAt).toString()).not.toBe('Invalid Date');
    expect(snapshot.data).toBeDefined();
  });

  it('is valid, round-trippable JSON', async () => {
    const snapshot = await backupService.buildSnapshot();
    expect(() => JSON.parse(JSON.stringify(snapshot))).not.toThrow();
  });

  it('never selects the password field on User — select lists only safe fields, no bare findMany()', async () => {
    await backupService.buildSnapshot();

    const [usersCallArgs] = prisma.user.findMany.mock.calls[0];
    expect(usersCallArgs).toHaveProperty('select');
    expect(usersCallArgs.select).not.toHaveProperty('password');
    expect(Object.keys(usersCallArgs.select).sort()).toEqual(
      ['createdAt', 'email', 'id', 'name', 'phone', 'role', 'updatedAt'].sort(),
    );
  });

  it('never queries PasswordResetToken at all, hashed or not', async () => {
    // The mocked prisma client above deliberately has no
    // passwordResetToken model — if the service tried to call it, this
    // rejects with "Cannot read properties of undefined" instead of
    // resolving, which is the actual proof the query was never made.
    await expect(backupService.buildSnapshot()).resolves.toBeDefined();
    const snapshot = await backupService.buildSnapshot();
    expect(Object.keys(snapshot.data).join(',').toLowerCase()).not.toContain('resettoken');
  });

  it('includes every required real entity from the task', async () => {
    const snapshot = await backupService.buildSnapshot();
    const requiredKeys = [
      'users',
      'providers',
      'providerServices',
      'categories',
      'operatingHours',
      'bookings',
      'queueEntries',
      'reviews',
      'complaints',
      'favorites',
      'vehicles',
      'notifications',
      'fuelInventory',
      'fuelInventoryHistory',
      'financialTransactions',
      'bookingPolicy',
      'auditLogs',
    ];
    for (const key of requiredKeys) {
      expect(snapshot.data).toHaveProperty(key);
    }
  });

  it("carries real user data through (name/email/role), just not the secret", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: 'Layla Hassan', email: 'layla@smartauto.local', role: 'CUSTOMER' },
    ]);
    const snapshot = await backupService.buildSnapshot();
    expect(snapshot.data.users).toEqual([
      { id: 1, name: 'Layla Hassan', email: 'layla@smartauto.local', role: 'CUSTOMER' },
    ]);
  });
});

describe('backupFilename', () => {
  it('matches the documented naming pattern', () => {
    const name = backupService.backupFilename(new Date(2026, 8, 4, 21, 5));
    expect(name).toBe('smart-automotive-backup-2026-09-04-2105.json');
  });

  it('always ends in .json', () => {
    expect(backupService.backupFilename()).toMatch(/\.json$/);
  });
});
