jest.mock('../../services/auth.service');

const authService = require('../../services/auth.service');
const authController = require('../auth.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('changePassword', () => {
  it('sources userId only from the verified JWT (req.user), never from the request body', async () => {
    authService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });
    const req = {
      user: { userId: 42, role: 'CUSTOMER' },
      // A body pretending to target a different account — must be ignored.
      body: { userId: 999, currentPassword: 'old-real-password', newPassword: 'new-real-password' },
    };
    const res = fakeRes();

    await authController.changePassword(req, res, jest.fn());

    expect(authService.changePassword).toHaveBeenCalledWith({
      userId: 42,
      currentPassword: 'old-real-password',
      newPassword: 'new-real-password',
    });
  });

  it('responds 200 with the service result on success', async () => {
    authService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });
    const req = {
      user: { userId: 1, role: 'PROVIDER' },
      body: { currentPassword: 'a', newPassword: 'new-password' },
    };
    const res = fakeRes();

    await authController.changePassword(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  });

  it('passes a service error to next() rather than throwing or leaking details in a response', async () => {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    authService.changePassword.mockRejectedValue(err);
    const req = {
      user: { userId: 1, role: 'ADMIN' },
      body: { currentPassword: 'wrong', newPassword: 'new-password' },
    };
    const res = fakeRes();
    const next = jest.fn();

    await authController.changePassword(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
