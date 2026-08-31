import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { FuelHistoryChart } from './FuelHistoryChart';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

function renderChart(fuelTypes: ('GASOLINE_95' | 'GASOLINE_98' | 'DIESEL')[] = ['GASOLINE_95']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<FuelHistoryChart providerId={2} fuelTypes={fuelTypes} />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FuelHistoryChart', () => {
  it('fetches history for the first fuel type and the default 7-day range', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderChart(['GASOLINE_95']);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/providers/2/fuel/history', {
        params: { fuelType: 'GASOLINE_95', range: '7d' },
      }),
    );
  });

  it('shows an honest empty message rather than a fabricated chart when there is no history', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderChart();

    expect(
      await screen.findByText(/no fuel history recorded in this range/i),
    ).toBeInTheDocument();
  });

  it('shows a "more history will appear" note for exactly one real point — never a fake trend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ fuelType: 'GASOLINE_95', liters: 15000, timestamp: '2026-08-01T00:00:00.000Z' }],
      },
    });
    renderChart();

    expect(await screen.findByText(/more history will appear/i)).toBeInTheDocument();
  });

  it('does not show the "more history" note once there are two or more real points', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          { fuelType: 'GASOLINE_95', liters: 15000, timestamp: '2026-08-01T00:00:00.000Z' },
          { fuelType: 'GASOLINE_95', liters: 10000, timestamp: '2026-08-15T00:00:00.000Z' },
        ],
      },
    });
    renderChart();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.queryByText(/more history will appear/i)).not.toBeInTheDocument();
  });

  it('refetches with the new range when the range selector changes', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const user = userEvent.setup();
    renderChart();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[selects.length - 1], '30d');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenLastCalledWith('/providers/2/fuel/history', {
        params: { fuelType: 'GASOLINE_95', range: '30d' },
      }),
    );
  });

  it('offers only the range selector when there is a single fuel type', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderChart(['GASOLINE_95']);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('offers a fuel-type selector too when the provider has more than one fuel type', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderChart(['GASOLINE_95', 'DIESEL']);
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2));
  });
});
