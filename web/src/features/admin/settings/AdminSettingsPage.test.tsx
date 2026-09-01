import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminSettingsPage } from './AdminSettingsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { patch: vi.fn() },
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
});

describe('AdminSettingsPage', () => {
  it('lists only the three genuinely-unsupported items — Change password is no longer one of them', () => {
    renderPage();

    expect(screen.getAllByRole('button', { name: 'Unavailable' })).toHaveLength(3);
    expect(screen.getByText('Booking window configuration')).toBeInTheDocument();
    expect(screen.getByText('Notification settings')).toBeInTheDocument();
    expect(screen.getByText('Backups & audit log')).toBeInTheDocument();
  });

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
});
