const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function listCategories() {
  return prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
}

async function createCategory({ name, description }) {
  if (!name) throw badRequest('name is required');
  return prisma.serviceCategory.create({ data: { name, description } });
}

async function updateCategory(id, { name, description }) {
  return prisma.serviceCategory.update({
    where: { id: Number(id) },
    data: { name, description },
  });
}

async function deleteCategory(id) {
  return prisma.serviceCategory.delete({ where: { id: Number(id) } });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
