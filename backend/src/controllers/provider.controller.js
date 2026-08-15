const providerService = require('../services/provider.service');
const reviewService = require('../services/review.service');
const profileService = require('../services/providerProfile.service');
const analyticsService = require('../services/providerAnalytics.service');

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
};