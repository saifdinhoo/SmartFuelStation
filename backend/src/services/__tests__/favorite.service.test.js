jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  favorite: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const prisma = require('../../config/prisma');
const favoriteService = require('../favorite.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listMyFavorites', () => {
  it('only ever queries by the given userId — never another customer\'s favorites', async () => {
    prisma.favorite.findMany.mockResolvedValue([]);

    await favoriteService.listMyFavorites(33);

    expect(prisma.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 33 } }),
    );
  });
});

describe('addFavorite', () => {
  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);

    await expect(favoriteService.addFavorite(33, 2)).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.favorite.create).not.toHaveBeenCalled();
  });

  it('creates a new favorite scoped to the real caller — never a client-supplied userId', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.favorite.findUnique.mockResolvedValue(null);
    prisma.favorite.create.mockResolvedValue({ id: 1, userId: 33, providerId: 2 });

    await favoriteService.addFavorite(33, 2);

    expect(prisma.favorite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 33, providerId: 2 } }),
    );
  });

  it('is idempotent — favoriting an already-favorited provider returns the existing row, never a duplicate/409', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    const existing = { id: 1, userId: 33, providerId: 2 };
    prisma.favorite.findUnique.mockResolvedValue(existing);

    const result = await favoriteService.addFavorite(33, 2);

    expect(result).toBe(existing);
    expect(prisma.favorite.create).not.toHaveBeenCalled();
  });

  it('rejects a non-integer providerId', async () => {
    await expect(favoriteService.addFavorite(33, 'nope')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });
});

describe('removeFavorite', () => {
  it('deletes scoped to the real caller\'s own favorite only', async () => {
    prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

    await favoriteService.removeFavorite(33, 2);

    expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 33, providerId: 2 },
    });
  });

  it('is idempotent — unfavoriting something not favorited succeeds silently, never a 404', async () => {
    prisma.favorite.deleteMany.mockResolvedValue({ count: 0 });

    await expect(favoriteService.removeFavorite(33, 999)).resolves.toBeUndefined();
  });
});
