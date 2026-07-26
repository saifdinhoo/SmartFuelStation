const { verifyToken } = require('../utils/jwt');

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

module.exports = { authenticate, authorize };
