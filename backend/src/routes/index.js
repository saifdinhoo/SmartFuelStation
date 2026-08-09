const express = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const providerRoutes = require('./provider.routes');
const translateRoutes = require('./translate.routes');

const router = express.Router();

// Every feature's routes get mounted here, under its own prefix.
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/providers', providerRoutes);
router.use('/translate', translateRoutes);

module.exports = router;
