jest.mock('../../services/favorite.service');

const favoriteService = require('../../services/favorite.service');
const favoriteController = require('../favorite.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('add', () => {
  it('sources userId only from the verified JWT, never the request body', async () => {
    favoriteService.addFavorite.mockResolvedValue({ id: 1 });
    const req = { user: { userId: 33, role: 'CUSTOMER' }, body: { userId: 999, providerId: 2 } };
    const res = fakeRes();

    await favoriteController.add(req, res, jest.fn());

    expect(favoriteService.addFavorite).toHaveBeenCalledWith(33, 2);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('remove', () => {
  it('sources userId only from the verified JWT', async () => {
    favoriteService.removeFavorite.mockResolvedValue(undefined);
    const req = { user: { userId: 33, role: 'CUSTOMER' }, params: { providerId: '2' } };
    const res = fakeRes();

    await favoriteController.remove(req, res, jest.fn());

    expect(favoriteService.removeFavorite).toHaveBeenCalledWith(33, '2');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('listMine', () => {
  it('sources userId only from the verified JWT', async () => {
    favoriteService.listMyFavorites.mockResolvedValue([{ id: 1 }]);
    const req = { user: { userId: 33, role: 'CUSTOMER' } };
    const res = fakeRes();

    await favoriteController.listMine(req, res, jest.fn());

    expect(favoriteService.listMyFavorites).toHaveBeenCalledWith(33);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });
});
