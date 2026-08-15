const adminService = require('../services/admin.service');

async function overview(req, res, next) {
  try {
    res.json({ success: true, data: await adminService.getOverview() });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    res.json({ success: true, data: await adminService.getAnalytics(req.query.range) });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await adminService.listUsers({
      role: req.query.role,
      search: req.query.search,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    res.json({ success: true, data: await adminService.getUserById(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function listReviews(req, res, next) {
  try {
    const reviews = await adminService.listAllReviews({
      rating: req.query.rating,
      providerId: req.query.providerId,
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function listComplaints(req, res, next) {
  try {
    const complaints = await adminService.listComplaints({
      status: req.query.status,
      severity: req.query.severity,
    });
    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
}

async function updateComplaint(req, res, next) {
  try {
    const complaint = await adminService.updateComplaintStatus(req.params.id, req.body.status);
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  overview,
  analytics,
  listUsers,
  getUser,
  listReviews,
  listComplaints,
  updateComplaint,
};
