jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  providerOperatingHour: { findMany: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../../config/prisma');
const hoursService = require('../providerHours.service');

const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const OWN_PROVIDER_USER = { userId: 77, role: 'PROVIDER' };
const OTHER_PROVIDER_USER = { userId: 88, role: 'PROVIDER' };
const ADMIN = { userId: 1, role: 'ADMIN' };

function providerRow(overrides = {}) {
  return { id: 2, userId: 77, isApproved: true, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
});

describe('getHours (public read)', () => {
  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(hoursService.getHours(2, CUSTOMER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('404s (never 403) when a customer looks up an unapproved provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    await expect(hoursService.getHours(2, CUSTOMER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lets a customer read an approved provider’s hours', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerOperatingHour.findMany.mockResolvedValue([]);
    await expect(hoursService.getHours(2, CUSTOMER)).resolves.toEqual([]);
  });

  it('lets an admin read any provider’s hours, approved or not', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    prisma.providerOperatingHour.findMany.mockResolvedValue([]);
    await expect(hoursService.getHours(2, ADMIN)).resolves.toEqual([]);
  });

  it('lets a provider read their own hours', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow()); // the target provider
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow()); // assertProviderReadAccess's own-lookup
    prisma.providerOperatingHour.findMany.mockResolvedValue([]);
    await expect(hoursService.getHours(2, OWN_PROVIDER_USER)).resolves.toEqual([]);
  });

  it('blocks a provider from reading a different business’s hours', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow()); // target: provider id 2, userId 77
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow({ id: 3, userId: 88 })); // caller's own business
    await expect(hoursService.getHours(2, OTHER_PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('serializes only dayOfWeek/isClosed/openTime/closeTime — no internal ids or timestamps', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerOperatingHour.findMany.mockResolvedValue([
      {
        id: 9,
        providerId: 2,
        dayOfWeek: 'MONDAY',
        isClosed: false,
        openTime: '09:00',
        closeTime: '18:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const result = await hoursService.getHours(2, CUSTOMER);
    expect(result).toEqual([
      { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
    ]);
  });
});

describe('getOwnHours', () => {
  it('rejects an account with no linked provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(hoursService.getOwnHours(77)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns the caller’s own hours', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerOperatingHour.findMany.mockResolvedValue([]);
    await expect(hoursService.getOwnHours(77)).resolves.toEqual([]);
  });
});

describe('updateOwnHours', () => {
  beforeEach(() => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerOperatingHour.findMany.mockResolvedValue([]);
  });

  it('rejects a non-array body', async () => {
    await expect(hoursService.updateOwnHours(77, { dayOfWeek: 'MONDAY' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects an empty array', async () => {
    await expect(hoursService.updateOwnHours(77, [])).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects more than 7 entries', async () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      dayOfWeek: 'MONDAY',
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
      _i: i,
    }));
    await expect(hoursService.updateOwnHours(77, entries)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects an invalid weekday', async () => {
    await expect(
      hoursService.updateOwnHours(77, [
        { dayOfWeek: 'FUNDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a non-boolean isClosed', async () => {
    await expect(
      hoursService.updateOwnHours(77, [{ dayOfWeek: 'MONDAY', isClosed: 'yes' }]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each(['9am', '9:00', '25:00', '09:60', '09-00', ''])(
    'rejects a malformed open/close time: %p',
    async (bad) => {
      await expect(
        hoursService.updateOwnHours(77, [
          { dayOfWeek: 'MONDAY', isClosed: false, openTime: bad, closeTime: '18:00' },
        ]),
      ).rejects.toMatchObject({ statusCode: 400 });
    },
  );

  it('rejects closeTime equal to openTime', async () => {
    await expect(
      hoursService.updateOwnHours(77, [
        { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '09:00' },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects closeTime before openTime', async () => {
    await expect(
      hoursService.updateOwnHours(77, [
        { dayOfWeek: 'MONDAY', isClosed: false, openTime: '18:00', closeTime: '09:00' },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not require an opening interval for a closed day', async () => {
    await expect(
      hoursService.updateOwnHours(77, [{ dayOfWeek: 'FRIDAY', isClosed: true }]),
    ).resolves.toBeDefined();
    expect(prisma.providerOperatingHour.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isClosed: true, openTime: null, closeTime: null }),
      }),
    );
  });

  it('forces openTime/closeTime to null on a closed day even if the client sent times', async () => {
    await hoursService.updateOwnHours(77, [
      { dayOfWeek: 'FRIDAY', isClosed: true, openTime: '09:00', closeTime: '18:00' },
    ]);
    expect(prisma.providerOperatingHour.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ openTime: null, closeTime: null }),
      }),
    );
  });

  it('rejects a duplicate weekday within the same request', async () => {
    await expect(
      hoursService.updateOwnHours(77, [
        { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 'MONDAY', isClosed: false, openTime: '10:00', closeTime: '17:00' },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('upserts by the (providerId, dayOfWeek) unique key — never a duplicate-row create', async () => {
    await hoursService.updateOwnHours(77, [
      { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
    ]);
    expect(prisma.providerOperatingHour.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId_dayOfWeek: { providerId: 2, dayOfWeek: 'MONDAY' } },
      }),
    );
  });

  it('accepts a full valid week in one call', async () => {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY'];
    const entries = [
      ...days.map((dayOfWeek) => ({
        dayOfWeek,
        isClosed: false,
        openTime: '09:00',
        closeTime: '18:00',
      })),
      { dayOfWeek: 'FRIDAY', isClosed: true },
    ];
    await expect(hoursService.updateOwnHours(77, entries)).resolves.toBeDefined();
    expect(prisma.providerOperatingHour.upsert).toHaveBeenCalledTimes(7);
  });

  it('rejects when the account has no linked provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(
      hoursService.updateOwnHours(77, [
        { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
      ]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
