const express = require('express');
const favoriteController = require('../controllers/favorite.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers have favorites; userId always comes from the verified
// JWT (see favorite.controller.js), never the request body/params.
router.get('/me', authenticate, authorize('CUSTOMER'), favoriteController.listMine);
router.post('/', authenticate, authorize('CUSTOMER'), favoriteController.add);
router.delete('/:providerId', authenticate, authorize('CUSTOMER'), favoriteController.remove);

module.exports = router;
