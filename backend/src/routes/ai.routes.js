const express = require('express');
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Any authenticated role may talk to the assistant. React/Flutter never
// call Gemini directly — this is the only door to it, and the API key
// never leaves the backend (see services/ai/providers/gemini.provider.js).
router.post('/chat', authenticate, aiController.chat);

module.exports = router;
