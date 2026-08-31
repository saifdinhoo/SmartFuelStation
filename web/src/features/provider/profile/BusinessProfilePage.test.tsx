import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { BusinessProfilePage } from './BusinessProfilePage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const PROFILE = {
  id: 2,
  userId: 9,
  businessName: 'Cedars Auto Care',
  address: 'Hamra Street, Beirut',
  description: null,
  isApproved: true,
  isOpen: true,
  latitude: 33.8959,
  longitude: 35.4826,
  estimatedWaitMinutes: 15,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  user: { id: 9, name: 'Maya Khoury', email: 'provider@smartauto.local', phone: null },
  services: [],
  rating: { averageRating: null, reviewCount: 0 },
};

function mockGet(url: string) {
  if (url === '/providers/me') return Promise.resolve({ data: { success: true, data: PROFILE } });
  // Unrelated cards on this page (hours, fuel) — empty is fine, this suite
  // only asserts on the Location card.
  return Promise.resolve({ data: { success: true, data: [] } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<BusinessProfilePage />, { wrapper: Wrapper });
}

const getCurrentPosition = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(mockGet as never);
  vi.stubGlobal('open', vi.fn());
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
});

describe('BusinessProfilePage — location actions', () => {
  it('Preview on map uses the saved coordinates before any edit', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('33.8959');

    await user.click(screen.getByRole('button', { name: /preview on map/i }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('33.8959,35.4826'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('Preview uses the CURRENT unsaved form values, not the last-saved ones', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('33.8959');

    const latInput = screen.getByLabelText('Latitude');
    await user.clear(latInput);
    await user.type(latInput, '34.0');

    await user.click(screen.getByRole('button', { name: /preview on map/i }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('34,35.4826'),
      '_blank',
      'noopener,noreferrer',
    );
    // Nothing was saved by Preview.
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('Use current location populates the form but requires an explicit Save', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 34.5, longitude: 36.1 },
      } as GeolocationPosition);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('33.8959');

    await user.click(screen.getByRole('button', { name: /use current location/i }));

    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveValue(34.5));
    expect(screen.getByLabelText('Longitude')).toHaveValue(36.1);
    // Populating the form must never call the save endpoint by itself.
    expect(apiClient.patch).not.toHaveBeenCalled();

    // The profile form's own submit button — OperatingHoursEditor renders a
    // second, unrelated "Save changes" button below it on this page.
    const submitButtons = screen
      .getAllByRole('button', { name: 'Save changes' })
      .filter((btn) => btn.getAttribute('type') === 'submit');
    expect(submitButtons).toHaveLength(1);
    expect(submitButtons[0]).toBeEnabled();
  });

  it('shows an error and leaves the form untouched when geolocation is denied', async () => {
    getCurrentPosition.mockImplementation((_success, error: PositionErrorCallback) => {
      error({ code: 1, message: 'denied' } as GeolocationPositionError);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('33.8959');

    await user.click(screen.getByRole('button', { name: /use current location/i }));

    expect(await screen.findByText(/could not get your current location/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveValue(33.8959);
  });

  it('disables Preview when coordinates are cleared and there is no address to fall back to', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('33.8959');

    await user.clear(screen.getByLabelText('Latitude'));
    await user.clear(screen.getByLabelText('Longitude'));
    await user.clear(screen.getByLabelText('Address'));

    expect(screen.getByRole('button', { name: /preview on map/i })).toBeDisabled();
  });
});
