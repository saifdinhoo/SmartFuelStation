const complaintRoutes = require('../complaint.routes');

function routeLayer(path, method) {
  return complaintRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
}

describe('complaint routes wiring', () => {
  it('POST / requires authenticate, then a role-check, then the controller — never the controller alone', () => {
    const layer = routeLayer('/', 'post');
    expect(layer).toBeDefined();
    const names = layer.route.stack.map((l) => l.name);
    // authorize(...) returns an anonymous closure (no .name), so its
    // presence is verified by stack length/position, not by name.
    expect(names).toEqual(['authenticate', '<anonymous>', 'create']);
  });

  it('GET /me requires authenticate, then a role-check, then the controller', () => {
    const layer = routeLayer('/me', 'get');
    expect(layer).toBeDefined();
    const names = layer.route.stack.map((l) => l.name);
    expect(names).toEqual(['authenticate', '<anonymous>', 'listMine']);
  });
});
