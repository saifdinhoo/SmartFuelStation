jest.mock('../../../config/prisma', () => ({
  serviceCategory: { findMany: jest.fn() },
}));

const prisma = require('../../../config/prisma');
const { listCandidateCategories, resolveCategoryId } = require('../categoryResolver');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listCandidateCategories', () => {
  it('queries only id/name/description/isActive — never any unrelated table or field', async () => {
    prisma.serviceCategory.findMany.mockResolvedValue([]);
    await listCandidateCategories();

    expect(prisma.serviceCategory.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, isActive: true },
    });
  });

  it('prefers active categories when at least one exists', async () => {
    prisma.serviceCategory.findMany.mockResolvedValue([
      { id: 1, name: 'Oil Change', description: 'x', isActive: true },
      { id: 2, name: 'Old Category', description: 'x', isActive: false },
    ]);

    const result = await listCandidateCategories();
    expect(result).toEqual([{ id: 1, name: 'Oil Change', description: 'x', isActive: true }]);
  });

  it('falls back to the full list when isActive is inconsistently false on every row (known limitation, not fixed here)', async () => {
    const all = [
      { id: 1, name: 'Oil Change', description: 'x', isActive: false },
      { id: 2, name: 'Tire Repair', description: 'y', isActive: false },
    ];
    prisma.serviceCategory.findMany.mockResolvedValue(all);

    const result = await listCandidateCategories();
    expect(result).toEqual(all);
  });
});

describe('resolveCategoryId', () => {
  const categories = [
    { id: 5, name: 'Brake Inspection', description: 'x', isActive: true },
    { id: 1, name: 'Oil Change', description: 'y', isActive: true },
  ];

  it('matches an exact real category name to its real id', () => {
    expect(resolveCategoryId(categories, 'Brake Inspection')).toBe(5);
  });

  it('matches case-insensitively', () => {
    expect(resolveCategoryId(categories, 'oil change')).toBe(1);
  });

  it('returns null for the literal "NONE"', () => {
    expect(resolveCategoryId(categories, 'NONE')).toBeNull();
  });

  it('returns null for a name that does not match any real category — never fabricates an id', () => {
    expect(resolveCategoryId(categories, 'Engine Rebuild')).toBeNull();
  });

  it.each([null, undefined, ''])('returns null for %p', (value) => {
    expect(resolveCategoryId(categories, value)).toBeNull();
  });
});
