import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { AdminFuelPage } from './AdminFuelPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const PROVIDERS = [
  { id: 2, businessName: 'Cedars Fuel Station' },
  { id: 3, businessName: 'Beirut Auto Care' },
];

function adminFuelRow(overrides: Record<string, unknown> = {}) {
  return {
    fuelType: 'GASOLINE_95',
    displayName: 'Gasoline 95',
    capacityLiters: 20000,
    currentLiters: 7450,
    percentageRemaining: 37.3,
    pricePerLiter: 6.8,
    updatedAt: '2026-08-31T10:35:00.000Z',
    id: 1,
    providerId: 2,
    updatedByAdminId: 1,
    updatedByAdminName: 'Site Admin',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockGet(url: string) {
  if (url === '/providers') return Promise.resolve({ data: { success: true, data: PROVIDERS } });
  if (url === '/admin/providers/2/fuel') {
    return Promise.resolve({ data: { success: true, data: [adminFuelRow()] } });
  }
  if (url === '/admin/providers/2/fuel/history') {
    return Promise.resolve({
      data: {
        success: true,
        data: [
          {
            id: 1,
            fuelType: 'GASOLINE_95',
            previousLiters: 15000,
            newLiters: 7450,
            previousCapacityLiters: 20000,
            newCapacityLiters: 20000,
            previousPricePerLiter: 6.8,
            newPricePerLiter: 6.8,
            changedByAdminId: 1,
            changedByAdminName: 'Site Admin',
            createdAt: '2026-08-31T10:35:00.000Z',
          },
        ],
      },
    });
  }
  if (url === '/providers/2/fuel/history') {
    return Promise.resolve({ data: { success: true, data: [] } });
  }
  return Promise.resolve({ data: { success: true, data: [] } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<AdminFuelPage />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(mockGet as never);
});

describe('AdminFuelPage', () => {
  it('lists every provider in the picker', async () => {
    renderPage();
    expect(await screen.findByText('Cedars Fuel Station')).toBeInTheDocument();
    expect(screen.getByText('Beirut Auto Care')).toBeInTheDocument();
  });

  it('shows an empty prompt before a provider is selected', async () => {
    renderPage();
    expect(await screen.findByText('Select a provider')).toBeInTheDocument();
  });

  it('shows all 3 fuel types once a provider is selected, configured or not', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');

    expect(await screen.findByText('Gasoline 95')).toBeInTheDocument();
    expect(screen.getByText('Gasoline 98')).toBeInTheDocument();
    expect(screen.getByText('Diesel / Solar')).toBeInTheDocument();
    // Gasoline 98 and Diesel are both unconfigured for this provider.
    expect(screen.getAllByText('Not configured yet.')).toHaveLength(2);
    expect(screen.getByText('37.3%')).toBeInTheDocument(); // the configured Gasoline 95 row
  });

  it('opens the update form pre-filled with the existing values', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');
    await screen.findByText('Gasoline 95');

    await user.click(screen.getAllByRole('button', { name: 'Update' })[0]);

    expect(await screen.findByRole('dialog', { name: /Update Gasoline 95/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Capacity (L)')).toHaveValue(20000);
    expect(screen.getByLabelText('Remaining (L)')).toHaveValue(7450);
  });

  it('submits a valid update as a PUT to the admin route', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, data: adminFuelRow({ currentLiters: 5000 }) },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');
    await screen.findByText('Gasoline 95');
    await user.click(screen.getAllByRole('button', { name: 'Update' })[0]);
    await screen.findByRole('dialog');

    await user.clear(screen.getByLabelText('Remaining (L)'));
    await user.type(screen.getByLabelText('Remaining (L)'), '5000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/providers/2/fuel/GASOLINE_95',
        expect.objectContaining({ capacityLiters: 20000, currentLiters: 5000 }),
      ),
    );
  });

  it('blocks submission when remaining exceeds capacity, with no PUT sent', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');
    await screen.findByText('Gasoline 95');
    await user.click(screen.getAllByRole('button', { name: 'Update' })[0]);
    await screen.findByRole('dialog');

    await user.clear(screen.getByLabelText('Remaining (L)'));
    await user.type(screen.getByLabelText('Remaining (L)'), '999999');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/cannot exceed capacity/i)).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('offers "Set up" (not "Update") for an unconfigured fuel type', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');
    await screen.findByText('Gasoline 98');

    // Gasoline 98 and Diesel are both unconfigured for this provider.
    expect(screen.getAllByRole('button', { name: 'Set up' })).toHaveLength(2);
  });

  it('shows the real history chart once fuel exists for the selected provider', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Cedars Fuel Station');
    await user.selectOptions(screen.getByLabelText('Provider'), '2');

    expect(await screen.findByText('Fuel Remaining Over Time')).toBeInTheDocument();
  });
});
