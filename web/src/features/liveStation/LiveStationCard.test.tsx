import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LiveStationCard } from './LiveStationCard';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LiveStationCard providerId={2} businessName="Cedars Fuel Station" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LiveStationCard', () => {
  it('shows a real LIVE badge only when the fetched status actually says LIVE', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'LIVE', playbackUrl: '/api/providers/2/live-camera/stream' } },
    });
    renderCard();
    expect(await screen.findByText('LIVE')).toBeInTheDocument();
    expect(screen.queryByText('Camera Offline')).not.toBeInTheDocument();
  });

  it('never shows a LIVE badge when the real status is OFFLINE', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null } },
    });
    renderCard();
    expect(await screen.findByText('Camera Offline')).toBeInTheDocument();
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByText('Live view is currently unavailable.')).toBeInTheDocument();
  });

  it('shows the real business name, never a hardcoded one', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null } },
    });
    renderCard();
    expect(await screen.findByText('Cedars Fuel Station')).toBeInTheDocument();
  });

  it('navigates to the dedicated live-station route for this exact provider id when clicked', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'LIVE', playbackUrl: '/api/providers/2/live-camera/stream' } },
    });
    const user = userEvent.setup();
    renderCard();
    await screen.findByText('LIVE');

    await user.click(screen.getByRole('button', { name: /watch live/i }));

    expect(navigateMock).toHaveBeenCalledWith('/customer/live-station/2');
  });
});
