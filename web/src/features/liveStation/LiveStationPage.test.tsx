import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LiveStationPage } from './LiveStationPage';

const provider = {
  id: 2,
  businessName: 'Cedars Fuel Station',
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
  liveCameraEnabled: true,
};

const useProviderDetailsMock = vi.fn();
vi.mock('@/features/customer/discovery/useProviderDetails', () => ({
  useProviderDetails: () => useProviderDetailsMock(),
}));

const useQueueSummaryMock = vi.fn();
vi.mock('@/features/customer/queue/useQueueSummary', () => ({
  useQueueSummary: () => useQueueSummaryMock(),
}));

const useProviderFuelMock = vi.fn();
vi.mock('@/features/fuel/useFuel', () => ({
  useProviderFuel: () => useProviderFuelMock(),
}));

const useLiveCameraStatusMock = vi.fn();
vi.mock('./useLiveCameraStatus', () => ({
  useLiveCameraStatus: () => useLiveCameraStatusMock(),
}));

vi.mock('./liveStationApi', () => ({
  buildStreamUrl: (url: string) => `STREAM(${url})`,
  buildMediaTokenUrl: (url: string, mediaToken: string | null | undefined) =>
    mediaToken ? `NATIVE(${url},${mediaToken})` : null,
  getPrimaryAuthToken: () => 'primary-jwt',
}));

vi.mock('./LiveVideoPlayer', () => ({
  LiveVideoPlayer: ({
    streamUrl,
    authToken,
    nativeSrc,
  }: {
    streamUrl: string;
    authToken: string;
    nativeSrc: string | null;
  }) => (
    <div data-testid="live-video-player" data-auth-token={authToken} data-native-src={nativeSrc ?? ''}>
      {streamUrl}
    </div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/customer/live-station/2']}>
      <Routes>
        <Route path="/customer/live-station/:providerId" element={<LiveStationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useProviderDetailsMock.mockReturnValue({
    provider,
    isPending: false,
    isError: false,
    errorMessage: null,
    notFound: false,
    reload: vi.fn(),
    customerCoordinates: null,
  });
  useQueueSummaryMock.mockReturnValue({
    isPending: false,
    isError: false,
    summary: { queueLength: 2, estimatedWaitMinutes: 15 },
  });
  useProviderFuelMock.mockReturnValue({ isPending: false, isError: false, fuel: [] });
});

describe('LiveStationPage', () => {
  it('renders the real video player only when the camera is actually LIVE', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: {
        providerId: 2,
        available: true,
        status: 'LIVE',
        playbackUrl: '/api/providers/2/live-camera/stream',
        mediaToken: 'scoped-media-token',
      },
      isPending: false,
    });
    renderPage();

    const player = await screen.findByTestId('live-video-player');
    expect(player).toHaveTextContent('STREAM(/api/providers/2/live-camera/stream)');
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('passes the primary auth token and the scoped native fallback URL separately — never merges them', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: {
        providerId: 2,
        available: true,
        status: 'LIVE',
        playbackUrl: '/api/providers/2/live-camera/stream',
        mediaToken: 'scoped-media-token',
      },
      isPending: false,
    });
    renderPage();

    const player = await screen.findByTestId('live-video-player');
    expect(player.getAttribute('data-auth-token')).toBe('primary-jwt');
    expect(player.getAttribute('data-native-src')).toBe(
      'NATIVE(/api/providers/2/live-camera/stream,scoped-media-token)',
    );
    // The plain streamUrl (passed to hls.js) must never itself carry the
    // primary token or the media token.
    expect(player.textContent).not.toContain('primary-jwt');
    expect(player.textContent).not.toContain('scoped-media-token');
  });

  it('never renders the video player when LIVE but no mediaToken/playbackUrl combination is playable, without crashing', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'LIVE', playbackUrl: null, mediaToken: null },
      isPending: false,
    });
    renderPage();

    expect(await screen.findByText('Camera Offline')).toBeInTheDocument();
    expect(screen.queryByTestId('live-video-player')).not.toBeInTheDocument();
  });

  it('shows "Camera Offline" and never attempts to build a player when the status is OFFLINE', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null },
      isPending: false,
    });
    renderPage();

    expect(await screen.findByText('Live view is currently unavailable.')).toBeInTheDocument();
    expect(screen.getAllByText('Camera Offline')).toHaveLength(2);
    expect(screen.queryByTestId('live-video-player')).not.toBeInTheDocument();
  });

  it('shows a clean not-available state for a provider with no camera at all, rather than crashing', async () => {
    useProviderDetailsMock.mockReturnValue({
      provider: { ...provider, liveCameraEnabled: false },
      isPending: false,
      isError: false,
      errorMessage: null,
      notFound: false,
      reload: vi.fn(),
      customerCoordinates: null,
    });
    useLiveCameraStatusMock.mockReturnValue({ cameraStatus: undefined, isPending: false });
    renderPage();

    expect(await screen.findByText('Live view not available')).toBeInTheDocument();
    expect(screen.queryByTestId('live-video-player')).not.toBeInTheDocument();
  });

  it('shows the real, existing queue/wait information — never a duplicated data source', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null },
      isPending: false,
    });
    renderPage();

    expect(await screen.findByText(/2 in queue · ~15 min/)).toBeInTheDocument();
  });

  it('shows the required station-provided privacy note', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null },
      isPending: false,
    });
    renderPage();

    expect(
      await screen.findByText('Live view is provided by the station for current conditions.'),
    ).toBeInTheDocument();
  });

  it('includes View location / Get directions, reusing the shared LocationActions component', async () => {
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null },
      isPending: false,
    });
    renderPage();

    expect(await screen.findByRole('button', { name: /view location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeInTheDocument();
  });

  it('shows real fuel data when the provider sells fuel', async () => {
    useProviderFuelMock.mockReturnValue({
      isPending: false,
      isError: false,
      fuel: [
        {
          fuelType: 'GASOLINE_95',
          displayName: 'Gasoline 95',
          capacityLiters: 20000,
          currentLiters: 7450,
          percentageRemaining: 37.3,
          pricePerLiter: 6.8,
          updatedAt: '2026-08-31T10:35:00.000Z',
        },
      ],
    });
    useLiveCameraStatusMock.mockReturnValue({
      cameraStatus: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null },
      isPending: false,
    });
    renderPage();

    expect(await screen.findByText('Fuel Availability')).toBeInTheDocument();
    expect(screen.getByText('Gasoline 95')).toBeInTheDocument();
  });
});
