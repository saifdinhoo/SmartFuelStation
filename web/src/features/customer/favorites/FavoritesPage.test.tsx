import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FavoritesPage } from './FavoritesPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FavoritesPage', () => {
  it('shows a real empty state — never a fake favorite', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderPage();

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
  });

  it('renders real favorites from GET /favorites/me', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            provider: {
              id: 2,
              businessName: 'Al-Nour Auto',
              address: '12 Nile St',
              isOpen: true,
              estimatedWaitMinutes: 10,
            },
          },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText('Al-Nour Auto')).toBeInTheDocument();
    expect(screen.getByText('12 Nile St')).toBeInTheDocument();
    expect(screen.getByText('Open now')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/favorites/me');
  });

  it('removing a favorite calls DELETE /favorites/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            provider: {
              id: 2,
              businessName: 'Al-Nour Auto',
              address: '12 Nile St',
              isOpen: true,
              estimatedWaitMinutes: 10,
            },
          },
        ],
      },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /remove from favorites/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/favorites/2'));
  });

  it('navigates to the provider details page on "View details"', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            provider: {
              id: 2,
              businessName: 'Al-Nour Auto',
              address: '12 Nile St',
              isOpen: true,
              estimatedWaitMinutes: 10,
            },
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'View details' }));

    expect(navigate).toHaveBeenCalledWith('/customer/providers/2');
  });
});
