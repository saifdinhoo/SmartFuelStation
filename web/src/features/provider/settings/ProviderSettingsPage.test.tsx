import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProviderSettingsPage } from './ProviderSettingsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
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
  vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: PROFILE } });
});

describe('ProviderSettingsPage', () => {
  it('lists only the two genuinely-unsupported items — Change password is no longer one of them', async () => {
    renderPage();
    await screen.findByText('Sami Provider');

    expect(screen.getAllByRole('button', { name: 'Unavailable' })).toHaveLength(2);
    expect(screen.getByText('Notification preferences')).toBeInTheDocument();
    expect(screen.getByText('Delete account')).toBeInTheDocument();
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
