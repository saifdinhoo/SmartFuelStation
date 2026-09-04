jest.mock('../../services/notification.service');
jest.mock('../../services/notificationPreference.service');

const notificationPreferenceService = require('../../services/notificationPreference.service');
const notificationController = require('../notification.controller');

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getPreferences', () => {
  it("reads only the caller's own preferences, from the verified token, never a body/param id", async () => {
    const preferences = { userId: 7, bookingUpdates: true };
    notificationPreferenceService.getOwnPreferences.mockResolvedValue(preferences);
    const res = fakeRes();

    await notificationController.getPreferences({ user: { userId: 7 } }, res, jest.fn());

    expect(notificationPreferenceService.getOwnPreferences).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: preferences });
  });
});

describe('updatePreferences', () => {
  it("updates only the caller's own preferences, from the verified token", async () => {
    const updated = { userId: 7, bookingUpdates: false };
    notificationPreferenceService.updateOwnPreferences.mockResolvedValue(updated);
    const req = { user: { userId: 7 }, body: { bookingUpdates: false } };

    await notificationController.updatePreferences(req, fakeRes(), jest.fn());

    expect(notificationPreferenceService.updateOwnPreferences).toHaveBeenCalledWith(7, {
      bookingUpdates: false,
    });
  });

  it('passes a validation error to next() rather than throwing', async () => {
    const err = new Error('bookingUpdates must be a boolean');
    err.statusCode = 400;
    notificationPreferenceService.updateOwnPreferences.mockRejectedValue(err);
    const next = jest.fn();

    await notificationController.updatePreferences(
      { user: { userId: 7 }, body: { bookingUpdates: 'nope' } },
      fakeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
  });
});
