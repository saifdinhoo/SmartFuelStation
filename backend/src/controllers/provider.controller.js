const providerService = require('../services/provider.service');

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
    const provider = await providerService.approveProvider(req.params.id);
    res.json({ success: true, data: provider });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, approve };
