import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyComplaintsPage } from './MyComplaintsPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

const PROVIDERS = [
  { id: 2, businessName: 'Al-Nour Auto', services: [], _count: { reviews: 0, queueEntries: 0 } },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyComplaintsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MyComplaintsPage', () => {
  it('shows a real empty state — never a fake complaint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    renderPage();

    expect(await screen.findByText('No complaints filed')).toBeInTheDocument();
  });

  it('renders real complaints from GET /complaints/me, with status and severity', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 1,
            subject: 'Rude staff',
            details: 'Waited an hour with no update.',
            severity: 'HIGH',
            status: 'OPEN',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            resolvedAt: null,
            provider: { id: 2, businessName: 'Al-Nour Auto' },
          },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText('Rude staff')).toBeInTheDocument();
    expect(screen.getByText('Al-Nour Auto')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/complaints/me');
  });

  it('submits a real complaint with the chosen provider/subject/severity — customerId is never sent from the client', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/complaints/me') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/providers') return Promise.resolve({ data: { success: true, data: PROVIDERS } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    }) as never);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 1,
          subject: 'Rude staff',
          details: null,
          severity: 'MEDIUM',
          status: 'OPEN',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          resolvedAt: null,
          provider: { id: 2, businessName: 'Al-Nour Auto' },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /file a complaint/i }));
    await user.selectOptions(await screen.findByLabelText('Business'), '2');
    await user.type(screen.getByLabelText('Subject'), 'Rude staff');
    await user.click(screen.getByRole('button', { name: /^submit complaint$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/complaints', {
        providerId: 2,
        subject: 'Rude staff',
        details: undefined,
        severity: 'MEDIUM',
      }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Complaint submitted', variant: 'success' }),
    );
  });

  it('disables submit until a business and subject are both filled in', async () => {
    vi.mocked(apiClient.get).mockImplementation(((url: string) => {
      if (url === '/complaints/me') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/providers') return Promise.resolve({ data: { success: true, data: PROVIDERS } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    }) as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /file a complaint/i }));
    expect(screen.getByRole('button', { name: /^submit complaint$/i })).toBeDisabled();
  });
});
