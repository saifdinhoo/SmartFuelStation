import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { OperatingHoursEditor } from './OperatingHoursEditor';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

function renderEditor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<OperatingHoursEditor />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OperatingHoursEditor', () => {
  it('renders all 7 weekdays even when none are configured yet, defaulting to closed', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });

    renderEditor();

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      await waitFor(() => expect(screen.getByText(day)).toBeInTheDocument());
    }
    // 7 "Closed" labels, one per unconfigured day.
    expect(await screen.findAllByText('Closed')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('reflects an already-configured day\'s times', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }],
      },
    });

    renderEditor();

    await waitFor(() => expect(screen.getByDisplayValue('09:00')).toBeInTheDocument());
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
  });

  it('toggling a closed day open, then saving, sends isClosed:false with the default times', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true, data: [] } });
    const user = userEvent.setup();

    renderEditor();
    await waitFor(() => expect(screen.getByText('Monday')).toBeInTheDocument());

    await user.click(screen.getByRole('switch', { name: 'Monday open' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.put).mock.calls[0];
    const monday = (body as Array<Record<string, unknown>>).find((e) => e.dayOfWeek === 'MONDAY');
    expect(monday).toMatchObject({ isClosed: false, openTime: '09:00', closeTime: '18:00' });
  });

  it('disables Save when a day\'s closing time is not after its opening time', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }],
      },
    });
    const user = userEvent.setup();

    renderEditor();
    await waitFor(() => expect(screen.getByDisplayValue('18:00')).toBeInTheDocument());

    await user.clear(screen.getByLabelText('Monday closing time'));
    await user.type(screen.getByLabelText('Monday closing time'), '08:00');

    expect(screen.getByText(/closing time must be after opening time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('forces openTime/closeTime to null for a closed day even if it previously had times', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ dayOfWeek: 'FRIDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }],
      },
    });
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true, data: [] } });
    const user = userEvent.setup();

    renderEditor();
    await waitFor(() => expect(screen.getByText('Friday')).toBeInTheDocument());

    await user.click(screen.getByRole('switch', { name: 'Friday open' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.put).mock.calls[0];
    const friday = (body as Array<Record<string, unknown>>).find((e) => e.dayOfWeek === 'FRIDAY');
    expect(friday).toEqual({ dayOfWeek: 'FRIDAY', isClosed: true, openTime: null, closeTime: null });
  });

  it('Discard changes reverts an edit without saving', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const user = userEvent.setup();

    renderEditor();
    await waitFor(() => expect(screen.getByText('Monday')).toBeInTheDocument());

    await user.click(screen.getByRole('switch', { name: 'Monday open' }));
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
