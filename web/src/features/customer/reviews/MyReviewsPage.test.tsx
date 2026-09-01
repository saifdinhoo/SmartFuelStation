import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyReviewsPage } from './MyReviewsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyReviewsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MyReviewsPage', () => {
  it('shows a real empty state — never a fake review', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderPage();

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('renders real reviews from GET /reviews/me, newest data as-is from the backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            bookingId: 4,
            rating: 4,
            comment: 'Quick and professional.',
            createdAt: '2026-01-01T00:00:00.000Z',
            provider: { id: 2, businessName: 'Al-Nour Auto' },
          },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText('Al-Nour Auto')).toBeInTheDocument();
    expect(screen.getByText('Quick and professional.')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/reviews/me');
  });

  it('deletes a review only after confirming, then refetches', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            bookingId: 4,
            rating: 4,
            comment: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            provider: { id: 2, businessName: 'Al-Nour Auto' },
          },
        ],
      },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Al-Nour Auto');
    await user.click(screen.getByRole('button', { name: /delete review/i }));
    expect(apiClient.delete).not.toHaveBeenCalled();

    // Two "Delete review" buttons now exist: the row's trigger and the
    // confirm dialog's own confirm button (which restates the action, same
    // convention as BookingDetailsPage's cancel-booking confirm dialog).
    const deleteButtons = await screen.findAllByRole('button', { name: /delete review/i });
    await user.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/reviews/1'));
  });
});
