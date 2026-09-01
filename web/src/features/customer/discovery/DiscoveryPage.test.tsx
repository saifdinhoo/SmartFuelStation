import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DiscoveryPage } from './DiscoveryPage';

const useNearbyProvidersMock = vi.fn();
vi.mock('./useNearbyProviders', () => ({
  useNearbyProviders: () => useNearbyProvidersMock(),
}));

function baseReturn(overrides: Record<string, unknown> = {}) {
  return {
    providers: [],
    categories: [],
    isPending: false,
    isError: false,
    errorMessage: null,
    reload: vi.fn(),
    locationStatus: 'granted',
    retryLocation: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    categoryId: 'all',
    setCategoryId: vi.fn(),
    sort: 'distance',
    setSort: vi.fn(),
    openNowOnly: false,
    setOpenNowOnly: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DiscoveryPage — Update my location', () => {
  it('is always visible, even once a position is already granted', () => {
    useNearbyProvidersMock.mockReturnValue(baseReturn({ locationStatus: 'granted' }));
    render(<DiscoveryPage />);
    expect(screen.getByRole('button', { name: /update my location/i })).toBeInTheDocument();
  });

  it('explicitly requests a fresh location again when clicked', async () => {
    const retryLocation = vi.fn();
    useNearbyProvidersMock.mockReturnValue(baseReturn({ locationStatus: 'granted', retryLocation }));
    const user = userEvent.setup();
    render(<DiscoveryPage />);

    await user.click(screen.getByRole('button', { name: /update my location/i }));

    expect(retryLocation).toHaveBeenCalledTimes(1);
  });

  it('preserves the current filters — this hook call never resets them', async () => {
    const setSearch = vi.fn();
    const setCategoryId = vi.fn();
    const retryLocation = vi.fn();
    useNearbyProvidersMock.mockReturnValue(
      baseReturn({ search: 'oil change', categoryId: 3, retryLocation, setSearch, setCategoryId }),
    );
    const user = userEvent.setup();
    render(<DiscoveryPage />);

    await user.click(screen.getByRole('button', { name: /update my location/i }));

    // Nothing about filters is touched by requesting a location refresh.
    expect(setSearch).not.toHaveBeenCalled();
    expect(setCategoryId).not.toHaveBeenCalled();
  });

  it('is also present while location is denied or unsupported', () => {
    useNearbyProvidersMock.mockReturnValue(baseReturn({ locationStatus: 'denied' }));
    render(<DiscoveryPage />);
    expect(screen.getByRole('button', { name: /update my location/i })).toBeInTheDocument();
  });
});
