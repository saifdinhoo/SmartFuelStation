const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
