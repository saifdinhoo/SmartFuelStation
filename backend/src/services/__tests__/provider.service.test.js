jest.mock('../../config/prisma', () => ({
  provider: { findMany: jest.fn() },
}));

const prisma = require('../../config/prisma');
const providerService = require('../provider.service');

function providerRow(overrides = {}) {
  return {
    id: 2,
    businessName: 'Cedars Auto Care',
    isApproved: true,
    commissionRate: '10.00',
    commissionUpdatedAt: new Date('2026-08-30T00:00:00.000Z'),
    commissionUpdatedByAdminId: 1,
    ...overrides,
  };
}

describe('listProviders', () => {
  // GET /providers is reachable by every authenticated role, including
  // CUSTOMER — commissionRate and its audit fields are internal
  // platform/admin configuration (Phase D) and must never appear here for
  // ANY role, admin included. Admin reads it through the dedicated
  // GET /admin/providers/:id/commission endpoint instead.
  it.each(['CUSTOMER', 'PROVIDER', 'ADMIN'])(
    'never exposes commissionRate or its audit fields to role %s',
    async (role) => {
      prisma.provider.findMany.mockResolvedValue([providerRow()]);

      const [result] = await providerService.listProviders(role);

      expect(result).not.toHaveProperty('commissionRate');
      expect(result).not.toHaveProperty('commissionUpdatedAt');
      expect(result).not.toHaveProperty('commissionUpdatedByAdminId');
      expect(result.businessName).toBe('Cedars Auto Care');
    },
  );

  it('scopes non-admin callers to approved providers only, admin to everything', async () => {
    prisma.provider.findMany.mockResolvedValue([]);

    await providerService.listProviders('CUSTOMER');
    expect(prisma.provider.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { isApproved: true } }),
    );

    await providerService.listProviders('ADMIN');
    expect(prisma.provider.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
