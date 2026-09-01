jest.mock('../../services/complaint.service');

const complaintService = require('../../services/complaint.service');
const complaintController = require('../complaint.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('create', () => {
  it('sources customerId only from the verified JWT, never a client-supplied field', async () => {
    complaintService.createComplaint.mockResolvedValue({ id: 1 });
    const req = {
      user: { userId: 33, role: 'CUSTOMER' },
      body: {
        customerId: 999,
        submittedById: 999,
        providerId: 2,
        subject: 'Rude staff',
        details: 'Waited an hour.',
        severity: 'HIGH',
      },
    };
    const res = fakeRes();

    await complaintController.create(req, res, jest.fn());

    expect(complaintService.createComplaint).toHaveBeenCalledWith({
      customerId: 33,
      providerId: 2,
      subject: 'Rude staff',
      details: 'Waited an hour.',
      severity: 'HIGH',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('passes a service error to next()', async () => {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    complaintService.createComplaint.mockRejectedValue(err);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, body: {} };
    const next = jest.fn();

    await complaintController.create(req, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('listMine', () => {
  it('sources customerId only from the verified JWT', async () => {
    complaintService.listMyComplaints.mockResolvedValue([{ id: 1 }]);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, query: { submittedById: 999 } };
    const res = fakeRes();

    await complaintController.listMine(req, res, jest.fn());

    expect(complaintService.listMyComplaints).toHaveBeenCalledWith(33);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });
});
