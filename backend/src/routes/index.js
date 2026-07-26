const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');

const router = express.Router();

// Every feature module's routes get mounted here, under its own prefix.
router.use('/auth', authRoutes);

module.exports = router;
