const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers file complaints; admin triage stays under /admin/complaints
// (admin.routes.js) — unchanged by this file. customerId always comes from
// the verified JWT (see complaint.controller.js), never the request body.
router.post('/', authenticate, authorize('CUSTOMER'), complaintController.create);
router.get('/me', authenticate, authorize('CUSTOMER'), complaintController.listMine);

module.exports = router;
