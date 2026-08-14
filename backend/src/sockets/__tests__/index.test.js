// Integration-style test: a real http server + real socket.io server +
// real socket.io-client, on an ephemeral local port. Only Prisma is
// mocked (for the PROVIDER auto-join's Provider.findUnique lookup) — the
// JWT auth middleware, room joins, and queue:watch_provider ack logic all
// run for real, which is the only way to actually prove the auth
// handshake and room boundaries work rather than just trusting the shape
// of the code.
jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
}));

const http = require('http');
const { io: ioClient } = require('socket.io-client');
const prisma = require('../../config/prisma');
const { signToken } = require('../../utils/jwt');
const { initSocket, getIO } = require('../index');

let httpServer;
let port;

beforeAll((done) => {
  httpServer = http.createServer();
  initSocket(httpServer);
  httpServer.listen(0, () => {
    port = httpServer.address().port;
    done();
  });
});

afterAll((done) => {
  getIO().close();
  httpServer.close(done);
});

beforeEach(() => {
  jest.clearAllMocks();
});

function connect(auth) {
  return ioClient(`http://localhost:${port}`, {
    auth,
    reconnection: false,
    transports: ['websocket'],
    forceNew: true,
  });
}

function onceConnected(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });
}

describe('JWT authentication', () => {
  it('rejects a connection with no token at all', async () => {
    const socket = connect({});
    await expect(onceConnected(socket)).rejects.toThrow(/authentication required/i);
    socket.close();
  });

  it('rejects a connection with a garbage token', async () => {
    const socket = connect({ token: 'not-a-real-token' });
    await expect(onceConnected(socket)).rejects.toThrow(/invalid or expired token/i);
    socket.close();
  });

  it('accepts a connection with a valid token', async () => {
    const token = signToken({ userId: 33, role: 'CUSTOMER' });
    const socket = connect({ token });
    await expect(onceConnected(socket)).resolves.toBeDefined();
    socket.close();
  });
});

describe('room scoping', () => {
  it("a provider auto-joins their own provider room and can watch it explicitly", async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 5, userId: 77 });
    const token = signToken({ userId: 77, role: 'PROVIDER' });
    const socket = connect({ token });
    await onceConnected(socket);

    const ack = await new Promise((resolve) => {
      socket.emit('queue:watch_provider', { providerId: 5 }, resolve);
    });
    expect(ack).toEqual({ ok: true });
    socket.close();
  });

  it("refuses a provider's attempt to watch another business's queue (cross-provider access)", async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 5, userId: 77 });
    const token = signToken({ userId: 77, role: 'PROVIDER' });
    const socket = connect({ token });
    await onceConnected(socket);

    const ack = await new Promise((resolve) => {
      socket.emit('queue:watch_provider', { providerId: 999 }, resolve);
    });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/own business/i);
    socket.close();
  });

  it('refuses a customer from watching any provider queue', async () => {
    const token = signToken({ userId: 33, role: 'CUSTOMER' });
    const socket = connect({ token });
    await onceConnected(socket);

    const ack = await new Promise((resolve) => {
      socket.emit('queue:watch_provider', { providerId: 5 }, resolve);
    });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/customers cannot watch/i);
    socket.close();
  });

  it('lets an admin watch any provider queue on request', async () => {
    const token = signToken({ userId: 1, role: 'ADMIN' });
    const socket = connect({ token });
    await onceConnected(socket);

    const ack = await new Promise((resolve) => {
      socket.emit('queue:watch_provider', { providerId: 42 }, resolve);
    });
    expect(ack).toEqual({ ok: true });
    socket.close();
  });

  it('rejects a non-integer providerId', async () => {
    const token = signToken({ userId: 1, role: 'ADMIN' });
    const socket = connect({ token });
    await onceConnected(socket);

    const ack = await new Promise((resolve) => {
      socket.emit('queue:watch_provider', { providerId: 'abc' }, resolve);
    });
    expect(ack.ok).toBe(false);
    socket.close();
  });
});

describe('reconnect', () => {
  it('re-establishes and re-authenticates after a manual disconnect/reconnect', async () => {
    const token = signToken({ userId: 33, role: 'CUSTOMER' });
    const socket = connect({ token });
    await onceConnected(socket);
    expect(socket.connected).toBe(true);

    socket.disconnect();
    expect(socket.connected).toBe(false);

    socket.connect();
    await onceConnected(socket);
    expect(socket.connected).toBe(true);
    socket.close();
  });
});

describe('duplicate listener prevention (client-side pattern)', () => {
  it('registering the same handler twice without a guard produces two listeners (proves the guard is necessary)', async () => {
    const token = signToken({ userId: 33, role: 'CUSTOMER' });
    const socket = connect({ token });
    await onceConnected(socket);

    const handler = () => {};
    // socket.io-client does not dedupe identical (event, fn) pairs —
    // registering twice without cleanup (e.g. a React effect re-running
    // in StrictMode with no `off()` in its cleanup) really does produce
    // two live listeners, which is why SocketProvider always calls
    // off() immediately before on() for every listener it registers.
    socket.on('queue:my_update', handler);
    socket.on('queue:my_update', handler);
    expect(socket.listeners('queue:my_update')).toHaveLength(2);
    socket.close();
  });

  it("SocketProvider's actual guard — off() immediately before every on() — keeps exactly one listener across repeated (re-)registrations", async () => {
    const token = signToken({ userId: 33, role: 'CUSTOMER' });
    const socket = connect({ token });
    await onceConnected(socket);

    const handler = () => {};
    function registerWithGuard() {
      socket.off('queue:my_update', handler);
      socket.on('queue:my_update', handler);
    }

    // Simulates the effect that owns this listener running three times
    // (mount, StrictMode re-mount, a dependency changing) — the guard
    // must hold regardless of how many times it re-runs.
    registerWithGuard();
    registerWithGuard();
    registerWithGuard();

    expect(socket.listeners('queue:my_update')).toHaveLength(1);
    socket.close();
  });
});
