import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateReviewModal } from './CreateReviewModal';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateReviewModal open bookingId={4} businessName="Al-Nour Auto" onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateReviewModal', () => {
  it('disables submit until a star rating is picked', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeDisabled();
  });

  it('submits the real bookingId, chosen rating, and comment — never a fake success', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: 1, rating: 4, comment: 'Great!', provider: { id: 2, businessName: 'Al-Nour Auto' } } },
    });
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText('Comment (optional)'), 'Great!');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/reviews', {
        bookingId: 4,
        rating: 4,
        comment: 'Great!',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Review submitted', variant: 'success' }),
    );
  });

  it('omits comment entirely when left blank, rather than sending an empty string', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: 1, rating: 5, comment: null, provider: { id: 2, businessName: 'Al-Nour Auto' } } },
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/reviews', { bookingId: 4, rating: 5 }),
    );
  });

  it('shows the real backend error on failure', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'This booking has already been reviewed' } },
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'This booking has already been reviewed',
          variant: 'destructive',
        }),
      ),
    );
  });
});
