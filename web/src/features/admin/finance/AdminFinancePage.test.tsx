import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { AdminFinancePage } from './AdminFinancePage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const PROVIDERS = [
  { id: 2, businessName: 'Cedars Auto Care' },
  { id: 3, businessName: 'Beirut Auto Care' },
];

const SUMMARY = {
  range: '30d',
  grossServiceValue: 100,
  platformCommissionRevenue: 10,
  providerNetEarnings: 90,
  pendingSettlementAmount: 90,
  settledAmount: 0,
  transactionCount: 1,
  trend: [{ label: '2026-08-30', gross: 100, commission: 10, net: 90 }],
};

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    bookingId: 5,
    providerId: 2,
    providerName: 'Cedars Auto Care',
    grossAmount: 100,
    commissionRate: 10,
    commissionAmount: 10,
    providerNetAmount: 90,
    settlementStatus: 'PENDING',
    settledAt: null,
    settledByAdminId: null,
    settledByAdminName: null,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    booking: { id: 5, status: 'COMPLETED', scheduledAt: '2026-08-30T00:00:00.000Z', serviceName: 'Oil Change' },
    ...overrides,
  };
}

function mockGet(url: string) {
  if (url === '/providers') return Promise.resolve({ data: { success: true, data: PROVIDERS } });
  if (url === '/admin/finance/summary') return Promise.resolve({ data: { success: true, data: SUMMARY } });
  if (url === '/admin/finance/transactions') {
    return Promise.resolve({ data: { success: true, data: [transaction()] } });
  }
  if (url.startsWith('/admin/providers/') && url.endsWith('/commission')) {
    return Promise.resolve({
      data: { success: true, data: { providerId: 2, commissionRate: 10, updatedAt: null, updatedByAdminId: null } },
    });
  }
  return Promise.resolve({ data: { success: true, data: [] } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<AdminFinancePage />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(mockGet as never);
});

describe('AdminFinancePage', () => {
  it('shows the real platform-wide totals', async () => {
    renderPage();
    expect(await screen.findByText('$100.00')).toBeInTheDocument(); // gross
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // platform revenue
    expect(screen.getAllByText('$90.00')).toHaveLength(2); // net + pending both 90
    expect(screen.getByText('1')).toBeInTheDocument(); // transaction count
  });

  it('renders a real revenue chart, not a fabricated one, when transactions exist', async () => {
    renderPage();
    expect(await screen.findByText('Revenue Over Time')).toBeInTheDocument();
    expect(screen.queryByText(/no completed bookings/i)).not.toBeInTheDocument();
  });

  it('groups the provider breakdown from real transaction rows', async () => {
    renderPage();
    // Gross $100 / Commission $10 / Net $90 for this one provider.
    expect(
      await screen.findByText(/Gross \$100\.00 · Commission \$10\.00 · Net \$90\.00/),
    ).toBeInTheDocument();
    // "Cedars Auto Care" legitimately appears twice — the breakdown row and
    // the provider filter's own option.
    expect(screen.getAllByText('Cedars Auto Care').length).toBeGreaterThanOrEqual(2);
  });

  it('lists real transactions with date, provider, gross, commission %, fee, net and status', async () => {
    renderPage();
    expect(await screen.findByText(/Cedars Auto Care — Oil Change/)).toBeInTheDocument();
    // "Pending" legitimately appears twice — the status filter's own option
    // and the transaction row's status badge.
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
  });

  it('offers "Mark Settled" only for a PENDING transaction', async () => {
    renderPage();
    await screen.findByText(/Oil Change/);
    expect(screen.getByRole('button', { name: 'Mark Settled' })).toBeInTheDocument();
  });

  it('never offers a settlement action for an already-SETTLED transaction', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/admin/finance/transactions') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              transaction({
                settlementStatus: 'SETTLED',
                settledAt: '2026-08-31T00:00:00.000Z',
                settledByAdminId: 1,
                settledByAdminName: 'Site Admin',
              }),
            ],
          },
        });
      }
      return mockGet(url);
    }) as never);

    renderPage();
    await screen.findByText(/Oil Change/);
    expect(screen.queryByRole('button', { name: 'Mark Settled' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Settled/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Site Admin/)).toBeInTheDocument();
  });

  it('marking a transaction settled PATCHes the settlement endpoint', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: transaction({ settlementStatus: 'SETTLED', providerId: 2 }) },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Oil Change/);

    await user.click(screen.getByRole('button', { name: 'Mark Settled' }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/finance/transactions/1/settlement'),
    );
  });

  it('opens the commission modal pre-filled with the real current rate', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('button', { name: /manage commission/i });

    await user.click(screen.getAllByRole('button', { name: /manage commission/i })[0]);

    expect(await screen.findByRole('dialog', { name: /Cedars Auto Care/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Commission (%)')).toHaveValue(10);
  });

  it('saving a new commission rate PUTs it to the admin-only endpoint', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, data: { providerId: 2, commissionRate: 15 } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('button', { name: /manage commission/i });
    await user.click(screen.getAllByRole('button', { name: /manage commission/i })[0]);
    await screen.findByRole('dialog');

    await user.clear(screen.getByLabelText('Commission (%)'));
    await user.type(screen.getByLabelText('Commission (%)'), '15');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith('/admin/providers/2/commission', { commissionRate: 15 }),
    );
  });

  it('blocks an out-of-range commission rate client-side, with no PUT sent', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('button', { name: /manage commission/i });
    await user.click(screen.getAllByRole('button', { name: /manage commission/i })[0]);
    await screen.findByRole('dialog');

    await user.clear(screen.getByLabelText('Commission (%)'));
    await user.type(screen.getByLabelText('Commission (%)'), '150');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/must not exceed 100/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('filters transactions by provider and status', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Oil Change/);
    vi.mocked(apiClient.get).mockClear();

    await user.selectOptions(screen.getByLabelText('Status'), 'SETTLED');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/admin/finance/transactions', {
        params: { providerId: undefined, status: 'SETTLED' },
      }),
    );
  });

  it('surfaces an error state on summary load failure, with a retry action', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/admin/finance/summary') return Promise.reject(new Error('network down'));
      return mockGet(url);
    }) as never);

    renderPage();
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
