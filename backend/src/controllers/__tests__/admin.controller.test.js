jest.mock('../../services/admin.service');
jest.mock('../../services/fuelInventory.service');
jest.mock('../../services/finance.service');
jest.mock('../../services/bookingPolicy.service');
jest.mock('../../services/auditLog.service');
jest.mock('../../services/backup.service');
jest.mock('../../sockets/queueEvents');

const fuelService = require('../../services/fuelInventory.service');
const financeService = require('../../services/finance.service');
const bookingPolicyService = require('../../services/bookingPolicy.service');
const auditLogService = require('../../services/auditLog.service');
const backupService = require('../../services/backup.service');
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

  it('records a COMMISSION_RATE_UPDATED audit entry after a successful write', async () => {
    financeService.setProviderCommission.mockResolvedValue({ providerId: 2, commissionRate: 15 });

    await adminController.setProviderCommission(
      { params: { providerId: '2' }, body: { commissionRate: 15 }, user: ADMIN },
      fakeRes(),
      jest.fn(),
    );

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'COMMISSION_RATE_UPDATED', entityType: 'Provider', entityId: 2 }),
    );
  });
});

describe('updateProviderFuel — audit', () => {
  it('records a FUEL_INVENTORY_UPDATED audit entry after a successful write', async () => {
    fuelService.adminUpsertFuel.mockResolvedValue({ fuelType: 'DIESEL' });

    await adminController.updateProviderFuel(
      { user: ADMIN, params: { providerId: '2', fuelType: 'DIESEL' }, body: {} },
      fakeRes(),
      jest.fn(),
    );

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'FUEL_INVENTORY_UPDATED', entityType: 'Provider', entityId: 2 }),
    );
  });
});

describe('settleFinanceTransaction — audit', () => {
  it('records a FINANCE_SETTLED audit entry after a successful settlement', async () => {
    financeService.setSettlementStatus.mockResolvedValue({ id: 9, providerId: 2 });

    await adminController.settleFinanceTransaction({ params: { id: '9' }, user: ADMIN }, fakeRes(), jest.fn());

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'FINANCE_SETTLED', entityType: 'FinancialTransaction', entityId: 9 }),
    );
  });
});

describe('getBookingPolicy', () => {
  it('returns the service result', async () => {
    const policy = { id: 1, minAdvanceMinutes: 30, maxAdvanceDays: 30, allowSameDayBooking: true };
    bookingPolicyService.getPolicy.mockResolvedValue(policy);
    const res = fakeRes();

    await adminController.getBookingPolicy({}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, data: policy });
  });
});

describe('updateBookingPolicy', () => {
  it('forwards the body and the acting admin id, then records BOOKING_POLICY_UPDATED', async () => {
    const policy = { id: 1, minAdvanceMinutes: 60, maxAdvanceDays: 14, allowSameDayBooking: false };
    bookingPolicyService.updatePolicy.mockResolvedValue(policy);
    const req = {
      user: ADMIN,
      body: { minAdvanceMinutes: 60, maxAdvanceDays: 14, allowSameDayBooking: false },
    };

    await adminController.updateBookingPolicy(req, fakeRes(), jest.fn());

    expect(bookingPolicyService.updatePolicy).toHaveBeenCalledWith(
      { minAdvanceMinutes: 60, maxAdvanceDays: 14, allowSameDayBooking: false },
      1,
    );
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'BOOKING_POLICY_UPDATED', entityType: 'BookingPolicy' }),
    );
  });

  it('passes a validation error to next() rather than throwing', async () => {
    const err = new Error('maxAdvanceDays must be an integer between 1 and 365');
    err.statusCode = 400;
    bookingPolicyService.updatePolicy.mockRejectedValue(err);
    const next = jest.fn();

    await adminController.updateBookingPolicy(
      { user: ADMIN, body: { minAdvanceMinutes: 30, maxAdvanceDays: 9999, allowSameDayBooking: true } },
      fakeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});

describe('listAuditLog', () => {
  it('forwards query filters to the service and never writes an entry itself', async () => {
    const page = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };
    auditLogService.list.mockResolvedValue(page);
    const res = fakeRes();

    await adminController.listAuditLog(
      { query: { page: '2', pageSize: '10', action: 'CATEGORY_DELETED', entityType: 'ServiceCategory' } },
      res,
      jest.fn(),
    );

    expect(auditLogService.list).toHaveBeenCalledWith({
      page: '2',
      pageSize: '10',
      action: 'CATEGORY_DELETED',
      entityType: 'ServiceCategory',
      from: undefined,
      to: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: page });
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});

describe('exportBackup', () => {
  it('sends the raw snapshot with download headers — not the usual {success,data} envelope', async () => {
    const snapshot = { formatVersion: 1, generatedAt: 'now', application: 'x', data: {} };
    backupService.buildSnapshot.mockResolvedValue(snapshot);
    backupService.backupFilename.mockReturnValue('smart-automotive-backup-2026-09-04-2105.json');
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await adminController.exportBackup({ user: ADMIN }, res, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="smart-automotive-backup-2026-09-04-2105.json"',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify(snapshot));
  });

  it('records a SYSTEM_BACKUP_EXPORTED audit entry without the payload itself', async () => {
    backupService.buildSnapshot.mockResolvedValue({ data: { users: [{ id: 1 }] } });
    backupService.backupFilename.mockReturnValue('smart-automotive-backup-2026-09-04-2105.json');
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await adminController.exportBackup({ user: ADMIN }, res, jest.fn());

    expect(auditLogService.record).toHaveBeenCalledWith({
      adminId: 1,
      action: 'SYSTEM_BACKUP_EXPORTED',
      entityType: 'System',
      metadata: { filename: 'smart-automotive-backup-2026-09-04-2105.json' },
    });
  });

  it('passes a build failure to next() rather than sending a partial file', async () => {
    const err = new Error('db unavailable');
    backupService.buildSnapshot.mockRejectedValue(err);
    const next = jest.fn();
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await adminController.exportBackup({ user: ADMIN }, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.send).not.toHaveBeenCalled();
  });
});
