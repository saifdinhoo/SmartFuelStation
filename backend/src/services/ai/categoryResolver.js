// The one narrow, read-only database access Phase 1C allows the AI layer —
// ServiceCategory only, never users/bookings/providers/anything else, and
// Gemini itself never touches Prisma or sees a category id (see
// resolveCategoryId below).
const prisma = require('../../config/prisma');

async function listCandidateCategories() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true, isActive: true },
  });

  // isActive is a known-inconsistent flag on this project (there is no
  // toggle endpoint — see project notes) and is deliberately not "fixed"
  // here. It's only *preferred* when it usefully narrows the list; falling
  // back to the full set keeps diagnosis working even if it can't be
  // trusted on every row.
  const active = categories.filter((category) => category.isActive);
  return active.length > 0 ? active : categories;
}

// The database is the only source of truth for a category id. Gemini only
// ever supplies a name (constrained to this same list via the response
// schema's enum — see diagnosisSchema.js), and that name is matched here
// against the real rows already fetched above. No match, no fabricated id.
function resolveCategoryId(categories, recommendedName) {
  if (!recommendedName || recommendedName === 'NONE') return null;
  const match = categories.find(
    (category) => category.name.toLowerCase() === String(recommendedName).toLowerCase(),
  );
  return match ? match.id : null;
}

module.exports = { listCandidateCategories, resolveCategoryId };
