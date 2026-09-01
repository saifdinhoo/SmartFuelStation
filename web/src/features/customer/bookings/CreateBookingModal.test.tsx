import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateBookingModal } from './CreateBookingModal';
import { apiClient } from '@/services/apiClient';
import type { ProviderServiceItem } from '@/features/customer/discovery/types';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const SERVICES: ProviderServiceItem[] = [
  {
    id: 5,
    name: 'Brake Inspection',
    price: 40,
    durationMinutes: 60,
    isAvailable: true,
    category: { id: 1, name: 'Brakes' },
  },
];

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function availabilityResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      success: true,
      data: {
        providerId: 2,
        serviceId: 5,
        date: todayLocal(),
        status: 'OPEN',
        openingTime: '09:00',
        closingTime: '18:00',
        serviceDurationMinutes: 60,
        slots: [
          { startTime: '09:00', endTime: '10:00', status: 'AVAILABLE' },
          { startTime: '10:00', endTime: '11:00', status: 'BOOKED' },
          { startTime: '08:00', endTime: '09:00', status: 'PAST' },
        ],
        ...overrides,
      },
    },
  };
}

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function LocationProbe() {
    return <p data-testid="location">{useLocation().pathname}</p>;
  }
  render(
    <MemoryRouter initialEntries={['/customer/providers/2']}>
      <QueryClientProvider client={queryClient}>
        <CreateBookingModal open onClose={onClose} providerId={2} services={SERVICES} />
      </QueryClientProvider>
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateBookingModal', () => {
  it('fetches availability for today as soon as a service is chosen', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(availabilityResponse());
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(screen.getByLabelText('Service'), '5');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/providers/2/availability', {
        params: { serviceId: 5, date: todayLocal() },
      }),
    );
  });

  it('shows AVAILABLE slots as clickable and BOOKED/PAST slots as disabled', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(availabilityResponse());
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');

    const available = await screen.findByRole('button', { name: '09:00' });
    const booked = screen.getByRole('button', { name: '10:00' });
    const past = screen.getByRole('button', { name: '08:00' });

    expect(available).toBeEnabled();
    expect(booked).toBeDisabled();
    expect(past).toBeDisabled();
  });

  it('never lets a BOOKED or PAST slot be selected, and disables submit until an AVAILABLE one is', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(availabilityResponse());
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');

    const submit = screen.getByRole('button', { name: 'Request booking' });
    expect(submit).toBeDisabled();

    await user.click(await screen.findByRole('button', { name: '09:00' }));
    expect(submit).toBeEnabled();
  });

  it('shows a CLOSED message and no slots when the provider is closed that day', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      availabilityResponse({ status: 'CLOSED', openingTime: null, closingTime: null, slots: [] }),
    );
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');

    expect(await screen.findByText(/closed on the selected date/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument();
  });

  it('shows an hours-not-configured message rather than fabricating hours', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      availabilityResponse({
        status: 'HOURS_NOT_CONFIGURED',
        openingTime: null,
        closingTime: null,
        slots: [],
      }),
    );
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');

    expect(await screen.findByText(/hasn't set their operating hours yet/i)).toBeInTheDocument();
  });

  it('submits a booking with the local date+slot combined into the scheduledAt instant', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(availabilityResponse());
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { id: 77 } } });
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');
    await user.click(await screen.findByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: 'Request booking' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, { scheduledAt: string }];
    const [y, m, d] = todayLocal().split('-').map(Number);
    const expected = new Date(y, m - 1, d, 9, 0, 0, 0).toISOString();
    expect(body.scheduledAt).toBe(expected);
    expect(body).toMatchObject({ providerServiceId: 5 });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/customer/bookings/77'));
  });

  it('on a 409 conflict, shows a message, clears the selection, and refreshes availability', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(availabilityResponse());
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'This slot was just booked' } },
    });
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('Service'), '5');
    await user.click(await screen.findByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: 'Request booking' }));

    await waitFor(() =>
      expect(screen.getByText(/just booked by someone else/i)).toBeInTheDocument(),
    );
    // Selection cleared -> submit disabled again.
    expect(screen.getByRole('button', { name: 'Request booking' })).toBeDisabled();
    // Availability was refetched (GET called again beyond the initial load).
    await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(1));
  });
});
