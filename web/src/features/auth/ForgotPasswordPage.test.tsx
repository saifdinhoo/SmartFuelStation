import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('posts the real email to /auth/forgot-password and shows the generic confirmation', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { message: 'ok' } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      }),
    );
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
  });

  it('shows the same generic confirmation for an email that is not registered — never reveals it', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { message: 'ok' } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
  });

  it('shows a real error and does not claim success when the request fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Too many requests' } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });
});
