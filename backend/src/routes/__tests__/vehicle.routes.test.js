const vehicleRoutes = require('../vehicle.routes');

function routeLayer(path, method) {
  return vehicleRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
}

describe('vehicle routes wiring', () => {
  it('GET / requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/', 'get');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'listMine']);
  });

  it('POST / requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/', 'post');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'create']);
  });

  it('GET /:id requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/:id', 'get');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'getOne']);
  });

  it('PATCH /:id requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/:id', 'patch');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'update']);
  });

  it('DELETE /:id requires authenticate + a role-check before the controller runs', () => {
    const layer = routeLayer('/:id', 'delete');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', '<anonymous>', 'remove']);
  });
});
