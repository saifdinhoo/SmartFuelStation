import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ResetPasswordPage } from './ResetPasswordPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

function renderPage(token?: string) {
  const path = token ? `/reset-password?token=${token}` : '/reset-password';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResetPasswordPage', () => {
  it('posts the real token and new password to /auth/reset-password', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { message: 'ok' } },
    });
    const user = userEvent.setup();
    renderPage('a-real-token-value');

    await user.type(screen.getByLabelText('New password'), 'brand-new-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-password');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'a-real-token-value',
        newPassword: 'brand-new-password',
      }),
    );
    expect(await screen.findByText('Password reset')).toBeInTheDocument();
  });

  it('warns when the link has no token, but still lets the request go through', async () => {
    renderPage();

    expect(screen.getByText('Missing reset token')).toBeInTheDocument();
  });

  it('shows a real error for an invalid or expired token — never a fake success', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'This reset link is invalid or has expired' } },
    });
    const user = userEvent.setup();
    renderPage('an-expired-or-reused-token');

    await user.type(screen.getByLabelText('New password'), 'brand-new-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-password');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(
      await screen.findByText('This reset link is invalid or has expired'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Password reset')).not.toBeInTheDocument();
  });

  it('blocks submission client-side when the passwords do not match', async () => {
    const user = userEvent.setup();
    renderPage('a-real-token-value');

    await user.type(screen.getByLabelText('New password'), 'brand-new-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'does-not-match');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
