const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

const MEDIA_TOKEN_PURPOSE = 'live-camera-media';
const MEDIA_TOKEN_TTL = '5m';

// A deliberately narrow, short-lived token for exactly one purpose: letting
// a native <video> element (which cannot send a custom Authorization
// header) load a specific provider's live-camera stream URL. It is NEVER
// the primary application JWT — a leaked copy (browser history, access
// logs, a copied URL) only grants read access to one provider's video for
// a few minutes, not the holder's account.
function signMediaToken({ providerId }) {
  return jwt.sign({ purpose: MEDIA_TOKEN_PURPOSE, providerId }, jwtSecret, {
    expiresIn: MEDIA_TOKEN_TTL,
  });
}

// Verifies both the signature/expiry AND that the token was actually
// scoped to this exact provider and purpose — a media token minted for
// provider 2 must never be accepted on provider 3's stream route.
function verifyMediaToken(token, providerId) {
  const payload = jwt.verify(token, jwtSecret);
  if (payload.purpose !== MEDIA_TOKEN_PURPOSE || String(payload.providerId) !== String(providerId)) {
    throw new Error('Invalid media token');
  }
  return payload;
}

module.exports = { signToken, verifyToken, signMediaToken, verifyMediaToken };
