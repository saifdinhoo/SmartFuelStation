jest.mock('../../services/vehicle.service');

const vehicleService = require('../../services/vehicle.service');
const vehicleController = require('../vehicle.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listMine', () => {
  it('sources ownerId only from the verified JWT', async () => {
    vehicleService.listMyVehicles.mockResolvedValue([{ id: 1 }]);
    const req = { user: { userId: 33, role: 'CUSTOMER' } };
    const res = fakeRes();

    await vehicleController.listMine(req, res, jest.fn());

    expect(vehicleService.listMyVehicles).toHaveBeenCalledWith(33);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });
});

describe('getOne', () => {
  it('sources ownerId only from the verified JWT, never the request body', async () => {
    vehicleService.getOwnedVehicle.mockResolvedValue({ id: 1 });
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { id: '1' } };
    const res = fakeRes();

    await vehicleController.getOne(req, res, jest.fn());

    expect(vehicleService.getOwnedVehicle).toHaveBeenCalledWith('1', 33);
  });
});

describe('create', () => {
  it('sources ownerId only from the verified JWT, never the request body', async () => {
    vehicleService.createVehicle.mockResolvedValue({ id: 1 });
    const req = {
      user: { userId: 33, role: 'CUSTOMER' },
      body: { ownerId: 999, make: 'Toyota', model: 'Corolla', year: 2022 },
    };
    const res = fakeRes();

    await vehicleController.create(req, res, jest.fn());

    expect(vehicleService.createVehicle).toHaveBeenCalledWith(33, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('update', () => {
  it('sources ownerId only from the verified JWT', async () => {
    vehicleService.updateVehicle.mockResolvedValue({ id: 1 });
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { id: '1' }, body: { color: 'Blue' } };
    const res = fakeRes();

    await vehicleController.update(req, res, jest.fn());

    expect(vehicleService.updateVehicle).toHaveBeenCalledWith('1', 33, { color: 'Blue' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('remove', () => {
  it('sources ownerId only from the verified JWT', async () => {
    vehicleService.deleteVehicle.mockResolvedValue(undefined);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { id: '1' } };
    const res = fakeRes();

    await vehicleController.remove(req, res, jest.fn());

    expect(vehicleService.deleteVehicle).toHaveBeenCalledWith('1', 33);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
