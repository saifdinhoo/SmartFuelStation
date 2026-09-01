const complaintService = require('../services/complaint.service');

async function create(req, res, next) {
  try {
    const complaint = await complaintService.createComplaint({
      customerId: req.user.userId,
      providerId: req.body.providerId,
      subject: req.body.subject,
      details: req.body.details,
      severity: req.body.severity,
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const complaints = await complaintService.listMyComplaints(req.user.userId);
    res.status(200).json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine };
