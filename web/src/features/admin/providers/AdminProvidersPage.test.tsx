import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminProvidersPage } from './AdminProvidersPage';
import type { AdminProvider } from './types';

function provider(overrides: Partial<AdminProvider> = {}): AdminProvider {
  return {
    id: 2,
    businessName: 'Cedars Auto Care',
    address: 'Hamra Street, Beirut',
    description: null,
    isApproved: true,
    isOpen: true,
    latitude: '33.8938',
    longitude: '35.5018',
    estimatedWaitMinutes: 10,
    approvedAt: '2026-01-01T00:00:00.000Z',
    approvedById: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    user: { id: 9, name: 'Maya Khoury', email: 'provider@smartauto.local', phone: null },
    services: [],
    _count: { reviews: 0, queueEntries: 0 },
    ...overrides,
  };
}

const useProviderApprovalsMock = vi.fn();
vi.mock('./useProviderApprovals', () => ({
  useProviderApprovals: () => useProviderApprovalsMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('open', vi.fn());
});

describe('AdminProvidersPage — View location', () => {
  it('is enabled for a provider with real coordinates', () => {
    useProviderApprovalsMock.mockReturnValue({
      viewState: 'ready',
      errorMessage: null,
      providers: [provider()],
      pending: [],
      approved: [provider()],
      isMutating: false,
      approve: vi.fn(),
      revoke: vi.fn(),
      reload: vi.fn(),
    });
    render(<AdminProvidersPage />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeEnabled();
  });

  it('opens the pin URL for that provider\'s coordinates', async () => {
    useProviderApprovalsMock.mockReturnValue({
      viewState: 'ready',
      errorMessage: null,
      providers: [provider()],
      pending: [],
      approved: [provider()],
      isMutating: false,
      approve: vi.fn(),
      revoke: vi.fn(),
      reload: vi.fn(),
    });
    const user = userEvent.setup();
    render(<AdminProvidersPage />);

    await user.click(screen.getByRole('button', { name: /view location/i }));

    expect(window.open).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=33.8938,35.5018',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('falls back to the address when a provider has no coordinates yet — never disabled outright with a real address', async () => {
    useProviderApprovalsMock.mockReturnValue({
      viewState: 'ready',
      errorMessage: null,
      providers: [provider({ latitude: null, longitude: null })],
      pending: [provider({ latitude: null, longitude: null })],
      approved: [],
      isMutating: false,
      approve: vi.fn(),
      revoke: vi.fn(),
      reload: vi.fn(),
    });
    const user = userEvent.setup();
    render(<AdminProvidersPage />);

    const button = screen.getByRole('button', { name: /view location/i });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Hamra Street, Beirut')),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
