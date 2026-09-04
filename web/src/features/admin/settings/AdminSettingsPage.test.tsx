import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminSettingsPage } from './AdminSettingsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Nadia Admin', email: 'nadia@smartauto.local', role: 'ADMIN' },
    isAuthenticated: true,
    loading: false,
    loginWithResult: vi.fn(),
    logout: vi.fn(),
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

const BOOKING_POLICY = {
  id: 1,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 30,
  allowSameDayBooking: true,
  updatedAt: '2026-09-04T00:00:00.000Z',
  updatedByAdminId: null,
};

const NOTIFICATION_PREFERENCES = {
  id: 1,
  userId: 1,
  bookingUpdates: true,
  queueUpdates: true,
  reviewUpdates: true,
  providerUpdates: true,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

function mockDefaultGets() {
  vi.mocked(apiClient.get).mockImplementation((path: string) => {
    if (path === '/admin/booking-policy') {
      return Promise.resolve({ data: { success: true, data: BOOKING_POLICY } });
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
        <AdminSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDefaultGets();
});

describe('AdminSettingsPage', () => {
  it('renders a real, working change-password form', () => {
    renderPage();

    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  it('submits a real PATCH /auth/change-password with exactly the three real fields, clears the form, and shows success', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { message: 'Password changed successfully' } },
    });
    const user = userEvent.setup();
    renderPage();

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

  it('loads and displays the real booking policy — no longer "Unavailable"', async () => {
    renderPage();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/admin/booking-policy'));
    expect(await screen.findByLabelText('Minimum advance time (minutes)')).toHaveValue(30);
    expect(screen.getByLabelText('Maximum days in advance')).toHaveValue(30);
    expect(screen.getByRole('switch', { name: 'Allow same-day booking' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('saves an edited booking policy via a real PATCH request', async () => {
    vi.mocked(apiClient.patch).mockImplementation((path: string, body) => {
      if (path === '/admin/booking-policy') {
        return Promise.resolve({ data: { success: true, data: { ...BOOKING_POLICY, ...(body as object) } } });
      }
      return Promise.reject(new Error(`Unexpected PATCH ${path}`));
    });
    const user = userEvent.setup();
    renderPage();

    const minAdvanceInput = await screen.findByLabelText('Minimum advance time (minutes)');
    await user.clear(minAdvanceInput);
    await user.type(minAdvanceInput, '60');
    await user.click(screen.getByRole('button', { name: 'Save booking policy' }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/admin/booking-policy',
        expect.objectContaining({ minAdvanceMinutes: 60, maxAdvanceDays: 30, allowSameDayBooking: true }),
      ),
    );
  });

  it('loads and displays real notification preferences — no longer "Unavailable"', async () => {
    renderPage();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/notifications/preferences'));
    expect(await screen.findByRole('switch', { name: 'Booking updates' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('toggling a notification preference sends a real PATCH request with just that field', async () => {
    vi.mocked(apiClient.patch).mockImplementation((path: string, body) => {
      if (path === '/notifications/preferences') {
        return Promise.resolve({ data: { success: true, data: { ...NOTIFICATION_PREFERENCES, ...(body as object) } } });
      }
      return Promise.reject(new Error(`Unexpected PATCH ${path}`));
    });
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Booking updates' });
    await user.click(toggle);

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/preferences', { bookingUpdates: false }),
    );
  });

  it('shows a real backup download button and links to the real audit log page', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /download backup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'audit log' })).toHaveAttribute('href', '/admin/audit-log');
    expect(screen.queryByText('Backups & audit log')).not.toBeInTheDocument();
  });
});
