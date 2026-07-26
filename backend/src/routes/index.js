const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

// Every feature's routes get mounted here, under its own prefix.
router.use('/auth', authRoutes);

module.exports = router;
