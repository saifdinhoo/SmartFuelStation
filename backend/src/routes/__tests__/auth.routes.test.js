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
