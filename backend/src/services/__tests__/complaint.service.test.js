jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
  complaint: { create: jest.fn(), findMany: jest.fn() },
}));

const prisma = require('../../config/prisma');
const complaintService = require('../complaint.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createComplaint', () => {
  it('404s when the provider does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(
      complaintService.createComplaint({ customerId: 33, providerId: 2, subject: 'Rude staff' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });

  it('rejects a missing/blank subject', async () => {
    await expect(
      complaintService.createComplaint({ customerId: 33, providerId: 2, subject: '   ' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized severity', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    await expect(
      complaintService.createComplaint({
        customerId: 33,
        providerId: 2,
        subject: 'Rude staff',
        severity: 'CRITICAL',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });

  it('defaults severity to MEDIUM when omitted, matching the schema default', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.complaint.create.mockResolvedValue({ id: 1 });

    await complaintService.createComplaint({ customerId: 33, providerId: 2, subject: 'Rude staff' });

    expect(prisma.complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ severity: 'MEDIUM' }) }),
    );
  });

  it('creates the complaint scoped to the real submitting customer — never trusting a client-supplied submittedById', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.complaint.create.mockResolvedValue({ id: 1 });

    await complaintService.createComplaint({
      customerId: 33,
      providerId: 2,
      subject: 'Rude staff',
      details: 'Waited an hour with no update.',
      severity: 'HIGH',
    });

    expect(prisma.complaint.create).toHaveBeenCalledWith({
      data: {
        submittedById: 33,
        providerId: 2,
        subject: 'Rude staff',
        details: 'Waited an hour with no update.',
        severity: 'HIGH',
      },
      select: expect.any(Object),
    });
  });

  it('trims subject/details and stores null for an omitted details field', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2 });
    prisma.complaint.create.mockResolvedValue({ id: 1 });

    await complaintService.createComplaint({
      customerId: 33,
      providerId: 2,
      subject: '  Rude staff  ',
    });

    expect(prisma.complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subject: 'Rude staff', details: null }),
      }),
    );
  });
});

describe('listMyComplaints', () => {
  it('only ever queries by the given customerId — never another customer\'s complaints', async () => {
    prisma.complaint.findMany.mockResolvedValue([]);

    await complaintService.listMyComplaints(33);

    expect(prisma.complaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { submittedById: 33 } }),
    );
  });

  it('returns newest first', async () => {
    const rows = [{ id: 5, subject: 'Rude staff' }];
    prisma.complaint.findMany.mockResolvedValue(rows);

    const result = await complaintService.listMyComplaints(33);

    expect(result).toBe(rows);
    expect(prisma.complaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});
