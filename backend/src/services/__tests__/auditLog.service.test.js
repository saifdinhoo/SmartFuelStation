jest.mock('../../config/prisma', () => ({
  adminAuditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
}));

const prisma = require('../../config/prisma');
const auditLogService = require('../auditLog.service');

let consoleErrorSpy;

beforeEach(() => {
  jest.resetAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('record', () => {
  it('writes a real row for a registered action', async () => {
    prisma.adminAuditLog.create.mockResolvedValue({ id: 1 });

    await auditLogService.record({
      adminId: 3,
      action: 'PROVIDER_APPROVED',
      entityType: 'Provider',
      entityId: 9,
      metadata: { businessName: 'Cedars Auto Care' },
    });

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: 3,
        action: 'PROVIDER_APPROVED',
        entityType: 'Provider',
        entityId: 9,
        metadata: { businessName: 'Cedars Auto Care' },
      },
    });
  });

  it('never throws out to the caller — a failed audit write must not fail the real admin action it describes', async () => {
    prisma.adminAuditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      auditLogService.record({ adminId: 3, action: 'PROVIDER_APPROVED', entityType: 'Provider', entityId: 9 }),
    ).resolves.toBeUndefined();
  });

  it('never throws for an unregistered action either — logs and swallows', async () => {
    await expect(
      auditLogService.record({ adminId: 3, action: 'NOT_A_REAL_ACTION', entityType: 'Provider', entityId: 9 }),
    ).resolves.toBeUndefined();
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    ['password', { password: 'secret' }],
    ['passwordHash', { passwordHash: 'hash' }],
    ['token', { token: 'raw-token' }],
    ['tokenHash', { tokenHash: 'hash' }],
    ['jwt', { jwt: 'eyJ...' }],
    ['apiKey', { apiKey: 'sk-...' }],
    ['nested secret', { detail: { password: 'secret' } }],
    ['secret inside an array', { changes: [{ token: 'x' }] }],
  ])('refuses to persist metadata containing a %s field', async (_label, metadata) => {
    await auditLogService.record({
      adminId: 3,
      action: 'PROVIDER_APPROVED',
      entityType: 'Provider',
      entityId: 9,
      metadata,
    });
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it('requires entityType', async () => {
    await auditLogService.record({ adminId: 3, action: 'PROVIDER_APPROVED', entityId: 9 });
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });
});

describe('list', () => {
  it('paginates with the documented defaults', async () => {
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);

    const result = await auditLogService.list();

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it('applies the action filter', async () => {
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);

    await auditLogService.list({ action: 'CATEGORY_DELETED' });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: 'CATEGORY_DELETED' }) }),
    );
  });

  it('rejects an unrecognized action filter rather than silently returning everything', async () => {
    await expect(auditLogService.list({ action: 'NOT_A_REAL_ACTION' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects an out-of-range pageSize', async () => {
    await expect(auditLogService.list({ pageSize: 500 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('computes the correct page offset', async () => {
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);

    await auditLogService.list({ page: 3, pageSize: 10 });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('orders newest first', async () => {
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);

    await auditLogService.list();

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    );
  });
});
