const favoriteRoutes = require('../favorite.routes');

function routeLayer(path, method) {
  return favoriteRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
}

describe('favorite routes wiring', () => {
  it('GET /me requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/me', 'get');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'listMine']);
  });

  it('POST / requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/', 'post');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'add']);
  });

  it('DELETE /:providerId requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/:providerId', 'delete');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'remove']);
  });
});
