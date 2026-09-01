const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me — current logged-in user's profile
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/change-password — any authenticated role (CUSTOMER,
// PROVIDER, or ADMIN); the user acted on always comes from the JWT.
router.patch('/change-password', authenticate, authController.changePassword);

// POST /api/auth/forgot-password — public; always responds the same way
// regardless of whether the email is registered.
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password — public; the token itself (not a
// session) is what authorizes this request.
router.post('/reset-password', authController.resetPassword);

module.exports = router;
