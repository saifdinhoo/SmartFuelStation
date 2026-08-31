const { verifyToken, verifyMediaToken } = require('../utils/jwt');

// Verifies the JWT from the Authorization header and attaches its payload
// (userId, role) to req.user for later middleware/controllers to use.
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Restricts a route to specific roles. Must run after authenticate().
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

// Used on exactly one route: the live-camera stream proxy (Phase F).
//
// Two, and only two, ways in:
//   - a real Authorization header, verified exactly like authenticate()
//     above. This is what hls.js's own request loader sends (via its
//     xhrSetup hook) for every playlist/segment request, so a full HLS
//     session never needs the query-token path at all.
//   - a `?token=` query parameter, but ONLY a short-lived, single-purpose
//     "media token" minted by liveCamera.service.js for this exact
//     provider (see utils/jwt.js's signMediaToken/verifyMediaToken) — used
//     solely by a plain <video src> for a browser/format that cannot send
//     custom headers. The primary application JWT is deliberately never
//     accepted here: a copy of this URL leaking via browser history,
//     access logs, or a shared link only grants a few minutes of read
//     access to one provider's stream, never the holder's account.
//
// Every other route in the app keeps requiring a real Authorization
// header via authenticate() above.
function authenticateForMedia(req, res, next) {
  const header = req.headers.authorization;
  const bearer = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (bearer) {
    try {
      req.user = verifyToken(bearer);
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  }

  const mediaToken = req.query.token;
  if (!mediaToken) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    req.user = verifyMediaToken(mediaToken, req.params.id);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate, authorize, authenticateForMedia };
