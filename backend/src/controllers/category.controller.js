const categoryService = require('../services/category.service');

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
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
