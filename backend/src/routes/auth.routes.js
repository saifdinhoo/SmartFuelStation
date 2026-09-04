const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { forgotPasswordLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me — current logged-in user's profile
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/me — edit the current user's own name/phone. Any
// authenticated role (CUSTOMER, PROVIDER, or ADMIN); email, role, and
// password are never editable through this route.
router.patch('/me', authenticate, authController.updateMe);

// PATCH /api/auth/change-password — any authenticated role (CUSTOMER,
// PROVIDER, or ADMIN); the user acted on always comes from the JWT.
router.patch('/change-password', authenticate, authController.changePassword);

// POST /api/auth/forgot-password — public; always responds the same way
// regardless of whether the email is registered. Rate-limited by IP (not
// by email — see rateLimit.js) since this is the one endpoint that can
// trigger a real email send per request.
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

// POST /api/auth/reset-password — public; the token itself (not a
// session) is what authorizes this request.
router.post('/reset-password', authController.resetPassword);

module.exports = router;
