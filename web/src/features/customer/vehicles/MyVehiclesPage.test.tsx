import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyVehiclesPage } from './MyVehiclesPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const VEHICLE = {
  id: 1,
  make: 'Toyota',
  model: 'Corolla',
  year: 2022,
  plate: 'ABC 1234',
  color: 'White',
  fuelType: 'GASOLINE_95' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyVehiclesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MyVehiclesPage', () => {
  it('shows a real empty state — never a fake vehicle', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderPage();

    expect(await screen.findByText('No vehicles yet')).toBeInTheDocument();
  });

  it('renders real vehicles from GET /vehicles', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [VEHICLE] } });
    renderPage();

    expect(await screen.findByText('2022 Toyota Corolla')).toBeInTheDocument();
    expect(screen.getByText('White · ABC 1234')).toBeInTheDocument();
    expect(screen.getByText('Gasoline 95')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/vehicles');
  });

  it('adds a vehicle with exactly the entered fields — never a client-supplied ownerId', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: VEHICLE } });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /add vehicle/i }));
    await user.type(screen.getByLabelText('Make'), 'Toyota');
    await user.type(screen.getByLabelText('Model'), 'Corolla');
    const yearInput = screen.getByLabelText('Year');
    await user.clear(yearInput);
    await user.type(yearInput, '2022');
    // Two "Add vehicle" buttons now exist: the header's trigger and the
    // modal's own submit button.
    const addButtons = screen.getAllByRole('button', { name: /^add vehicle$/i });
    await user.click(addButtons[addButtons.length - 1]);

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/vehicles', {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: null,
        color: null,
        fuelType: null,
      }),
    );
  });

  it('edits an existing vehicle via PATCH /vehicles/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [VEHICLE] } });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { ...VEHICLE, color: 'Blue' } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /edit vehicle/i }));
    const colorInput = await screen.findByLabelText('Color (optional)');
    await user.clear(colorInput);
    await user.type(colorInput, 'Blue');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/vehicles/1', {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: 'ABC 1234',
        color: 'Blue',
        fuelType: 'GASOLINE_95',
      }),
    );
  });

  it('clearing an optional field on edit sends an explicit null, not an omitted field', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [VEHICLE] } });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { ...VEHICLE, plate: null } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /edit vehicle/i }));
    const plateInput = await screen.findByLabelText('Plate (optional)');
    await user.clear(plateInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/vehicles/1', {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        plate: null,
        color: 'White',
        fuelType: 'GASOLINE_95',
      }),
    );
  });

  it('removes a vehicle only after confirming, then refetches', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [VEHICLE] } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('2022 Toyota Corolla');
    await user.click(screen.getByRole('button', { name: /delete vehicle/i }));
    expect(apiClient.delete).not.toHaveBeenCalled();

    const confirmButtons = await screen.findAllByRole('button', { name: /remove vehicle/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/vehicles/1'));
  });
});
