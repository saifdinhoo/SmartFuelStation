const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user can browse categories.
router.get('/', authenticate, categoryController.list);

// Only admins manage the category list.
router.post('/', authenticate, authorize('ADMIN'), categoryController.create);
router.put('/:id', authenticate, authorize('ADMIN'), categoryController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.remove);

module.exports = router;
