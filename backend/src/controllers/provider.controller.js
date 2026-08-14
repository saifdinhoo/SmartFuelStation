const providerService = require('../services/provider.service');
const reviewService = require('../services/review.service');

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

module.exports = { list, approve, listReviews, ratingSummary };