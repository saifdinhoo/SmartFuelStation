const rateLimit = require('express-rate-limit');

// Scoped to POST /auth/forgot-password only — the one endpoint that can
// trigger a real email send per request, so it's the one worth capping.
// Limited by IP, not by the submitted email: limiting by email would let a
// caller learn "this email has a different remaining-attempts count than
// that one", which is exactly the enumeration signal the endpoint's
// identical response body is designed to avoid. Every other route in this
// app is unauthenticated-write-free or already behind authenticate(), so
// this is deliberately not a global limiter.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

module.exports = { forgotPasswordLimiter };
