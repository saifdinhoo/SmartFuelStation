const express = require('express');
const translateController = require('../controllers/translate.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user can translate text they can see (reviews, complaints, descriptions).
router.post('/', authenticate, translateController.translate);

module.exports = router;
