jest.mock('../../services/admin.service');
jest.mock('../../services/fuelInventory.service');
jest.mock('../../sockets/queueEvents');

const fuelService = require('../../services/fuelInventory.service');
const socketEvents = require('../../sockets/queueEvents');
const adminController = require('../admin.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

const ADMIN = { userId: 1, role: 'ADMIN' };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listProviderFuel', () => {
  it('forwards providerId to the service and returns its result', async () => {
    const fuel = [{ fuelType: 'GASOLINE_95', currentLiters: 7450 }];
    fuelService.listAdminFuelForProvider.mockResolvedValue(fuel);
    const res = fakeRes();

    await adminController.listProviderFuel({ params: { providerId: '2' } }, res, jest.fn());

    expect(fuelService.listAdminFuelForProvider).toHaveBeenCalledWith('2');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fuel });
  });
});

describe('updateProviderFuel', () => {
  it('forwards providerId, fuelType, body and the acting admin\'s id', async () => {
    fuelService.adminUpsertFuel.mockResolvedValue({ fuelType: 'DIESEL', currentLiters: 10000 });
    const req = {
      user: ADMIN,
      params: { providerId: '2', fuelType: 'DIESEL' },
      body: { capacityLiters: 30000, currentLiters: 10000 },
    };

    await adminController.updateProviderFuel(req, fakeRes(), jest.fn());

    expect(fuelService.adminUpsertFuel).toHaveBeenCalledWith(
      '2',
      'DIESEL',
      { capacityLiters: 30000, currentLiters: 10000 },
      1,
    );
  });

  it('broadcasts provider:fuel_updated with only the providerId after a successful write', async () => {
    fuelService.adminUpsertFuel.mockResolvedValue({ fuelType: 'DIESEL' });
    const req = {
      user: ADMIN,
      params: { providerId: '2', fuelType: 'DIESEL' },
      body: { capacityLiters: 30000, currentLiters: 10000 },
    };

    await adminController.updateProviderFuel(req, fakeRes(), jest.fn());

    expect(socketEvents.notifyProviderFuelUpdated).toHaveBeenCalledWith({ providerId: 2 });
  });

  it('a broadcast failure never turns an already-sent response into an error', async () => {
    fuelService.adminUpsertFuel.mockResolvedValue({ fuelType: 'DIESEL' });
    socketEvents.notifyProviderFuelUpdated.mockImplementation(() => {
      throw new Error('socket down');
    });
    const req = {
      user: ADMIN,
      params: { providerId: '2', fuelType: 'DIESEL' },
      body: { capacityLiters: 30000, currentLiters: 10000 },
    };
    const res = fakeRes();
    const next = jest.fn();

    await adminController.updateProviderFuel(req, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('passes a validation error from the service to next() rather than throwing', async () => {
    const err = new Error('currentLiters must not exceed capacityLiters');
    err.statusCode = 400;
    fuelService.adminUpsertFuel.mockRejectedValue(err);
    const next = jest.fn();

    await adminController.updateProviderFuel(
      {
        user: ADMIN,
        params: { providerId: '2', fuelType: 'DIESEL' },
        body: { capacityLiters: 100, currentLiters: 500 },
      },
      fakeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(socketEvents.notifyProviderFuelUpdated).not.toHaveBeenCalled();
  });
});

describe('listProviderFuelHistory', () => {
  it('forwards providerId, fuelType and range to the service', async () => {
    fuelService.getAdminHistory.mockResolvedValue([]);
    const res = fakeRes();

    await adminController.listProviderFuelHistory(
      { params: { providerId: '2' }, query: { fuelType: 'DIESEL', range: '30d' } },
      res,
      jest.fn(),
    );

    expect(fuelService.getAdminHistory).toHaveBeenCalledWith('2', {
      fuelType: 'DIESEL',
      range: '30d',
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
