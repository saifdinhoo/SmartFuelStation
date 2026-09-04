jest.mock('../../services/category.service');
jest.mock('../../services/auditLog.service');

const categoryService = require('../../services/category.service');
const auditLogService = require('../../services/auditLog.service');
const categoryController = require('../category.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

const ADMIN = { userId: 1, role: 'ADMIN' };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('list', () => {
  it('returns every category, no audit entry for a read', async () => {
    const categories = [{ id: 1, name: 'Oil Change' }];
    categoryService.listCategories.mockResolvedValue(categories);
    const res = fakeRes();

    await categoryController.list({}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, data: categories });
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  it('records a CATEGORY_CREATED audit entry after a successful create', async () => {
    const category = { id: 3, name: 'Detailing' };
    categoryService.createCategory.mockResolvedValue(category);
    const req = { user: ADMIN, body: { name: 'Detailing' } };

    await categoryController.create(req, fakeRes(), jest.fn());

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'CATEGORY_CREATED',
        entityType: 'ServiceCategory',
        entityId: 3,
      }),
    );
  });

  it('passes a validation error to next() rather than recording an audit entry', async () => {
    const err = new Error('name is required');
    err.statusCode = 400;
    categoryService.createCategory.mockRejectedValue(err);
    const next = jest.fn();

    await categoryController.create({ user: ADMIN, body: {} }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('records a CATEGORY_UPDATED audit entry after a successful update', async () => {
    const category = { id: 3, name: 'Detailing & Polish' };
    categoryService.updateCategory.mockResolvedValue(category);
    const req = { user: ADMIN, params: { id: '3' }, body: { name: 'Detailing & Polish' } };

    await categoryController.update(req, fakeRes(), jest.fn());

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'CATEGORY_UPDATED',
        entityType: 'ServiceCategory',
        entityId: 3,
      }),
    );
  });
});

describe('remove', () => {
  it('records a CATEGORY_DELETED audit entry after a successful delete', async () => {
    categoryService.deleteCategory.mockResolvedValue(undefined);
    const req = { user: ADMIN, params: { id: '3' } };

    await categoryController.remove(req, fakeRes(), jest.fn());

    expect(categoryService.deleteCategory).toHaveBeenCalledWith(3);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'CATEGORY_DELETED', entityType: 'ServiceCategory', entityId: 3 }),
    );
  });

  it('passes a conflict error (category in use) to next() rather than recording an audit entry', async () => {
    const err = new Error('This category is used by 2 provider service(s) and cannot be deleted.');
    err.statusCode = 409;
    categoryService.deleteCategory.mockRejectedValue(err);
    const next = jest.fn();

    await categoryController.remove({ user: ADMIN, params: { id: '3' } }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});
