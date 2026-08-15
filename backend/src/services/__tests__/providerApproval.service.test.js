jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn(), update: jest.fn() },
  providerService: { count: jest.fn() },
  serviceCategory: { delete: jest.fn() },
}));

const prisma = require('../../config/prisma');
const providerService = require('../provider.service');
const categoryService = require('../category.service');

const ADMIN_ID = 1;

beforeEach(() => {
  jest.clearAllMocks();
  prisma.provider.findUnique.mockResolvedValue({ id: 5, isApproved: false });
  prisma.provider.update.mockResolvedValue({ id: 5 });
});

describe('setProviderApproval', () => {
  it.each(['abc', 1.5, null])('rejects a non-integer provider id: %p', async (id) => {
    await expect(providerService.setProviderApproval(id, true, ADMIN_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it.each(['yes', 1, null, undefined])('rejects a non-boolean isApproved: %p', async (value) => {
    await expect(providerService.setProviderApproval(5, value, ADMIN_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('404s on a provider that does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(providerService.setProviderApproval(5, true, ADMIN_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('records who approved and when', async () => {
    await providerService.setProviderApproval(5, true, ADMIN_ID);
    const { data } = prisma.provider.update.mock.calls[0][0];
    expect(data.isApproved).toBe(true);
    expect(data.approvedById).toBe(ADMIN_ID);
    expect(data.approvedAt).toBeInstanceOf(Date);
  });

  it('clears the approval trail and closes the business when rejecting', async () => {
    await providerService.setProviderApproval(5, false, ADMIN_ID);
    expect(prisma.provider.update.mock.calls[0][0].data).toEqual({
      isApproved: false,
      approvedAt: null,
      approvedById: null,
      isOpen: false,
    });
  });
});

describe('deleteCategory safe-delete', () => {
  it('rejects a non-integer id', async () => {
    await expect(categoryService.deleteCategory('abc')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses to delete a category still used by provider services', async () => {
    prisma.providerService.count.mockResolvedValue(4);
    await expect(categoryService.deleteCategory(2)).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.serviceCategory.delete).not.toHaveBeenCalled();
  });

  it('points at deactivation as the alternative', async () => {
    prisma.providerService.count.mockResolvedValue(1);
    await expect(categoryService.deleteCategory(2)).rejects.toThrow(/deactivate/i);
  });

  it('deletes an unused category', async () => {
    prisma.providerService.count.mockResolvedValue(0);
    await categoryService.deleteCategory(2);
    expect(prisma.serviceCategory.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
