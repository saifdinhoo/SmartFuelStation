const adminService = require('../services/admin.service');
const fuelService = require('../services/fuelInventory.service');
const financeService = require('../services/finance.service');
const bookingPolicyService = require('../services/bookingPolicy.service');
const auditLogService = require('../services/auditLog.service');
const backupService = require('../services/backup.service');
const socketEvents = require('../sockets/queueEvents');

async function safely(fn) {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Socket.IO notification failed:', err);
  }
}

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

// --- fuel inventory (ADMIN-only — enforced by router.use above) -----------

async function listProviderFuel(req, res, next) {
  try {
    const fuel = await fuelService.listAdminFuelForProvider(req.params.providerId);
    res.json({ success: true, data: fuel });
  } catch (err) {
    next(err);
  }
}

async function updateProviderFuel(req, res, next) {
  try {
    const fuel = await fuelService.adminUpsertFuel(
      req.params.providerId,
      req.params.fuelType,
      req.body,
      req.user.userId,
    );
    res.json({ success: true, data: fuel });

    // Anyone currently viewing this provider's fuel status (customer or
    // provider) should treat their last-fetched inventory/history as
    // stale. Public-safe payload only — see notifyProviderFuelUpdated's
    // own doc comment for why a providerId alone is safe to broadcast.
    await safely(() =>
      socketEvents.notifyProviderFuelUpdated({ providerId: Number(req.params.providerId) }),
    );
    await auditLogService.record({
      adminId: req.user.userId,
      action: 'FUEL_INVENTORY_UPDATED',
      entityType: 'Provider',
      entityId: Number(req.params.providerId),
      metadata: { fuelType: req.params.fuelType },
    });
  } catch (err) {
    next(err);
  }
}

async function listProviderFuelHistory(req, res, next) {
  try {
    const history = await fuelService.getAdminHistory(req.params.providerId, {
      fuelType: req.query.fuelType,
      range: req.query.range,
    });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

// --- finance (ADMIN-only — enforced by router.use above) ------------------

async function financeSummary(req, res, next) {
  try {
    const summary = await financeService.getAdminSummary(req.query.range);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

async function financeTransactions(req, res, next) {
  try {
    const transactions = await financeService.listAdminTransactions({
      providerId: req.query.providerId,
      status: req.query.status,
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}

async function financeProvider(req, res, next) {
  try {
    const data = await financeService.getAdminProviderFinance(req.params.providerId, req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function settleFinanceTransaction(req, res, next) {
  try {
    const transaction = await financeService.setSettlementStatus(req.params.id, req.user.userId);
    res.json({ success: true, data: transaction });

    await safely(() => socketEvents.notifyFinanceUpdated({ providerId: transaction.providerId }));
    await auditLogService.record({
      adminId: req.user.userId,
      action: 'FINANCE_SETTLED',
      entityType: 'FinancialTransaction',
      entityId: transaction.id,
      metadata: { providerId: transaction.providerId },
    });
  } catch (err) {
    next(err);
  }
}

// --- commission configuration (ADMIN-only — enforced by router.use above) -

async function getProviderCommission(req, res, next) {
  try {
    const commission = await financeService.getProviderCommission(req.params.providerId);
    res.json({ success: true, data: commission });
  } catch (err) {
    next(err);
  }
}

async function setProviderCommission(req, res, next) {
  try {
    const commission = await financeService.setProviderCommission(
      req.params.providerId,
      req.body.commissionRate,
      req.user.userId,
    );
    res.json({ success: true, data: commission });

    await safely(() => socketEvents.notifyFinanceUpdated({ providerId: commission.providerId }));
    await auditLogService.record({
      adminId: req.user.userId,
      action: 'COMMISSION_RATE_UPDATED',
      entityType: 'Provider',
      entityId: commission.providerId,
      metadata: { newCommissionRate: commission.commissionRate },
    });
  } catch (err) {
    next(err);
  }
}

// --- booking policy (ADMIN-only — enforced by router.use above) -----------

async function getBookingPolicy(req, res, next) {
  try {
    res.json({ success: true, data: await bookingPolicyService.getPolicy() });
  } catch (err) {
    next(err);
  }
}

async function updateBookingPolicy(req, res, next) {
  try {
    const policy = await bookingPolicyService.updatePolicy(
      {
        minAdvanceMinutes: req.body.minAdvanceMinutes,
        maxAdvanceDays: req.body.maxAdvanceDays,
        allowSameDayBooking: req.body.allowSameDayBooking,
      },
      req.user.userId,
    );
    res.json({ success: true, data: policy });

    await auditLogService.record({
      adminId: req.user.userId,
      action: 'BOOKING_POLICY_UPDATED',
      entityType: 'BookingPolicy',
      entityId: policy.id,
      metadata: {
        minAdvanceMinutes: policy.minAdvanceMinutes,
        maxAdvanceDays: policy.maxAdvanceDays,
        allowSameDayBooking: policy.allowSameDayBooking,
      },
    });
  } catch (err) {
    next(err);
  }
}

// --- audit log (ADMIN-only, read-only — enforced by router.use above) -----

async function listAuditLog(req, res, next) {
  try {
    const result = await auditLogService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      action: req.query.action,
      entityType: req.query.entityType,
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// --- backup export (ADMIN-only — enforced by router.use above) ------------

// Responds with the raw JSON snapshot as the entire body (not the usual
// {success,data} envelope) and real download headers, so both the browser
// and a native client can save the response verbatim as a .json file —
// see backup.service.js for exactly what it contains.
async function exportBackup(req, res, next) {
  try {
    const snapshot = await backupService.buildSnapshot();
    const filename = backupService.backupFilename();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(snapshot));

    // The payload itself is never stored in audit metadata — only the fact
    // that an export happened.
    await auditLogService.record({
      adminId: req.user.userId,
      action: 'SYSTEM_BACKUP_EXPORTED',
      entityType: 'System',
      metadata: { filename },
    });
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
  listProviderFuel,
  updateProviderFuel,
  listProviderFuelHistory,
  financeSummary,
  financeTransactions,
  financeProvider,
  settleFinanceTransaction,
  getProviderCommission,
  setProviderCommission,
  getBookingPolicy,
  updateBookingPolicy,
  listAuditLog,
  exportBackup,
};
