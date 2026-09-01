import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CustomerSettingsPage } from './CustomerSettingsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { patch: vi.fn() },
}));

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Layla Haddad', email: 'layla@smartauto.local', role: 'CUSTOMER' },
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
      <CustomerSettingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CustomerSettingsPage', () => {
  it('shows the real, authenticated account info — never a placeholder', () => {
    renderPage();
    expect(screen.getByText('Layla Haddad')).toBeInTheDocument();
    expect(screen.getByText('layla@smartauto.local')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });

  it('renders the real, working theme and language controls', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle language/i })).toBeInTheDocument();
  });

  it('never shows fake/disabled settings — no notification preferences, no delete account, no "coming soon"', () => {
    renderPage();
    expect(screen.queryByText(/notification preferences/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming in a later task/i)).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('rejects a new password shorter than 6 characters before ever calling the backend', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Current password'), 'demo123');
    await user.type(screen.getByLabelText('New password'), 'abc');
    await user.type(screen.getByLabelText('Confirm new password'), 'abc');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation before ever calling the backend', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Current password'), 'demo123');
    await user.type(screen.getByLabelText('New password'), 'new-secure-pw');
    await user.type(screen.getByLabelText('Confirm new password'), 'different-value');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('shows the real backend error message on failure — e.g. wrong current password — never a generic swallow', async () => {
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
