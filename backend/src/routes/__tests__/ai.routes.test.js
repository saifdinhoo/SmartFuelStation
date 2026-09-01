const aiRoutes = require('../ai.routes');

// No supertest/running server in this codebase's test convention — the
// route stack is inspected directly to confirm POST /chat cannot be reached
// without going through the same `authenticate` middleware every other
// protected route uses. `authenticate` itself (reject with no/invalid JWT)
// is exercised by the existing auth middleware, unchanged here.
describe('POST /chat route wiring', () => {
  it('requires authenticate before the chat controller runs', () => {
    const chatLayer = aiRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/chat' && layer.route.methods.post,
    );
    expect(chatLayer).toBeDefined();

    const middlewareNames = chatLayer.route.stack.map((layer) => layer.name);
    expect(middlewareNames).toContain('authenticate');
    // authenticate must run before the controller handler.
    expect(middlewareNames.indexOf('authenticate')).toBeLessThan(middlewareNames.indexOf('chat'));
  });
});
