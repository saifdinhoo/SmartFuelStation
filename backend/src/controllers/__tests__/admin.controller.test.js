jest.mock('../../services/admin.service');
jest.mock('../../services/fuelInventory.service');
jest.mock('../../services/finance.service');
jest.mock('../../sockets/queueEvents');

const fuelService = require('../../services/fuelInventory.service');
const financeService = require('../../services/finance.service');
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

describe('financeSummary', () => {
  it('forwards the range query param and returns the service result', async () => {
    const summary = { grossServiceValue: 100, transactionCount: 1 };
    financeService.getAdminSummary.mockResolvedValue(summary);
    const res = fakeRes();

    await adminController.financeSummary({ query: { range: '7d' } }, res, jest.fn());

    expect(financeService.getAdminSummary).toHaveBeenCalledWith('7d');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: summary });
  });
});

describe('financeTransactions', () => {
  it('forwards providerId and status filters to the service', async () => {
    financeService.listAdminTransactions.mockResolvedValue([]);
    const res = fakeRes();

    await adminController.financeTransactions(
      { query: { providerId: '2', status: 'PENDING' } },
      res,
      jest.fn(),
    );

    expect(financeService.listAdminTransactions).toHaveBeenCalledWith({
      providerId: '2',
      status: 'PENDING',
    });
  });
});

describe('financeProvider', () => {
  it('forwards providerId and range to the service', async () => {
    const data = { providerId: 2, transactions: [] };
    financeService.getAdminProviderFinance.mockResolvedValue(data);
    const res = fakeRes();

    await adminController.financeProvider(
      { params: { providerId: '2' }, query: { range: '30d' } },
      res,
      jest.fn(),
    );

    expect(financeService.getAdminProviderFinance).toHaveBeenCalledWith('2', '30d');
    expect(res.json).toHaveBeenCalledWith({ success: true, data });
  });
});

describe('settleFinanceTransaction', () => {
  it('forwards the transaction id and acting admin id, then broadcasts finance:updated', async () => {
    financeService.setSettlementStatus.mockResolvedValue({ id: 9, providerId: 2, settlementStatus: 'SETTLED' });
    const req = { params: { id: '9' }, user: ADMIN };

    await adminController.settleFinanceTransaction(req, fakeRes(), jest.fn());

    expect(financeService.setSettlementStatus).toHaveBeenCalledWith('9', 1);
    expect(socketEvents.notifyFinanceUpdated).toHaveBeenCalledWith({ providerId: 2 });
  });

  it('a broadcast failure never turns an already-sent response into an error', async () => {
    financeService.setSettlementStatus.mockResolvedValue({ id: 9, providerId: 2 });
    socketEvents.notifyFinanceUpdated.mockImplementation(() => {
      throw new Error('socket down');
    });
    const res = fakeRes();
    const next = jest.fn();

    await adminController.settleFinanceTransaction({ params: { id: '9' }, user: ADMIN }, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('passes a service error (e.g. already settled) to next() rather than throwing', async () => {
    const err = new Error('This transaction has already been settled');
    err.statusCode = 400;
    financeService.setSettlementStatus.mockRejectedValue(err);
    const next = jest.fn();

    await adminController.settleFinanceTransaction({ params: { id: '9' }, user: ADMIN }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
    expect(socketEvents.notifyFinanceUpdated).not.toHaveBeenCalled();
  });
});

describe('getProviderCommission', () => {
  it('forwards providerId and returns the service result', async () => {
    const commission = { providerId: 2, commissionRate: 10 };
    financeService.getProviderCommission.mockResolvedValue(commission);
    const res = fakeRes();

    await adminController.getProviderCommission({ params: { providerId: '2' } }, res, jest.fn());

    expect(financeService.getProviderCommission).toHaveBeenCalledWith('2');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: commission });
  });
});

describe('setProviderCommission', () => {
  it('forwards providerId, the new rate and the acting admin id, then broadcasts finance:updated', async () => {
    financeService.setProviderCommission.mockResolvedValue({ providerId: 2, commissionRate: 15 });
    const req = { params: { providerId: '2' }, body: { commissionRate: 15 }, user: ADMIN };

    await adminController.setProviderCommission(req, fakeRes(), jest.fn());

    expect(financeService.setProviderCommission).toHaveBeenCalledWith('2', 15, 1);
    expect(socketEvents.notifyFinanceUpdated).toHaveBeenCalledWith({ providerId: 2 });
  });

  it('passes a validation error (out-of-range rate) to next() rather than throwing', async () => {
    const err = new Error('commissionRate must be between 0 and 100');
    err.statusCode = 400;
    financeService.setProviderCommission.mockRejectedValue(err);
    const next = jest.fn();

    await adminController.setProviderCommission(
      { params: { providerId: '2' }, body: { commissionRate: 150 }, user: ADMIN },
      fakeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(socketEvents.notifyFinanceUpdated).not.toHaveBeenCalled();
  });
});
