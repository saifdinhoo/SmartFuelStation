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

module.exports = router;
