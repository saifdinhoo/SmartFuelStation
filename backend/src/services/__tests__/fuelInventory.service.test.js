jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  providerFuelInventory: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  fuelInventoryHistory: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../../config/prisma');
const fuelService = require('../fuelInventory.service');

const CUSTOMER = { userId: 33, role: 'CUSTOMER' };
const OWN_PROVIDER_USER = { userId: 77, role: 'PROVIDER' };
const OTHER_PROVIDER_USER = { userId: 88, role: 'PROVIDER' };
const ADMIN = { userId: 1, role: 'ADMIN' };

function providerRow(overrides = {}) {
  return { id: 2, userId: 77, isApproved: true, ...overrides };
}

function inventoryRow(overrides = {}) {
  return {
    id: 5,
    providerId: 2,
    fuelType: 'GASOLINE_95',
    capacityLiters: '20000.00',
    currentLiters: '7450.00',
    pricePerLiter: '6.80',
    updatedByAdminId: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-31T10:35:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
});

describe('percentageRemaining', () => {
  it('computes a normal percentage rounded to one decimal', () => {
    expect(fuelService.percentageRemaining(7450, 20000)).toBeCloseTo(37.3, 5);
  });

  it('clamps to 0 rather than NaN/negative when capacity is 0 or invalid', () => {
    expect(fuelService.percentageRemaining(100, 0)).toBe(0);
    expect(fuelService.percentageRemaining(100, -5)).toBe(0);
  });

  it('never exceeds 100 even if current somehow exceeds capacity', () => {
    expect(fuelService.percentageRemaining(25000, 20000)).toBe(100);
  });

  it('is 0 for an empty tank and 100 for a full one', () => {
    expect(fuelService.percentageRemaining(0, 20000)).toBe(0);
    expect(fuelService.percentageRemaining(20000, 20000)).toBe(100);
  });
});

describe('getPublicFuel (public/provider-own read)', () => {
  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(fuelService.getPublicFuel(2, CUSTOMER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('404s (never 403) when a customer looks up an unapproved provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    await expect(fuelService.getPublicFuel(2, CUSTOMER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lets a customer read an approved provider\'s fuel status', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([inventoryRow()]);
    const result = await fuelService.getPublicFuel(2, CUSTOMER);
    expect(result).toHaveLength(1);
    expect(result[0].fuelType).toBe('GASOLINE_95');
    expect(result[0].displayName).toBe('Gasoline 95');
  });

  it('returns an empty list for a provider with no fuel inventory at all', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([]);
    await expect(fuelService.getPublicFuel(2, CUSTOMER)).resolves.toEqual([]);
  });

  it('blocks a provider from reading a different business\'s fuel status', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow());
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow({ id: 3, userId: 88 }));
    await expect(fuelService.getPublicFuel(2, OTHER_PROVIDER_USER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets a provider read their own fuel status', async () => {
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow());
    prisma.provider.findUnique.mockResolvedValueOnce(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([inventoryRow()]);
    await expect(fuelService.getPublicFuel(2, OWN_PROVIDER_USER)).resolves.toHaveLength(1);
  });

  it('lets an admin read any provider\'s fuel status, approved or not', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    prisma.providerFuelInventory.findMany.mockResolvedValue([]);
    await expect(fuelService.getPublicFuel(2, ADMIN)).resolves.toEqual([]);
  });

  it('never leaks updatedByAdminId or any admin identity in the public shape', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([inventoryRow()]);
    const result = await fuelService.getPublicFuel(2, CUSTOMER);
    expect(result[0]).not.toHaveProperty('updatedByAdminId');
    expect(result[0]).not.toHaveProperty('updatedByAdminName');
    expect(JSON.stringify(result)).not.toMatch(/admin/i);
  });

  it('computes percentageRemaining from real capacity/current, not a stored field', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([
      inventoryRow({ capacityLiters: '20000.00', currentLiters: '7450.00' }),
    ]);
    const result = await fuelService.getPublicFuel(2, CUSTOMER);
    expect(result[0].percentageRemaining).toBeCloseTo(37.3, 5);
  });
});

describe('getOwnFuel', () => {
  it('rejects an account with no linked provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(fuelService.getOwnFuel(77)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns the caller\'s own inventory', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([inventoryRow()]);
    await expect(fuelService.getOwnFuel(77)).resolves.toHaveLength(1);
  });
});

describe('listAdminFuelForProvider', () => {
  it('404s for an unknown provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(fuelService.listAdminFuelForProvider(999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('includes the admin audit fields the public shape omits', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findMany.mockResolvedValue([
      { ...inventoryRow(), updatedByAdmin: { name: 'Site Admin' } },
    ]);
    const result = await fuelService.listAdminFuelForProvider(2);
    expect(result[0].updatedByAdminId).toBe(1);
    expect(result[0].updatedByAdminName).toBe('Site Admin');
  });
});

describe('adminUpsertFuel — validation', () => {
  beforeEach(() => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
  });

  it('rejects an unknown provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(
      fuelService.adminUpsertFuel(999, 'GASOLINE_95', { capacityLiters: 100, currentLiters: 50 }, 1),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid fuel type', async () => {
    await expect(
      fuelService.adminUpsertFuel(2, 'JET_FUEL', { capacityLiters: 100, currentLiters: 50 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects zero or negative capacity', async () => {
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 0, currentLiters: 0 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: -100, currentLiters: 0 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects negative current liters', async () => {
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: -1 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects currentLiters greater than capacityLiters', async () => {
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: 150 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects malformed (non-numeric) values', async () => {
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 'a lot', currentLiters: 50 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a negative price when price is provided', async () => {
    await expect(
      fuelService.adminUpsertFuel(
        2,
        'DIESEL',
        { capacityLiters: 100, currentLiters: 50, pricePerLiter: -1 },
        1,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('accepts a missing price as null rather than requiring one', async () => {
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null);
    prisma.providerFuelInventory.upsert.mockResolvedValue(
      inventoryRow({ pricePerLiter: null }),
    );
    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: 50 }, 1),
    ).resolves.toMatchObject({ pricePerLiter: null });
  });
});

describe('adminUpsertFuel — initial create', () => {
  it('creates the inventory row and an initial history row with previous=0/null', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null); // no existing row
    prisma.providerFuelInventory.upsert.mockResolvedValue(
      inventoryRow({ capacityLiters: '20000.00', currentLiters: '15000.00', pricePerLiter: '6.80' }),
    );

    await fuelService.adminUpsertFuel(
      2,
      'GASOLINE_95',
      { capacityLiters: 20000, currentLiters: 15000, pricePerLiter: 6.8 },
      1,
    );

    expect(prisma.fuelInventoryHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousLiters: 0,
          newLiters: 15000,
          previousCapacityLiters: null,
          newCapacityLiters: 20000,
          previousPricePerLiter: null,
          newPricePerLiter: 6.8,
          changedByAdminId: 1,
        }),
      }),
    );
  });

  it('upserts by the (providerId, fuelType) unique key', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null);
    prisma.providerFuelInventory.upsert.mockResolvedValue(inventoryRow());

    await fuelService.adminUpsertFuel(
      2,
      'GASOLINE_95',
      { capacityLiters: 20000, currentLiters: 7450 },
      1,
    );

    expect(prisma.providerFuelInventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId_fuelType: { providerId: 2, fuelType: 'GASOLINE_95' } },
      }),
    );
  });
});

describe('adminUpsertFuel — update of an existing row', () => {
  it('records the real previous values in the history row', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(
      inventoryRow({ currentLiters: '15000.00', capacityLiters: '20000.00', pricePerLiter: '6.80' }),
    );
    prisma.providerFuelInventory.upsert.mockResolvedValue(
      inventoryRow({ currentLiters: '10000.00' }),
    );

    await fuelService.adminUpsertFuel(
      2,
      'GASOLINE_95',
      { capacityLiters: 20000, currentLiters: 10000, pricePerLiter: 6.8 },
      1,
    );

    expect(prisma.fuelInventoryHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousLiters: '15000.00',
          newLiters: 10000,
          previousCapacityLiters: '20000.00',
          newCapacityLiters: 20000,
        }),
      }),
    );
  });

  it('reflects the change in the returned public-shaped inventory', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(inventoryRow({ currentLiters: '15000.00' }));
    prisma.providerFuelInventory.upsert.mockResolvedValue(
      inventoryRow({ currentLiters: '10000.00', capacityLiters: '20000.00' }),
    );

    const result = await fuelService.adminUpsertFuel(
      2,
      'GASOLINE_95',
      { capacityLiters: 20000, currentLiters: 10000 },
      1,
    );

    expect(result.currentLiters).toBe(10000);
    expect(result.percentageRemaining).toBeCloseTo(50, 5);
  });
});

describe('adminUpsertFuel — transaction atomicity', () => {
  it('never inserts a history row if the inventory upsert itself fails', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null);
    prisma.providerFuelInventory.upsert.mockRejectedValue(new Error('db write failed'));

    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: 50 }, 1),
    ).rejects.toThrow('db write failed');

    expect(prisma.fuelInventoryHistory.create).not.toHaveBeenCalled();
  });

  it('propagates a failure from the history insert rather than swallowing it', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null);
    prisma.providerFuelInventory.upsert.mockResolvedValue(inventoryRow());
    prisma.fuelInventoryHistory.create.mockRejectedValue(new Error('history insert failed'));

    await expect(
      fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: 50 }, 1),
    ).rejects.toThrow('history insert failed');
  });

  it('runs both writes inside prisma.$transaction', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.providerFuelInventory.findUnique.mockResolvedValue(null);
    prisma.providerFuelInventory.upsert.mockResolvedValue(inventoryRow());

    await fuelService.adminUpsertFuel(2, 'DIESEL', { capacityLiters: 100, currentLiters: 50 }, 1);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('getPublicHistory', () => {
  it('404s (never 403) for a customer on an unapproved provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ isApproved: false }));
    await expect(fuelService.getPublicHistory(2, {}, CUSTOMER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('returns only timestamp/liters/fuelType — never the acting admin', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.fuelInventoryHistory.findMany.mockResolvedValue([
      { fuelType: 'GASOLINE_95', newLiters: '15000.00', createdAt: new Date('2026-08-01T00:00:00Z') },
      { fuelType: 'GASOLINE_95', newLiters: '10000.00', createdAt: new Date('2026-08-15T00:00:00Z') },
    ]);

    const result = await fuelService.getPublicHistory(2, {}, CUSTOMER);

    expect(result).toEqual([
      { fuelType: 'GASOLINE_95', liters: 15000, timestamp: new Date('2026-08-01T00:00:00Z') },
      { fuelType: 'GASOLINE_95', liters: 10000, timestamp: new Date('2026-08-15T00:00:00Z') },
    ]);
    for (const point of result) {
      expect(Object.keys(point).sort()).toEqual(['fuelType', 'liters', 'timestamp']);
    }
  });

  it('filters by fuelType when given', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.fuelInventoryHistory.findMany.mockResolvedValue([]);

    await fuelService.getPublicHistory(2, { fuelType: 'DIESEL' }, CUSTOMER);

    expect(prisma.fuelInventoryHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ fuelType: 'DIESEL' }) }),
    );
  });

  it('rejects an invalid range', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    await expect(fuelService.getPublicHistory(2, { range: '1y' }, CUSTOMER)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('defaults to a 30-day window', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.fuelInventoryHistory.findMany.mockResolvedValue([]);

    await fuelService.getPublicHistory(2, {}, CUSTOMER);

    const call = prisma.fuelInventoryHistory.findMany.mock.calls[0][0];
    const since = call.where.createdAt.gte;
    const daysAgo = (Date.now() - since.getTime()) / 86_400_000;
    expect(daysAgo).toBeGreaterThan(29);
    expect(daysAgo).toBeLessThan(31);
  });
});

describe('getAdminHistory', () => {
  it('404s for an unknown provider', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(fuelService.getAdminHistory(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('includes the acting admin\'s id and name for every row', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.fuelInventoryHistory.findMany.mockResolvedValue([
      {
        id: 1,
        fuelType: 'GASOLINE_95',
        previousLiters: '15000.00',
        newLiters: '10000.00',
        previousCapacityLiters: '20000.00',
        newCapacityLiters: '20000.00',
        previousPricePerLiter: null,
        newPricePerLiter: null,
        createdAt: new Date(),
        changedByAdmin: { id: 1, name: 'Site Admin' },
      },
    ]);

    const result = await fuelService.getAdminHistory(2);
    expect(result[0].changedByAdminId).toBe(1);
    expect(result[0].changedByAdminName).toBe('Site Admin');
  });

  it('is unfiltered by default (full audit trail), not just 30 days', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    prisma.fuelInventoryHistory.findMany.mockResolvedValue([]);

    await fuelService.getAdminHistory(2);

    const call = prisma.fuelInventoryHistory.findMany.mock.calls[0][0];
    expect(call.where.createdAt).toBeUndefined();
  });
});
