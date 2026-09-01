const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers manage vehicles; ownerId always comes from the verified
// JWT (see vehicle.controller.js), never the request body/params.
router.get('/', authenticate, authorize('CUSTOMER'), vehicleController.listMine);
router.post('/', authenticate, authorize('CUSTOMER'), vehicleController.create);
router.get('/:id', authenticate, authorize('CUSTOMER'), vehicleController.getOne);
router.patch('/:id', authenticate, authorize('CUSTOMER'), vehicleController.update);
router.delete('/:id', authenticate, authorize('CUSTOMER'), vehicleController.remove);

module.exports = router;
