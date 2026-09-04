const adminRoutes = require('../admin.routes');

function routeLayer(path, method) {
  return adminRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
}

describe('admin routes wiring', () => {
  it('applies authenticate + authorize("ADMIN") to the whole router — every route below inherits it', () => {
    const useLayers = adminRoutes.stack.filter((l) => !l.route);
    // Express's own Layer#name (not the raw Function#name) — '<anonymous>'
    // for authorize('ADMIN')'s returned closure, which has no name of its
    // own, but is still real middleware.
    const names = useLayers.map((l) => l.name);
    expect(names).toContain('authenticate');
    expect(names).toContain('<anonymous>');
  });

  it('GET /booking-policy is wired to getBookingPolicy', () => {
    const layer = routeLayer('/booking-policy', 'get');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['getBookingPolicy']);
  });

  it('PATCH /booking-policy is wired to updateBookingPolicy', () => {
    const layer = routeLayer('/booking-policy', 'patch');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['updateBookingPolicy']);
  });

  it('GET /audit-log is wired to listAuditLog, with no matching update/delete route anywhere on this router', () => {
    const getLayer = routeLayer('/audit-log', 'get');
    expect(getLayer).toBeDefined();
    expect(getLayer.route.stack.map((l) => l.name)).toEqual(['listAuditLog']);

    expect(routeLayer('/audit-log', 'patch')).toBeUndefined();
    expect(routeLayer('/audit-log', 'put')).toBeUndefined();
    expect(routeLayer('/audit-log', 'delete')).toBeUndefined();
  });

  it('POST /backups/export is wired to exportBackup', () => {
    const layer = routeLayer('/backups/export', 'post');
    expect(layer).toBeDefined();
    expect(layer.route.stack.map((l) => l.name)).toEqual(['exportBackup']);
  });
});
