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

describe('forgotPassword', () => {
  it('always responds the same generic message, regardless of what the service did internally', async () => {
    authService.requestPasswordReset.mockResolvedValue(undefined);
    const req = { body: { email: 'user@example.com' } };
    const res = fakeRes();

    await authController.forgotPassword(req, res, jest.fn());

    expect(authService.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { message: expect.any(String) },
    });
  });

  it('gives the identical response for an unknown email too — same call, same shape', async () => {
    authService.requestPasswordReset.mockResolvedValue(undefined);
    const req = { body: { email: 'nobody@example.com' } };
    const res = fakeRes();

    await authController.forgotPassword(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { message: expect.any(String) },
    });
  });
});

describe('resetPassword (public token flow)', () => {
  it('passes the token and newPassword from the body straight through — there is no req.user to source from', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });
    const req = { body: { token: 'raw-token-value', newPassword: 'new-real-password' } };
    const res = fakeRes();

    await authController.resetPassword(req, res, jest.fn());

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: 'raw-token-value',
      newPassword: 'new-real-password',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes an invalid/expired-token error to next() rather than leaking which case it was', async () => {
    const err = new Error('This reset link is invalid or has expired');
    err.statusCode = 400;
    authService.resetPassword.mockRejectedValue(err);
    const req = { body: { token: 'bad-token', newPassword: 'new-real-password' } };
    const res = fakeRes();
    const next = jest.fn();

    await authController.resetPassword(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
