const notificationRoutes = require('../notification.routes');

function routeLayer(path, method) {
  return notificationRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
}

describe('notification preferences routes wiring', () => {
  it('GET /preferences requires authenticate before the controller runs — own preferences only, no id to spoof', () => {
    const layer = routeLayer('/preferences', 'get');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', 'getPreferences']);
  });

  it('PATCH /preferences requires authenticate before the controller runs', () => {
    const layer = routeLayer('/preferences', 'patch');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['authenticate', 'updatePreferences']);
  });
});
