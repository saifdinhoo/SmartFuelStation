const aiService = require('../services/ai.service');

async function chat(req, res, next) {
  try {
    const result = await aiService.chat({
      message: req.body.message,
      mode: req.body.mode,
      conversation: req.body.conversation,
      locale: req.body.locale,
      // Server-trusted, from the verified JWT — never accepted from the
      // request body, so a client can never claim a different role.
      role: req.user.role,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
