jest.mock('../../services/review.service');

const reviewService = require('../../services/review.service');
const reviewController = require('../review.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listMine', () => {
  it('sources customerId only from the verified JWT (req.user), never the query/body', async () => {
    reviewService.listMyReviews.mockResolvedValue([{ id: 1 }]);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, query: { customerId: 999 } };
    const res = fakeRes();

    await reviewController.listMine(req, res, jest.fn());

    expect(reviewService.listMyReviews).toHaveBeenCalledWith(33);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('passes a service error to next() rather than throwing', async () => {
    const err = new Error('boom');
    reviewService.listMyReviews.mockRejectedValue(err);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, query: {} };
    const res = fakeRes();
    const next = jest.fn();

    await reviewController.listMine(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
