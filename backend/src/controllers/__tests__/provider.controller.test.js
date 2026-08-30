jest.mock('../../services/provider.service');
jest.mock('../../services/review.service');
jest.mock('../../services/providerProfile.service');
jest.mock('../../services/providerAnalytics.service');
jest.mock('../../sockets/queueEvents');
jest.mock('../../services/notification.service');

const providerService = require('../../services/provider.service');
const socketEvents = require('../../sockets/queueEvents');
const notificationService = require('../../services/notification.service');
const providerController = require('../provider.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

const ADMIN = { userId: 1, role: 'ADMIN' };

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
});
