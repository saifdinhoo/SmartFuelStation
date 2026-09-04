jest.mock('../../services/provider.service');
jest.mock('../../services/review.service');
jest.mock('../../services/providerProfile.service');
jest.mock('../../services/providerAnalytics.service');
jest.mock('../../services/providerHours.service');
jest.mock('../../services/availability.service');
jest.mock('../../services/fuelInventory.service');
jest.mock('../../services/finance.service');
jest.mock('../../services/liveCamera.service');
jest.mock('../../sockets/queueEvents');
jest.mock('../../services/notification.service');
jest.mock('../../services/auditLog.service');

const auditLogService = require('../../services/auditLog.service');
const providerService = require('../../services/provider.service');
const hoursService = require('../../services/providerHours.service');
const availabilityService = require('../../services/availability.service');
const fuelService = require('../../services/fuelInventory.service');
const financeService = require('../../services/finance.service');
const liveCameraService = require('../../services/liveCamera.service');
const socketEvents = require('../../sockets/queueEvents');
const notificationService = require('../../services/notification.service');
const providerController = require('../provider.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

const ADMIN = { userId: 1, role: 'ADMIN' };
const PROVIDER = { userId: 77, role: 'PROVIDER' };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('setApproval', () => {
  it('notifies the provider\'s own user with PROVIDER_APPROVED when approved', async () => {
    providerService.setProviderApproval.mockResolvedValue({
      id: 2,
      userId: 77,
      businessName: 'Al-Nour Auto',
      isApproved: true,
      isOpen: false,
      estimatedWaitMinutes: 0,
    });

    await providerController.setApproval(
      { user: ADMIN, params: { id: 2 }, body: { isApproved: true } },
      fakeRes(),
      jest.fn(),
    );

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 77, type: 'PROVIDER_APPROVED', relatedProviderId: 2 }),
    );
  });

  it('notifies the provider\'s own user with PROVIDER_REJECTED when revoked (never the acting admin)', async () => {
    providerService.setProviderApproval.mockResolvedValue({
      id: 2,
      userId: 77,
      businessName: 'Al-Nour Auto',
      isApproved: false,
      isOpen: false,
      estimatedWaitMinutes: 0,
    });

    await providerController.setApproval(
      { user: ADMIN, params: { id: 2 }, body: { isApproved: false } },
      fakeRes(),
      jest.fn(),
    );

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 77, type: 'PROVIDER_REJECTED', relatedProviderId: 2 }),
    );
    // Never the acting admin (userId 1) — always the provider's own user.
    expect(notificationService.createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1 }),
    );
  });

  it('still emits the existing provider:status_changed socket event unchanged', async () => {
    providerService.setProviderApproval.mockResolvedValue({
      id: 2,
      userId: 77,
      businessName: 'Al-Nour Auto',
      isApproved: true,
      isOpen: true,
      estimatedWaitMinutes: 5,
    });

    await providerController.setApproval(
      { user: ADMIN, params: { id: 2 }, body: { isApproved: true } },
      fakeRes(),
      jest.fn(),
    );

    expect(socketEvents.notifyProviderStatusChanged).toHaveBeenCalledWith({
      providerId: 2,
      isOpen: true,
      estimatedWaitMinutes: 5,
      isApproved: true,
    });
  });

  it('records a PROVIDER_APPROVED audit entry when approved', async () => {
    providerService.setProviderApproval.mockResolvedValue({
      id: 2,
      userId: 77,
      businessName: 'Al-Nour Auto',
      isApproved: true,
      isOpen: false,
      estimatedWaitMinutes: 0,
    });

    await providerController.setApproval(
      { user: ADMIN, params: { id: 2 }, body: { isApproved: true } },
      fakeRes(),
      jest.fn(),
    );

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'PROVIDER_APPROVED', entityType: 'Provider', entityId: 2 }),
    );
  });

  it('records a PROVIDER_REJECTED audit entry when revoked', async () => {
    providerService.setProviderApproval.mockResolvedValue({
      id: 2,
      userId: 77,
      businessName: 'Al-Nour Auto',
      isApproved: false,
      isOpen: false,
      estimatedWaitMinutes: 0,
    });

    await providerController.setApproval(
      { user: ADMIN, params: { id: 2 }, body: { isApproved: false } },
      fakeRes(),
      jest.fn(),
    );

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 1, action: 'PROVIDER_REJECTED', entityType: 'Provider', entityId: 2 }),
    );
  });
});

describe('operating hours', () => {
  it('getMyHours resolves the provider from the JWT, not the request body/params', async () => {
    hoursService.getOwnHours.mockResolvedValue([]);
    const res = fakeRes();

    await providerController.getMyHours(
      { user: PROVIDER, body: { providerId: 999 } },
      res,
      jest.fn(),
    );

    expect(hoursService.getOwnHours).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('updateMyHours forwards the body to the service and resolves the provider from the JWT', async () => {
    const updated = [{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }];
    hoursService.updateOwnHours.mockResolvedValue(updated);
    const res = fakeRes();
    const body = [{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }];

    await providerController.updateMyHours({ user: PROVIDER, body }, res, jest.fn());

    expect(hoursService.updateOwnHours).toHaveBeenCalledWith(77, body);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('updateMyHours passes a service error to next() rather than throwing', async () => {
    const err = new Error('closeTime must be after openTime');
    err.statusCode = 400;
    hoursService.updateOwnHours.mockRejectedValue(err);
    const next = jest.fn();

    await providerController.updateMyHours({ user: PROVIDER, body: [] }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('getHours (public) reads the provider id from the route param', async () => {
    hoursService.getHours.mockResolvedValue([]);
    const res = fakeRes();

    await providerController.getHours({ user: PROVIDER, params: { id: '2' } }, res, jest.fn());

    expect(hoursService.getHours).toHaveBeenCalledWith('2', PROVIDER);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});

describe('getAvailability', () => {
  it('forwards providerId (route param) and serviceId/date (query) to the service', async () => {
    const availability = {
      providerId: 2,
      serviceId: 5,
      date: '2027-01-15',
      status: 'OPEN',
      openingTime: '09:00',
      closingTime: '18:00',
      serviceDurationMinutes: 30,
      slots: [],
    };
    availabilityService.getAvailability.mockResolvedValue(availability);
    const res = fakeRes();

    await providerController.getAvailability(
      {
        user: PROVIDER,
        params: { id: '2' },
        query: { serviceId: '5', date: '2027-01-15' },
      },
      res,
      jest.fn(),
    );

    expect(availabilityService.getAvailability).toHaveBeenCalledWith(
      { providerId: '2', serviceId: '5', date: '2027-01-15' },
      PROVIDER,
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: availability });
  });

  it('passes a service error to next() rather than throwing', async () => {
    const err = new Error('date must be a valid date in the form YYYY-MM-DD');
    err.statusCode = 400;
    availabilityService.getAvailability.mockRejectedValue(err);
    const next = jest.fn();

    await providerController.getAvailability(
      { user: PROVIDER, params: { id: '2' }, query: {} },
      fakeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('fuel inventory (read-only from this controller)', () => {
  it('getMyFuel resolves the provider from the JWT, not the request body', async () => {
    fuelService.getOwnFuel.mockResolvedValue([]);
    const res = fakeRes();

    await providerController.getMyFuel(
      { user: PROVIDER, body: { providerId: 999 } },
      res,
      jest.fn(),
    );

    expect(fuelService.getOwnFuel).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('getFuel (public) reads the provider id from the route param', async () => {
    const fuel = [{ fuelType: 'DIESEL', currentLiters: 100 }];
    fuelService.getPublicFuel.mockResolvedValue(fuel);
    const res = fakeRes();

    await providerController.getFuel({ user: PROVIDER, params: { id: '2' } }, res, jest.fn());

    expect(fuelService.getPublicFuel).toHaveBeenCalledWith('2', PROVIDER);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fuel });
  });

  it('getFuelHistory forwards providerId, fuelType and range to the service', async () => {
    fuelService.getPublicHistory.mockResolvedValue([]);
    const res = fakeRes();

    await providerController.getFuelHistory(
      {
        user: PROVIDER,
        params: { id: '2' },
        query: { fuelType: 'DIESEL', range: '7d' },
      },
      res,
      jest.fn(),
    );

    expect(fuelService.getPublicHistory).toHaveBeenCalledWith(
      '2',
      { fuelType: 'DIESEL', range: '7d' },
      PROVIDER,
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('passes a fuel service error to next() rather than throwing', async () => {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    fuelService.getPublicFuel.mockRejectedValue(err);
    const next = jest.fn();

    await providerController.getFuel({ user: PROVIDER, params: { id: '999' } }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('finance (read-only from this controller — Phase D)', () => {
  it('myFinanceSummary resolves the provider from the JWT, not the request body, and forwards range', async () => {
    financeService.getOwnSummary.mockResolvedValue({ providerId: 2, grossServiceValue: 100 });
    const res = fakeRes();

    await providerController.myFinanceSummary(
      { user: PROVIDER, query: { range: '7d' }, body: { providerId: 999 } },
      res,
      jest.fn(),
    );

    expect(financeService.getOwnSummary).toHaveBeenCalledWith(77, '7d');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { providerId: 2, grossServiceValue: 100 },
    });
  });

  it('myFinanceTransactions resolves the provider from the JWT, not a query param', async () => {
    financeService.listOwnTransactions.mockResolvedValue([]);
    const res = fakeRes();

    await providerController.myFinanceTransactions(
      { user: PROVIDER, query: { providerId: 999 } },
      res,
      jest.fn(),
    );

    expect(financeService.listOwnTransactions).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('myCommission resolves the provider from the JWT and never accepts a providerId from the client', async () => {
    financeService.getOwnCommission.mockResolvedValue({ providerId: 2, commissionRate: 10 });
    const res = fakeRes();

    await providerController.myCommission(
      { user: PROVIDER, body: { providerId: 999 } },
      res,
      jest.fn(),
    );

    expect(financeService.getOwnCommission).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { providerId: 2, commissionRate: 10 },
    });
  });

  it('passes a finance service error to next() rather than throwing', async () => {
    const err = new Error('No provider profile is linked to this account');
    err.statusCode = 403;
    financeService.getOwnSummary.mockRejectedValue(err);
    const next = jest.fn();

    await providerController.myFinanceSummary({ user: PROVIDER, query: {} }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('live camera (Phase F)', () => {
  it('getLiveCameraStatus forwards the route param and returns the service result', async () => {
    const status = { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null };
    liveCameraService.getStatus.mockResolvedValue(status);
    const res = fakeRes();

    await providerController.getLiveCameraStatus({ params: { id: '2' } }, res, jest.fn());

    expect(liveCameraService.getStatus).toHaveBeenCalledWith('2');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: status });
  });

  it('getLiveCameraStatus passes a service error (e.g. invalid provider) to next()', async () => {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    liveCameraService.getStatus.mockRejectedValue(err);
    const next = jest.fn();

    await providerController.getLiveCameraStatus({ params: { id: '999' } }, fakeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('streamLiveCamera forwards the provider id and trailing wildcard path to the proxy', async () => {
    liveCameraService.proxyStream.mockResolvedValue(undefined);
    const res = fakeRes();

    await providerController.streamLiveCamera(
      { params: { id: '2', 0: 'segment3.ts' } },
      res,
      jest.fn(),
    );

    expect(liveCameraService.proxyStream).toHaveBeenCalledWith('2', 'segment3.ts', res);
  });

  it('streamLiveCamera defaults the trailing path to empty for the master playlist request', async () => {
    liveCameraService.proxyStream.mockResolvedValue(undefined);
    const res = fakeRes();

    await providerController.streamLiveCamera({ params: { id: '2' } }, res, jest.fn());

    expect(liveCameraService.proxyStream).toHaveBeenCalledWith('2', '', res);
  });

  it('streamLiveCamera passes a pre-stream error (e.g. not configured) to next()', async () => {
    const err = new Error('Live view is currently unavailable');
    err.statusCode = 503;
    liveCameraService.proxyStream.mockRejectedValue(err);
    const next = jest.fn();
    const res = fakeRes();
    res.headersSent = false;

    await providerController.streamLiveCamera({ params: { id: '2' } }, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('streamLiveCamera never calls next() once headers were already sent — it just tears down the connection', async () => {
    const err = new Error('upstream dropped mid-stream');
    liveCameraService.proxyStream.mockRejectedValue(err);
    const next = jest.fn();
    const res = fakeRes();
    res.headersSent = true;
    res.destroy = jest.fn();

    await providerController.streamLiveCamera({ params: { id: '2' } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.destroy).toHaveBeenCalled();
  });
});
