const categoryService = require('../services/category.service');
const auditLogService = require('../services/auditLog.service');

async function list(req, res, next) {
  try {
    const categories = await categoryService.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });

    await auditLogService.record({
      adminId: req.user.userId,
      action: 'CATEGORY_CREATED',
      entityType: 'ServiceCategory',
      entityId: category.id,
      metadata: { name: category.name },
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: category });

    await auditLogService.record({
      adminId: req.user.userId,
      action: 'CATEGORY_UPDATED',
      entityType: 'ServiceCategory',
      entityId: category.id,
      metadata: { name: category.name },
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await categoryService.deleteCategory(id);
    res.status(204).send();

    await auditLogService.record({
      adminId: req.user.userId,
      action: 'CATEGORY_DELETED',
      entityType: 'ServiceCategory',
      entityId: id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
