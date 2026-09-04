import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProviderSettingsPage } from './ProviderSettingsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const logout = vi.fn();
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Sami Provider', email: 'sami@smartauto.local', role: 'PROVIDER' },
    isAuthenticated: true,
    loading: false,
    loginWithResult: vi.fn(),
    updateUser: vi.fn(),
    logout,
  }),
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('@/app/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/app/providers/DirectionProvider', () => ({
  useDirection: () => ({ language: 'en', dir: 'ltr', toggleLanguage: vi.fn() }),
}));

const PROFILE = {
  id: 2,
  userId: 7,
  businessName: 'Al-Nour Auto',
  address: '12 Nile St',
  description: null,
  isApproved: true,
  isOpen: true,
  latitude: null,
  longitude: null,
  estimatedWaitMinutes: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  user: { id: 7, name: 'Sami Provider', email: 'sami@smartauto.local', phone: null },
  services: [],
  rating: { averageRating: null, reviewCount: 0 },
};

const NOTIFICATION_PREFERENCES = {
  id: 1,
  userId: 7,
  bookingUpdates: true,
  queueUpdates: true,
  reviewUpdates: true,
  providerUpdates: true,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

function mockDefaultGets() {
  vi.mocked(apiClient.get).mockImplementation((path: string) => {
    if (path === '/providers/me') {
      return Promise.resolve({ data: { success: true, data: PROFILE } });
    }
    if (path === '/notifications/preferences') {
      return Promise.resolve({ data: { success: true, data: NOTIFICATION_PREFERENCES } });
    }
    return Promise.reject(new Error(`Unexpected GET ${path}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProviderSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDefaultGets();
});

describe('ProviderSettingsPage', () => {
  it('renders real notification preference toggles, loaded from the backend — never stale "Unavailable" text', async () => {
    renderPage();
    await screen.findByText('Sami Provider');

    expect(await screen.findByRole('switch', { name: 'Booking updates' })).toBeChecked();
    expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unavailable' })).not.toBeInTheDocument();
  });

  it('saves a real PATCH to /notifications/preferences when a toggle is switched', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { ...NOTIFICATION_PREFERENCES, bookingUpdates: false } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.click(await screen.findByRole('switch', { name: 'Booking updates' }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/preferences', {
        bookingUpdates: false,
      }),
    );
  });

  it('replaces "Delete account" with a real, non-destructive "Deactivate Account" action', async () => {
    renderPage();
    await screen.findByText('Sami Provider');

    expect(screen.queryByText('Delete account')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate Account' })).toBeInTheDocument();
  });

  it('shows a destructive confirmation dialog before deactivating, and does nothing on Cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.click(screen.getByRole('button', { name: 'Deactivate Account' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/deactivate your account/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('confirming deactivation calls the real endpoint, logs out, and redirects to login', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { deactivated: true } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.click(screen.getByRole('button', { name: 'Deactivate Account' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate Account' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/providers/me/deactivate'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the real backend error and stays logged in if deactivation fails — never a fake success', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'No provider profile is linked to this account' } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.click(screen.getByRole('button', { name: 'Deactivate Account' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate Account' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'No provider profile is linked to this account',
          variant: 'destructive',
        }),
      ),
    );
    expect(logout).not.toHaveBeenCalled();
  });

  it('renders a real, working change-password form', async () => {
    renderPage();
    await screen.findByText('Sami Provider');

    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  it('submits a real PATCH /auth/change-password with exactly the three real fields, clears the form, and shows success', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { message: 'Password changed successfully' } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.type(screen.getByLabelText('Current password'), 'demo123');
    await user.type(screen.getByLabelText('New password'), 'new-secure-pw');
    await user.type(screen.getByLabelText('Confirm new password'), 'new-secure-pw');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'demo123',
        newPassword: 'new-secure-pw',
      }),
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Password changed successfully', variant: 'success' }),
      ),
    );
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('shows the real backend error message on failure — e.g. wrong current password', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Current password is incorrect' } },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sami Provider');

    await user.type(screen.getByLabelText('Current password'), 'wrong-password');
    await user.type(screen.getByLabelText('New password'), 'new-secure-pw');
    await user.type(screen.getByLabelText('Confirm new password'), 'new-secure-pw');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Current password is incorrect', variant: 'destructive' }),
      ),
    );
  });
});
