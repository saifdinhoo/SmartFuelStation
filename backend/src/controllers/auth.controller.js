const authService = require('../services/auth.service');

// Handles HTTP request/response only; all logic is delegated to auth.service.js.

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
}
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    // userId always comes from the verified JWT, never req.body — a client
    // can never target another account's password by shaping the body.
    const result = await authService.changePassword({
      userId: req.user.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Always the same response whether or not the email belongs to a real
// account — authService.requestPasswordReset() itself is a silent no-op
// for an unknown email, so there is nothing here to branch on.
async function forgotPassword(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.status(200).json({
      success: true,
      data: { message: 'If an account exists for that email, a reset link has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword({
      token: req.body.token,
      newPassword: req.body.newPassword,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
