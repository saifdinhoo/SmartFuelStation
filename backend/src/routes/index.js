const express = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const providerRoutes = require('./provider.routes');
const translateRoutes = require('./translate.routes');
const reviewRoutes = require('./review.routes');
const bookingRoutes = require('./booking.routes');
const queueRoutes = require('./queue.routes');
const adminRoutes = require('./admin.routes');
const notificationRoutes = require('./notification.routes');

const router = express.Router();

// Every feature's routes get mounted here, under its own prefix.
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/providers', providerRoutes);
router.use('/translate', translateRoutes);
router.use('/reviews', reviewRoutes);
router.use('/bookings', bookingRoutes);
router.use('/queue', queueRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
