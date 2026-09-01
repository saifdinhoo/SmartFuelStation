import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { ProviderFinancePage } from './ProviderFinancePage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const SUMMARY = {
  providerId: 2,
  commissionRate: 10,
  range: '30d',
  grossServiceValue: 100,
  platformCommissionRevenue: 10,
  providerNetEarnings: 90,
  pendingSettlementAmount: 90,
  settledAmount: 0,
  trend: [{ label: '2026-08-30', gross: 100, commission: 10, net: 90 }],
};

const TRANSACTIONS = [
  {
    id: 1,
    bookingId: 5,
    grossAmount: 100,
    commissionRate: 10,
    commissionAmount: 10,
    providerNetAmount: 90,
    settlementStatus: 'PENDING',
    settledAt: null,
    createdAt: '2026-08-30T00:00:00.000Z',
    booking: { id: 5, status: 'COMPLETED', scheduledAt: '2026-08-30T00:00:00.000Z', serviceName: 'Oil Change' },
  },
];

function mockGet(url: string) {
  if (url === '/providers/me/finance/summary') return Promise.resolve({ data: { success: true, data: SUMMARY } });
  if (url === '/providers/me/finance/transactions') {
    return Promise.resolve({ data: { success: true, data: TRANSACTIONS } });
  }
  if (url === '/providers/me/commission') {
    return Promise.resolve({ data: { success: true, data: { providerId: 2, commissionRate: 10 } } });
  }
  return Promise.resolve({ data: { success: true, data: [] } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<ProviderFinancePage />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(mockGet as never);
});

describe('ProviderFinancePage', () => {
  it('shows the real gross/fee/net/pending/settled totals', async () => {
    renderPage();
    expect(await screen.findByText('$100.00')).toBeInTheDocument(); // gross
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // fee
    expect(screen.getAllByText('$90.00')).toHaveLength(2); // net + pending both 90
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // settled
  });

  it('shows the current platform commission rate as read-only text', async () => {
    renderPage();
    expect(await screen.findByText('10%')).toBeInTheDocument();
  });

  it('never renders any editable commission control — provider cannot edit it', async () => {
    renderPage();
    await screen.findByText('10%');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('never renders a settlement action — provider cannot settle', async () => {
    renderPage();
    await screen.findByText('Oil Change');
    expect(screen.queryByRole('button', { name: /settle/i })).not.toBeInTheDocument();
  });

  it('never shows internal admin identity for a settled transaction', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/providers/me/finance/transactions') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                ...TRANSACTIONS[0],
                settlementStatus: 'SETTLED',
                settledAt: '2026-08-31T00:00:00.000Z',
              },
            ],
          },
        });
      }
      return mockGet(url);
    }) as never);

    renderPage();
    await screen.findByText('Oil Change');
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
  });

  it('renders the real transaction history list', async () => {
    renderPage();
    expect(await screen.findByText('Oil Change')).toBeInTheDocument();
  });

  it('shows an honest empty state with zero transactions', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/providers/me/finance/transactions') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return mockGet(url);
    }) as never);

    renderPage();
    expect(await screen.findByText('No earnings yet')).toBeInTheDocument();
  });

  it('surfaces an error state on summary load failure, with a retry action', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/providers/me/finance/summary') return Promise.reject(new Error('network down'));
      return mockGet(url);
    }) as never);

    renderPage();
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
