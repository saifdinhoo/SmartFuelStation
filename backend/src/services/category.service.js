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

// ProviderService.categoryId is a required relation with no cascade, so
// deleting a category that is still in use previously surfaced as a raw
// Prisma foreign-key error (a 500). Providers' services — and the bookings
// hanging off them — are real history, so the delete is refused with a
// clear 409 pointing at the non-destructive alternative: isActive=false,
// which already hides the category from customer-facing listings (see
// provider.service.js's category filter).
async function deleteCategory(id) {
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) throw badRequest('category id must be a valid integer');

  const inUse = await prisma.providerService.count({ where: { categoryId } });
  if (inUse > 0) {
    const err = new Error(
      `This category is used by ${inUse} provider service(s) and cannot be deleted. ` +
        'Deactivate it instead to hide it from customers while keeping existing services intact.',
    );
    err.statusCode = 409;
    throw err;
  }

  return prisma.serviceCategory.delete({ where: { id: categoryId } });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
