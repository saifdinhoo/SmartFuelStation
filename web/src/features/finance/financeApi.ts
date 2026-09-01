import { apiClient } from '@/services/apiClient';
import type {
  AdminFinanceSummary,
  AdminFinanceTransaction,
  AdminProviderFinance,
  FinanceRange,
  ProviderCommission,
  ProviderFinanceSummary,
  ProviderFinanceTransaction,
  SettlementStatus,
} from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// --- admin reads --------------------------------------------------------

export async function fetchAdminFinanceSummary(
  range: FinanceRange = '30d',
): Promise<AdminFinanceSummary> {
  const { data } = await apiClient.get<ApiEnvelope<AdminFinanceSummary>>('/admin/finance/summary', {
    params: { range },
  });
  return data.data;
}

export async function fetchAdminFinanceTransactions(
  params: { providerId?: number; status?: SettlementStatus | 'ALL' } = {},
): Promise<AdminFinanceTransaction[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminFinanceTransaction[]>>(
    '/admin/finance/transactions',
    { params },
  );
  return data.data;
}

export async function fetchAdminProviderFinance(
  providerId: number,
  range: FinanceRange = '30d',
): Promise<AdminProviderFinance> {
  const { data } = await apiClient.get<ApiEnvelope<AdminProviderFinance>>(
    `/admin/finance/providers/${providerId}`,
    { params: { range } },
  );
  return data.data;
}

// --- admin write: settlement ---------------------------------------------

export async function settleFinanceTransaction(
  transactionId: number,
): Promise<AdminFinanceTransaction> {
  const { data } = await apiClient.patch<ApiEnvelope<AdminFinanceTransaction>>(
    `/admin/finance/transactions/${transactionId}/settlement`,
  );
  return data.data;
}

// --- commission configuration ---------------------------------------------

export async function fetchProviderCommission(providerId: number): Promise<ProviderCommission> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderCommission>>(
    `/admin/providers/${providerId}/commission`,
  );
  return data.data;
}

export async function updateProviderCommission(
  providerId: number,
  commissionRate: number,
): Promise<ProviderCommission> {
  const { data } = await apiClient.put<ApiEnvelope<ProviderCommission>>(
    `/admin/providers/${providerId}/commission`,
    { commissionRate },
  );
  return data.data;
}

// --- provider-own reads (identity always resolved server-side from the
// JWT — none of these accept or need a providerId) -------------------------

export async function fetchOwnFinanceSummary(
  range: FinanceRange = '30d',
): Promise<ProviderFinanceSummary> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderFinanceSummary>>(
    '/providers/me/finance/summary',
    { params: { range } },
  );
  return data.data;
}

export async function fetchOwnFinanceTransactions(): Promise<ProviderFinanceTransaction[]> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderFinanceTransaction[]>>(
    '/providers/me/finance/transactions',
  );
  return data.data;
}

export async function fetchOwnCommission(): Promise<ProviderCommission> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderCommission>>('/providers/me/commission');
  return data.data;
}
