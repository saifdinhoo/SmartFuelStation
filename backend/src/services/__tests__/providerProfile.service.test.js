jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn(), update: jest.fn() },
  user: { update: jest.fn() },
  providerService: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  serviceCategory: { findUnique: jest.fn() },
  booking: { count: jest.fn() },
  queueEntry: { count: jest.fn() },
  review: { aggregate: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../../config/prisma');
const profileService = require('../providerProfile.service');

const OWNER_USER_ID = 2;
const PROVIDER_ID = 1;

function ownProvider(overrides = {}) {
  return { id: PROVIDER_ID, userId: OWNER_USER_ID, businessName: 'Cedars Auto Care', ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 2 } });
});

describe('requireOwnProvider', () => {
  it('rejects an account with no linked provider profile', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(profileService.requireOwnProvider(999)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('resolves the provider linked to the account', async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    await expect(profileService.requireOwnProvider(OWNER_USER_ID)).resolves.toMatchObject({
      id: PROVIDER_ID,
    });
  });
});

describe('updateOwnProfile', () => {
  beforeEach(() => {
    prisma.provider.findUnique
      .mockResolvedValueOnce(ownProvider())
      .mockResolvedValue({ ...ownProvider(), latitude: null, longitude: null, services: [], user: {} });
  });

  it.each([
    ['latitude', { latitude: 91 }],
    ['latitude', { latitude: -91 }],
    ['longitude', { longitude: 181 }],
    ['longitude', { longitude: -181 }],
  ])('rejects an out-of-range %s', async (_label, input) => {
    await expect(profileService.updateOwnProfile(OWNER_USER_ID, input)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects a blank business name', async () => {
    await expect(
      profileService.updateOwnProfile(OWNER_USER_ID, { businessName: '   ' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a non-boolean isOpen', async () => {
    await expect(
      profileService.updateOwnProfile(OWNER_USER_ID, { isOpen: 'yes' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a negative estimatedWaitMinutes', async () => {
    await expect(
      profileService.updateOwnProfile(OWNER_USER_ID, { estimatedWaitMinutes: -5 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('only writes the fields that were actually supplied', async () => {
    await profileService.updateOwnProfile(OWNER_USER_ID, { isOpen: true });
    expect(prisma.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isOpen: true } }),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('routes phone to the linked User, not Provider', async () => {
    await profileService.updateOwnProfile(OWNER_USER_ID, { phone: '+9613334444' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: OWNER_USER_ID }, data: { phone: '+9613334444' } }),
    );
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });
});

describe('deactivateOwnAccount', () => {
  it('rejects an account with no linked provider profile', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(profileService.deactivateOwnAccount(999)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });

  it('marks the linked user inactive and closes the business — nothing else', async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());

    const result = await profileService.deactivateOwnAccount(OWNER_USER_ID);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: OWNER_USER_ID },
      data: { isActive: false },
    });
    expect(prisma.provider.update).toHaveBeenCalledWith({
      where: { id: PROVIDER_ID },
      data: { isOpen: false },
    });
    expect(result).toEqual({ deactivated: true });
  });

  it('never touches services, bookings, or any other model', async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());

    await profileService.deactivateOwnAccount(OWNER_USER_ID);

    expect(prisma.providerService.create).not.toHaveBeenCalled();
    expect(prisma.providerService.update).not.toHaveBeenCalled();
    expect(prisma.providerService.delete).not.toHaveBeenCalled();
    expect(prisma.booking.count).not.toHaveBeenCalled();
  });
});

describe('createService', () => {
  beforeEach(() => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    prisma.serviceCategory.findUnique.mockResolvedValue({ id: 3, name: 'Tire Repair' });
  });

  it.each([
    ['missing name', { price: 10, durationMinutes: 30, categoryId: 3 }],
    ['missing price', { name: 'X', durationMinutes: 30, categoryId: 3 }],
    ['missing duration', { name: 'X', price: 10, categoryId: 3 }],
    ['missing categoryId', { name: 'X', price: 10, durationMinutes: 30 }],
    ['negative price', { name: 'X', price: -1, durationMinutes: 30, categoryId: 3 }],
    ['zero duration', { name: 'X', price: 10, durationMinutes: 0, categoryId: 3 }],
    ['fractional duration', { name: 'X', price: 10, durationMinutes: 2.5, categoryId: 3 }],
  ])('rejects %s', async (_label, input) => {
    await expect(profileService.createService(OWNER_USER_ID, input)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects an unknown category', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue(null);
    await expect(
      profileService.createService(OWNER_USER_ID, {
        name: 'X',
        price: 10,
        durationMinutes: 30,
        categoryId: 404,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('turns a duplicate-name unique violation into a 409', async () => {
    prisma.providerService.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      profileService.createService(OWNER_USER_ID, {
        name: 'Oil Change',
        price: 10,
        durationMinutes: 30,
        categoryId: 3,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('attaches the service to the caller\'s own provider id', async () => {
    prisma.providerService.create.mockResolvedValue({ id: 9, price: 10 });
    await profileService.createService(OWNER_USER_ID, {
      name: 'New',
      price: 10,
      durationMinutes: 30,
      categoryId: 3,
    });
    expect(prisma.providerService.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ providerId: PROVIDER_ID }) }),
    );
  });
});

describe('updateService ownership', () => {
  it("refuses to touch another business's service", async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    prisma.providerService.findUnique.mockResolvedValue({ id: 50, providerId: 999 });
    await expect(
      profileService.updateService(OWNER_USER_ID, 50, { price: 5 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('404s on a service that does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    prisma.providerService.findUnique.mockResolvedValue(null);
    await expect(
      profileService.updateService(OWNER_USER_ID, 51, { price: 5 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an empty update', async () => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: PROVIDER_ID });
    await expect(profileService.updateService(OWNER_USER_ID, 5, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('deleteService safety rules', () => {
  beforeEach(() => {
    prisma.provider.findUnique.mockResolvedValue(ownProvider());
    prisma.providerService.findUnique.mockResolvedValue({ id: 5, providerId: PROVIDER_ID });
  });

  it('refuses to delete a service that has bookings', async () => {
    prisma.booking.count.mockResolvedValue(3);
    prisma.queueEntry.count.mockResolvedValue(0);
    await expect(profileService.deleteService(OWNER_USER_ID, 5)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.providerService.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a service that has queue entries', async () => {
    prisma.booking.count.mockResolvedValue(0);
    prisma.queueEntry.count.mockResolvedValue(1);
    await expect(profileService.deleteService(OWNER_USER_ID, 5)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.providerService.delete).not.toHaveBeenCalled();
  });

  it('deletes a service with no history', async () => {
    prisma.booking.count.mockResolvedValue(0);
    prisma.queueEntry.count.mockResolvedValue(0);
    await expect(profileService.deleteService(OWNER_USER_ID, 5)).resolves.toEqual({ id: 5 });
    expect(prisma.providerService.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});
