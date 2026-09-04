const providerService = require('../services/provider.service');
const reviewService = require('../services/review.service');
const profileService = require('../services/providerProfile.service');
const analyticsService = require('../services/providerAnalytics.service');
const hoursService = require('../services/providerHours.service');
const availabilityService = require('../services/availability.service');
const fuelService = require('../services/fuelInventory.service');
const financeService = require('../services/finance.service');
const liveCameraService = require('../services/liveCamera.service');
const socketEvents = require('../sockets/queueEvents');
const notificationService = require('../services/notification.service');
const auditLogService = require('../services/auditLog.service');

// Same contract as queue.controller.js and booking.controller.js: socket
// pushes run only after the REST response has been sent, and a failed push
// must never turn a request that already succeeded into a 500.
async function safely(fn) {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Socket.IO notification failed:', err);
  }
}

async function list(req, res, next) {
  try {
    const providers = await providerService.listProviders(req.user.role);
    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const provider = await providerService.approveProvider(req.params.id, req.user.userId);
    res.json({ success: true, data: provider });
  } catch (err) {
    next(err);
  }
}

async function setApproval(req, res, next) {
  try {
    const provider = await providerService.setProviderApproval(
      req.params.id,
      req.body.isApproved,
      req.user.userId,
    );
    res.json({ success: true, data: provider });

    // Approval is public availability too: revoking also forces isOpen to
    // false and drops the business out of customer-facing listings, so a
    // customer looking at it right now should see that immediately rather
    // than on their next manual refresh.
    await safely(() =>
      socketEvents.notifyProviderStatusChanged({
        providerId: provider.id,
        isOpen: provider.isOpen,
        estimatedWaitMinutes: provider.estimatedWaitMinutes,
        isApproved: provider.isApproved,
      }),
    );

    await safely(() =>
      notificationService.createNotification(
        provider.isApproved
          ? {
              userId: provider.userId,
              type: 'PROVIDER_APPROVED',
              title: 'Business approved',
              message: `${provider.businessName} has been approved and is now visible to customers.`,
              relatedProviderId: provider.id,
            }
          : {
              userId: provider.userId,
              type: 'PROVIDER_REJECTED',
              title: 'Business approval revoked',
              message: `${provider.businessName} is no longer approved.`,
              relatedProviderId: provider.id,
            },
      ),
    );

    await auditLogService.record({
      adminId: req.user.userId,
      action: provider.isApproved ? 'PROVIDER_APPROVED' : 'PROVIDER_REJECTED',
      entityType: 'Provider',
      entityId: provider.id,
      metadata: { businessName: provider.businessName },
    });
  } catch (err) {
    next(err);
  }
}

async function listReviews(req, res, next) {
  try {
    const reviews = await reviewService.listProviderReviews(req.params.id, req.user);
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function ratingSummary(req, res, next) {
  try {
    const summary = await reviewService.getProviderRatingSummary(req.params.id, req.user);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

// --- "my own business" handlers -------------------------------------------
// The provider is always resolved from req.user.userId inside the service
// layer, so none of these accept a provider id from the client.

async function getMe(req, res, next) {
  try {
    const profile = await profileService.getOwnProfile(req.user.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const profile = await profileService.updateOwnProfile(req.user.userId, req.body);
    res.json({ success: true, data: profile });

    // Only announce when the request actually touched a publicly visible
    // availability field. A provider editing their description or
    // coordinates changes nothing a browsing customer's card shows, so
    // broadcasting that would be pure noise.
    const touchedPublicField =
      req.body.isOpen !== undefined || req.body.estimatedWaitMinutes !== undefined;

    if (touchedPublicField) {
      await safely(() =>
        socketEvents.notifyProviderStatusChanged({
          providerId: profile.id,
          isOpen: profile.isOpen,
          estimatedWaitMinutes: profile.estimatedWaitMinutes,
          isApproved: profile.isApproved,
        }),
      );
    }
  } catch (err) {
    next(err);
  }
}

async function myAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getProviderAnalytics(req.user.userId, req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createMyService(req, res, next) {
  try {
    const service = await profileService.createService(req.user.userId, req.body);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}

async function updateMyService(req, res, next) {
  try {
    const service = await profileService.updateService(
      req.user.userId,
      req.params.serviceId,
      req.body,
    );
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}

async function deleteMyService(req, res, next) {
  try {
    await profileService.deleteService(req.user.userId, req.params.serviceId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- operating hours --------------------------------------------------------

async function getMyHours(req, res, next) {
  try {
    const hours = await hoursService.getOwnHours(req.user.userId);
    res.json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
}

async function updateMyHours(req, res, next) {
  try {
    const hours = await hoursService.updateOwnHours(req.user.userId, req.body);
    res.json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
}

async function getHours(req, res, next) {
  try {
    const hours = await hoursService.getHours(req.params.id, req.user);
    res.json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const availability = await availabilityService.getAvailability(
      {
        providerId: req.params.id,
        serviceId: req.query.serviceId,
        date: req.query.date,
      },
      req.user,
    );
    res.json({ success: true, data: availability });
  } catch (err) {
    next(err);
  }
}

// --- fuel inventory ---------------------------------------------------------
// Read-only from this controller: only /admin/providers/:id/fuel routes may
// write. A provider reading their own inventory and a customer reading a
// public one both go through the same public-shaped service functions.

async function getMyFuel(req, res, next) {
  try {
    const fuel = await fuelService.getOwnFuel(req.user.userId);
    res.json({ success: true, data: fuel });
  } catch (err) {
    next(err);
  }
}

async function getFuel(req, res, next) {
  try {
    const fuel = await fuelService.getPublicFuel(req.params.id, req.user);
    res.json({ success: true, data: fuel });
  } catch (err) {
    next(err);
  }
}

async function getFuelHistory(req, res, next) {
  try {
    const history = await fuelService.getPublicHistory(
      req.params.id,
      { fuelType: req.query.fuelType, range: req.query.range },
      req.user,
    );
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

// --- finance (read-only — Phase D) ------------------------------------------
// Every handler resolves the provider from req.user.userId inside the
// service layer (financeService.*'s requireOwnProvider), so none of these
// accept a provider id from the client — a provider can never address
// another business's ledger.

async function myFinanceSummary(req, res, next) {
  try {
    const summary = await financeService.getOwnSummary(req.user.userId, req.query.range);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

async function myFinanceTransactions(req, res, next) {
  try {
    const transactions = await financeService.listOwnTransactions(req.user.userId);
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}

async function myCommission(req, res, next) {
  try {
    const commission = await financeService.getOwnCommission(req.user.userId);
    res.json({ success: true, data: commission });
  } catch (err) {
    next(err);
  }
}

// --- live camera (Phase F — read-only, customer-safe) -----------------------

async function getLiveCameraStatus(req, res, next) {
  try {
    const status = await liveCameraService.getStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

// Streams bytes directly to the response rather than returning JSON — the
// one deliberate exception to this controller's usual res.json() shape.
// If the upstream fetch fails after headers are already written, the
// connection is simply torn down rather than trying to send a second,
// conflicting response.
async function streamLiveCamera(req, res, next) {
  try {
    const subPath = req.params[0] || '';
    await liveCameraService.proxyStream(req.params.id, subPath, res);
  } catch (err) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    next(err);
  }
}

module.exports = {
  list,
  approve,
  setApproval,
  listReviews,
  ratingSummary,
  getMe,
  updateMe,
  myAnalytics,
  createMyService,
  updateMyService,
  deleteMyService,
  getMyHours,
  updateMyHours,
  getHours,
  getAvailability,
  getMyFuel,
  getFuel,
  getFuelHistory,
  myFinanceSummary,
  myFinanceTransactions,
  myCommission,
  getLiveCameraStatus,
  streamLiveCamera,
};