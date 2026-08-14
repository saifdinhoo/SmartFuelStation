const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

// Module-level singleton: one Socket.IO server per process, same pattern
// as config/prisma.js's shared client. Set by initSocket(), read by
// sockets/queueEvents.js via getIO() — kept as a getter (not a direct
// export of the value) so anything requiring this module before
// initSocket() runs still gets the live reference once it's set, and so
// code paths that run with no HTTP server attached (e.g. Jest) can check
// `getIO() === null` and just skip emitting instead of crashing.
let io = null;

function getIO() {
  return io;
}

// Every authenticated socket joins its own private room — events meant
// for exactly one person (their own queue entry, their own booking) are
// addressed here and nowhere broader.
function roomForUser(userId) {
  return `user:${userId}`;
}

// A provider's queue-management stream. Only that provider's own account
// (resolved server-side from the JWT's userId via the Provider table —
// never trusted from client input) or an admin get to join it.
function roomForProvider(providerId) {
  return `provider:${providerId}`;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    // Matches the Express app's own `cors()` (dev-permissive, reflects
    // the request origin) — same trust boundary as the REST API, not a
    // wider one.
    cors: { origin: true, credentials: true },
  });

  // JWT auth middleware: runs once per connection attempt, before
  // 'connection' fires. A socket that fails this never gets a socket id
  // handed to the client and never enters any room.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      socket.user = { userId: payload.userId, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, role } = socket.user;
    socket.join(roomForUser(userId));

    if (role === 'PROVIDER') {
      try {
        const provider = await prisma.provider.findUnique({ where: { userId } });
        if (provider) {
          socket.data.ownProviderId = provider.id;
          socket.join(roomForProvider(provider.id));
        }
      } catch {
        // Provider lookup failing shouldn't drop the connection — the
        // socket just won't have a provider room to receive queue
        // broadcasts on, same as a provider account with no linked
        // business today.
      }
    }

    // Explicit, server-validated join for watching a specific provider's
    // queue stream. A provider is already auto-joined to their own room
    // above, so this is mainly how ADMIN opts into watching one; for a
    // PROVIDER it's a no-op re-join unless they ask for someone else's,
    // which is refused — this is the surface a cross-provider access
    // attempt actually hits.
    socket.on('queue:watch_provider', (payload, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const providerId = Number(payload?.providerId);

      if (!Number.isInteger(providerId)) {
        return ack({ ok: false, error: 'providerId must be an integer' });
      }
      if (role === 'CUSTOMER') {
        return ack({ ok: false, error: 'Customers cannot watch a provider queue' });
      }
      if (role === 'PROVIDER' && socket.data.ownProviderId !== providerId) {
        return ack({ ok: false, error: "You can only watch your own business's queue" });
      }

      socket.join(roomForProvider(providerId));
      ack({ ok: true });
    });
  });

  return io;
}

module.exports = { initSocket, getIO, roomForUser, roomForProvider };
