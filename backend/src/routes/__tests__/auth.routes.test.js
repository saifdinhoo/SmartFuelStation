const authRoutes = require('../auth.routes');

// No supertest/running server in this codebase's test convention — the
// route stack is inspected directly to confirm PATCH /change-password
// cannot be reached without going through the same `authenticate`
// middleware every other protected route uses. `authenticate` itself
// (reject with no/invalid JWT) is exercised by the existing auth
// middleware tests, unchanged here.
describe('PATCH /change-password route wiring', () => {
  it('requires authenticate before the changePassword controller runs', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/change-password' && l.route.methods.patch,
    );
    expect(layer).toBeDefined();

    const middlewareNames = layer.route.stack.map((l) => l.name);
    expect(middlewareNames).toContain('authenticate');
    expect(middlewareNames.indexOf('authenticate')).toBeLessThan(
      middlewareNames.indexOf('changePassword'),
    );
  });

  it('has no role restriction — reachable by any authenticated role', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/change-password' && l.route.methods.patch,
    );
    const middlewareNames = layer.route.stack.map((l) => l.name);
    expect(middlewareNames).not.toContain('authorize');
  });
});

describe('PATCH /me route wiring', () => {
  it('requires authenticate before the updateMe controller runs', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/me' && l.route.methods.patch,
    );
    expect(layer).toBeDefined();

    const middlewareNames = layer.route.stack.map((l) => l.name);
    expect(middlewareNames).toEqual(['authenticate', 'updateMe']);
  });

  it('has no role restriction — reachable by any authenticated role', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/me' && l.route.methods.patch,
    );
    const middlewareNames = layer.route.stack.map((l) => l.name);
    expect(middlewareNames).not.toContain('authorize');
  });

  it('GET /me also requires authenticate', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/me' && l.route.methods.get,
    );
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', 'me']);
  });
});

// forgot-password/reset-password are public by design — the token itself
// (not a session) is what authorizes reset-password, and forgot-password
// must be reachable by a logged-out visitor who forgot their password.
describe('POST /forgot-password and /reset-password route wiring', () => {
  it('POST /forgot-password has no authenticate middleware, but is rate-limited', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/forgot-password' && l.route.methods.post,
    );
    expect(layer).toBeDefined();
    const middlewareNames = layer.route.stack.map((l) => l.name);
    expect(middlewareNames).not.toContain('authenticate');
    // The rate limiter is an anonymous middleware function ahead of the
    // controller — its presence (not its name) is what matters here.
    expect(middlewareNames).toEqual(['<anonymous>', 'forgotPassword']);
  });

  it('POST /reset-password has no authenticate middleware', () => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === '/reset-password' && l.route.methods.post,
    );
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['resetPassword']);
  });
});
