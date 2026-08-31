import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProviderDetailsPage } from './ProviderDetailsPage';

const provider = {
  id: 2,
  businessName: 'Cedars Auto Care',
  address: 'Hamra Street, Beirut',
  description: null,
  isOpen: true,
  latitude: 33.8938,
  longitude: 35.5018,
  estimatedWaitMinutes: 10,
  services: [],
  reviewCount: 0,
  distanceKm: 1.8,
  averageRating: null,
};

const useProviderDetailsMock = vi.fn();
vi.mock('./useProviderDetails', () => ({
  useProviderDetails: () => useProviderDetailsMock(),
}));
vi.mock('./useProviderRating', () => ({
  useProviderRating: () => ({ isPending: false, isError: false, summary: null }),
}));
vi.mock('./useProviderReviews', () => ({
  useProviderReviews: () => ({ isPending: false, isError: false, reviews: [], reload: vi.fn() }),
}));
vi.mock('@/features/customer/queue/useQueueSummary', () => ({
  useQueueSummary: () => ({ isPending: false, isError: false, summary: null }),
}));
vi.mock('@/features/scheduling/useOperatingHours', () => ({
  useProviderHours: () => ({ isPending: false, isError: false, hours: [] }),
}));
vi.mock('@/features/fuel/useFuel', () => ({
  useProviderFuel: () => ({ isPending: false, isError: false, fuel: [] }),
}));
vi.mock('@/features/customer/bookings/CreateBookingModal', () => ({
  CreateBookingModal: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/customer/providers/2']}>
      <Routes>
        <Route path="/customer/providers/:id" element={<ProviderDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('open', vi.fn());
  useProviderDetailsMock.mockReturnValue({
    provider,
    isPending: false,
    isError: false,
    errorMessage: null,
    notFound: false,
    reload: vi.fn(),
    customerCoordinates: null,
  });
});

describe('ProviderDetailsPage — location actions', () => {
  it('shows both View location and Get directions for a provider with coordinates', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /view location/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeEnabled();
  });

  it('opens directions without an origin when the customer\'s position is unknown', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /get directions/i }));
    expect(window.open).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=33.8938,35.5018',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('includes the customer\'s real coordinates as the directions origin when known', async () => {
    useProviderDetailsMock.mockReturnValue({
      provider,
      isPending: false,
      isError: false,
      errorMessage: null,
      notFound: false,
      reload: vi.fn(),
      customerCoordinates: { lat: 33.89, lng: 35.5 },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /get directions/i }));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('origin=33.89,35.5'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('disables both location actions for a provider with no coordinates set', () => {
    useProviderDetailsMock.mockReturnValue({
      provider: { ...provider, latitude: null, longitude: null, address: '' },
      isPending: false,
      isError: false,
      errorMessage: null,
      notFound: false,
      reload: vi.fn(),
      customerCoordinates: null,
    });
    renderPage();
    expect(screen.getByRole('button', { name: /view location/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeDisabled();
  });
});
