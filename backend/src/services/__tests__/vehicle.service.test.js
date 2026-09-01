jest.mock('../../config/prisma', () => ({
  vehicle: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const prisma = require('../../config/prisma');
const vehicleService = require('../vehicle.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listMyVehicles', () => {
  it('only ever queries by the given ownerId — never another customer\'s vehicles', async () => {
    prisma.vehicle.findMany.mockResolvedValue([]);

    await vehicleService.listMyVehicles(33);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 33 } }),
    );
  });
});

describe('getOwnedVehicle', () => {
  it('404s when the vehicle does not exist', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(vehicleService.getOwnedVehicle(1, 33)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403s when the vehicle belongs to someone else', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 1, ownerId: 999 });

    await expect(vehicleService.getOwnedVehicle(1, 33)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a non-integer id', async () => {
    await expect(vehicleService.getOwnedVehicle('nope', 33)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
  });
});

describe('createVehicle', () => {
  it('creates a vehicle scoped to the real caller — never a client-supplied ownerId', async () => {
    prisma.vehicle.create.mockResolvedValue({ id: 1, ownerId: 33 });

    await vehicleService.createVehicle(33, { make: 'Toyota', model: 'Corolla', year: 2022 });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        ownerId: 33,
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: null,
        color: null,
        fuelType: null,
      },
    });
  });

  it('trims text fields and normalizes blank optional fields to null', async () => {
    prisma.vehicle.create.mockResolvedValue({ id: 1, ownerId: 33 });

    await vehicleService.createVehicle(33, {
      make: '  Kia  ',
      model: '  Sportage  ',
      year: 2020,
      plate: '   ',
      color: '  Red  ',
      fuelType: 'GASOLINE_95',
    });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        ownerId: 33,
        make: 'Kia',
        model: 'Sportage',
        year: 2020,
        plate: null,
        color: 'Red',
        fuelType: 'GASOLINE_95',
      },
    });
  });

  it('rejects a blank make', async () => {
    await expect(
      vehicleService.createVehicle(33, { make: '  ', model: 'Corolla', year: 2022 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  it('rejects a year outside the valid range', async () => {
    await expect(
      vehicleService.createVehicle(33, { make: 'Toyota', model: 'Corolla', year: 1800 }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid fuelType', async () => {
    await expect(
      vehicleService.createVehicle(33, {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        fuelType: 'ELECTRIC',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });
});

describe('updateVehicle', () => {
  it('403s an update attempt on someone else\'s vehicle before writing anything', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 1, ownerId: 999 });

    await expect(
      vehicleService.updateVehicle(1, 33, { color: 'Blue' }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it('only changes the fields provided, leaving the rest untouched', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 1, ownerId: 33 });
    prisma.vehicle.update.mockResolvedValue({ id: 1, ownerId: 33, color: 'Blue' });

    await vehicleService.updateVehicle(1, 33, { color: 'Blue' });

    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        make: undefined,
        model: undefined,
        year: undefined,
        plate: undefined,
        color: 'Blue',
        fuelType: undefined,
      },
    });
  });
});

describe('deleteVehicle', () => {
  it('403s a delete attempt on someone else\'s vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 1, ownerId: 999 });

    await expect(vehicleService.deleteVehicle(1, 33)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.vehicle.delete).not.toHaveBeenCalled();
  });

  it('deletes the owned vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 1, ownerId: 33 });
    prisma.vehicle.delete.mockResolvedValue({ id: 1 });

    await vehicleService.deleteVehicle(1, 33);

    expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
