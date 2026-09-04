import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminAuditLogPage } from './AdminAuditLogPage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAuditLogPage />
    </QueryClientProvider>,
  );
}

function entry(overrides = {}) {
  return {
    id: 1,
    action: 'PROVIDER_APPROVED',
    entityType: 'Provider',
    entityId: 2,
    metadata: { businessName: 'Cedars Auto Care' },
    createdAt: '2026-09-04T12:00:00.000Z',
    admin: { id: 1, name: 'Platform Admin', email: 'admin@smartfuelstation.com' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminAuditLogPage', () => {
  it('loads and renders real audit entries', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: { items: [entry()], page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderPage();

    expect(await screen.findByText(/Cedars Auto Care/)).toBeInTheDocument();
    // "Provider approved" also appears as an option label in the action
    // filter <select>, so it legitimately matches twice once the card loads.
    expect(screen.getAllByText('Provider approved').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Platform Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Provider #2/)).toBeInTheDocument();
  });

  it('requests the first page with no filter by default', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderPage();

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/admin/audit-log', {
        params: { page: 1, pageSize: 20, action: undefined, entityType: undefined },
      }),
    );
  });

  it('shows an empty state when there are no entries yet', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderPage();

    expect(await screen.findByText('No audit entries')).toBeInTheDocument();
  });

  it('changing the action filter re-queries with that action and resets to page 1', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { items: [entry()], page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/Cedars Auto Care/);
    await user.selectOptions(screen.getByLabelText('Filter by action'), 'CATEGORY_DELETED');

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/admin/audit-log', {
        params: { page: 1, pageSize: 20, action: 'CATEGORY_DELETED', entityType: undefined },
      }),
    );
  });

  it('paginates to the next page', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: { items: [entry()], page: 1, pageSize: 20, total: 40, totalPages: 2 },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/Cedars Auto Care/);
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/admin/audit-log', {
        params: { page: 2, pageSize: 20, action: undefined, entityType: undefined },
      }),
    );
  });

  it('shows an error state with a working retry on failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Forbidden' } },
    });
    renderPage();

    expect(await screen.findByText('Could not load the audit log')).toBeInTheDocument();
  });
});
