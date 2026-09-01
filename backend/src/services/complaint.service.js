const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
const MAX_SUBJECT_LENGTH = 150;
const MAX_DETAILS_LENGTH = 2000;

// Same select shape admin.service.js uses to list/triage complaints — a
// customer's own complaint list should show exactly the same real fields,
// never a second, looser shape.
const COMPLAINT_SHAPE = {
  id: true,
  subject: true,
  details: true,
  severity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  provider: { select: { id: true, businessName: true } },
};

async function createComplaint({ customerId, providerId, subject, details, severity }) {
  const parsedProviderId = toId(providerId, 'providerId');

  if (!subject || !subject.trim()) {
    throw badRequest('subject is required');
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw badRequest(`subject must be ${MAX_SUBJECT_LENGTH} characters or fewer`);
  }
  if (details && details.length > MAX_DETAILS_LENGTH) {
    throw badRequest(`details must be ${MAX_DETAILS_LENGTH} characters or fewer`);
  }
  const resolvedSeverity = severity ?? 'MEDIUM';
  if (!SEVERITIES.includes(resolvedSeverity)) {
    throw badRequest(`severity must be one of: ${SEVERITIES.join(', ')}`);
  }

  const provider = await prisma.provider.findUnique({ where: { id: parsedProviderId } });
  if (!provider) throw notFound('Provider not found');

  return prisma.complaint.create({
    data: {
      submittedById: customerId,
      providerId: parsedProviderId,
      subject: subject.trim(),
      details: details ? details.trim() : null,
      severity: resolvedSeverity,
    },
    select: COMPLAINT_SHAPE,
  });
}

async function listMyComplaints(customerId) {
  return prisma.complaint.findMany({
    where: { submittedById: customerId },
    select: COMPLAINT_SHAPE,
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { createComplaint, listMyComplaints };
