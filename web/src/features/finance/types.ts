// Shared between the admin finance dashboard and the provider's own
// read-only earnings view — both talk to the same backend shapes (see
// backend/src/services/finance.service.js). Every money field here is
// already a plain number (2 decimal places) — the backend has already
// widened its Prisma Decimal columns before sending JSON.

export type FinanceRange = '7d' | '30d' | '90d';

export type SettlementStatus = 'PENDING' | 'SETTLED';

export interface FinanceTrendPoint {
  label: string;
  gross: number;
  commission: number;
  net: number;
}

export interface FinanceBookingRef {
  id: number;
  status: string;
  scheduledAt: string;
  serviceName: string | null;
}

export interface FinanceTotals {
  grossServiceValue: number;
  platformCommissionRevenue: number;
  providerNetEarnings: number;
  pendingSettlementAmount: number;
  settledAmount: number;
}

// GET /admin/finance/transactions and /admin/finance/providers/:id's
// transaction rows — the audit-rich admin shape.
export interface AdminFinanceTransaction {
  id: number;
  bookingId: number;
  providerId: number;
  providerName: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  providerNetAmount: number;
  settlementStatus: SettlementStatus;
  settledAt: string | null;
  settledByAdminId: number | null;
  settledByAdminName: string | null;
  createdAt: string;
  updatedAt: string;
  booking: FinanceBookingRef | null;
}

// GET /providers/me/finance/transactions — never providerId, providerName,
// settledByAdminId or settledByAdminName. A provider must never see another
// provider's data or internal admin identity.
export interface ProviderFinanceTransaction {
  id: number;
  bookingId: number;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  providerNetAmount: number;
  settlementStatus: SettlementStatus;
  settledAt: string | null;
  createdAt: string;
  booking: FinanceBookingRef | null;
}

// GET /admin/finance/summary — platform-wide, all-time totals plus a
// windowed trend.
export interface AdminFinanceSummary extends FinanceTotals {
  range: FinanceRange;
  transactionCount: number;
  trend: FinanceTrendPoint[];
}

// GET /admin/finance/providers/:id
export interface AdminProviderFinance extends FinanceTotals {
  providerId: number;
  providerName: string;
  commissionRate: number;
  range: FinanceRange;
  trend: FinanceTrendPoint[];
  transactions: AdminFinanceTransaction[];
}

// GET /providers/me/finance/summary
export interface ProviderFinanceSummary extends FinanceTotals {
  providerId: number;
  commissionRate: number;
  range: FinanceRange;
  trend: FinanceTrendPoint[];
}

// GET /admin/providers/:id/commission and GET /providers/me/commission.
export interface ProviderCommission {
  providerId: number;
  commissionRate: number;
  updatedAt: string | null;
  updatedByAdminId: number | null;
}
