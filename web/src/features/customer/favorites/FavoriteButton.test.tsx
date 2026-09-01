import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FavoriteButton } from './FavoriteButton';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

function renderButton(providerId = 2) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FavoriteButton providerId={providerId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FavoriteButton', () => {
  it('shows an unfavorited state and POSTs /favorites when clicked on a provider not yet saved', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: 1, provider: { id: 2 } } },
    });
    const user = userEvent.setup();
    renderButton(2);

    const button = await screen.findByRole('button', { name: /add to favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/favorites', { providerId: 2 }));
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('shows a favorited state and DELETEs /favorites/:id when clicked on an already-saved provider', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1, createdAt: '2026-01-01T00:00:00.000Z', provider: { id: 2, businessName: 'Al-Nour Auto', address: 'x', isOpen: true, estimatedWaitMinutes: 0 } }],
      },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderButton(2);

    const button = await screen.findByRole('button', { name: /remove from favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/favorites/2'));
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('a different provider not in the favorites list shows unfavorited, even when others are favorited', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1, createdAt: '2026-01-01T00:00:00.000Z', provider: { id: 999, businessName: 'Other', address: 'x', isOpen: true, estimatedWaitMinutes: 0 } }],
      },
    });
    renderButton(2);

    expect(await screen.findByRole('button', { name: /add to favorites/i })).toBeInTheDocument();
  });
});
