import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AiAssistantPage } from './AiAssistantPage';
import { apiClient } from '@/services/apiClient';
import type { AiChatResponse } from './types';

vi.mock('@/services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

let mockUser: { id: number; name: string; email: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' } = {
  id: 1,
  name: 'Test User',
  email: 't@example.com',
  role: 'CUSTOMER',
};
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    loginWithResult: vi.fn(),
    logout: vi.fn(),
  }),
}));

let mockLanguage: 'en' | 'ar' = 'en';
vi.mock('@/app/providers/DirectionProvider', () => ({
  useDirection: () => ({
    language: mockLanguage,
    dir: mockLanguage === 'ar' ? 'rtl' : 'ltr',
    toggleLanguage: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/assistant']}>
        <Routes>
          <Route path="/assistant" element={<AiAssistantPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function supportResponse(overrides: Partial<AiChatResponse> = {}): AiChatResponse {
  return {
    reply: 'Sure, here is how it works.',
    mode: 'SUPPORT',
    suggestedAction: null,
    suggestedCategoryId: null,
    diagnosis: null,
    ...overrides,
  };
}

function diagnosisResponse(overrides: Partial<AiChatResponse> = {}): AiChatResponse {
  return {
    reply: 'This could be a brake issue.',
    mode: 'DIAGNOSIS',
    suggestedAction: 'FIND_PROVIDER',
    suggestedCategoryId: 5,
    diagnosis: {
      urgency: 'MEDIUM',
      possibleCauses: [
        { name: 'Worn brake pads', likelihood: 'LIKELY', explanation: 'A common cause of this symptom.' },
      ],
      recommendedServiceCategory: 'Brake Inspection',
      safetyAdvice: null,
      followUpQuestion: null,
    },
    ...overrides,
  };
}

function mockPostResolved(response: AiChatResponse) {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: response } });
}

async function submit(text: string) {
  const user = userEvent.setup();
  const textbox = screen.getByPlaceholderText('Type your message…');
  await user.type(textbox, text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 1, name: 'Test User', email: 't@example.com', role: 'CUSTOMER' };
  mockLanguage = 'en';
});

describe('AiAssistantPage', () => {
  it('renders the page title, description, and a welcome message', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
    expect(screen.getByText(/Ask how the platform works/)).toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm your platform assistant/)).toBeInTheDocument();
  });

  it('defaults to AUTO mode', () => {
    renderPage();
    expect(screen.getByRole('radio', { name: /Auto/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches to SUPPORT and DIAGNOSIS mode on click', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('radio', { name: /Platform Support/ }));
    expect(screen.getByRole('radio', { name: /Platform Support/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(screen.getByRole('radio', { name: /Vehicle Diagnosis/ }));
    expect(screen.getByRole('radio', { name: /Vehicle Diagnosis/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('submits a SUPPORT message and renders the reply', async () => {
    mockPostResolved(supportResponse({ reply: 'You can cancel from Bookings.' }));
    renderPage();

    await submit('How do I cancel my booking?');

    await waitFor(() => expect(screen.getByText('You can cancel from Bookings.')).toBeInTheDocument());
    expect(screen.getByText('How do I cancel my booking?')).toBeInTheDocument();

    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).not.toHaveProperty('role');
  });

  it('submits a DIAGNOSIS message and renders a structured diagnosis card, not raw JSON', async () => {
    mockPostResolved(diagnosisResponse());
    renderPage();

    await submit('My brakes are grinding.');

    await waitFor(() => expect(screen.getByText('Preliminary Diagnosis')).toBeInTheDocument());
    expect(screen.queryByText(/"urgency":/)).not.toBeInTheDocument();
    expect(screen.getByText('Worn brake pads')).toBeInTheDocument();
    expect(screen.getByText('Likely')).toBeInTheDocument();
    expect(screen.getByText('A common cause of this symptom.')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText(/Brake Inspection/)).toBeInTheDocument();
  });

  it('shows safety advice and a follow-up question card when present', async () => {
    mockPostResolved(
      diagnosisResponse({
        suggestedAction: 'NONE',
        suggestedCategoryId: null,
        diagnosis: {
          urgency: 'LOW',
          possibleCauses: [],
          recommendedServiceCategory: null,
          safetyAdvice: 'Keep an eye on the tire pressure warning light.',
          followUpQuestion: 'When does the noise happen — braking, turning, or idling?',
        },
      }),
    );
    renderPage();

    await submit('My car makes a weird sound.');

    await waitFor(() =>
      expect(screen.getByText('Keep an eye on the tire pressure warning light.')).toBeInTheDocument(),
    );
    expect(screen.getByText('I need a little more information.')).toBeInTheDocument();
    expect(
      screen.getByText('When does the noise happen — braking, turning, or idling?'),
    ).toBeInTheDocument();
  });

  it('shows a loading indicator and disables Send while a request is pending', async () => {
    let resolvePost: (value: unknown) => void = () => {};
    vi.mocked(apiClient.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Type your message…'), 'hi');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByText('Thinking…')).toBeInTheDocument();

    resolvePost({ data: { success: true, data: supportResponse() } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled());
    // Disabled again afterward only because the draft is now empty, not pending.
    await waitFor(() => expect(screen.queryByText('Thinking…')).not.toBeInTheDocument());
  });

  it('shows a friendly error with retry on backend failure, and clears it on success', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network down'));
    mockPostResolved(supportResponse());
    const user = userEvent.setup();
    renderPage();

    await submit('hi');

    await waitFor(() =>
      expect(
        screen.getByText('AI Assistant is temporarily unavailable. Please try again.'),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(
        screen.queryByText('AI Assistant is temporarily unavailable. Please try again.'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Sure, here is how it works.')).toBeInTheDocument();
  });

  it('Clear conversation resets back to the welcome message', async () => {
    mockPostResolved(supportResponse());
    const user = userEvent.setup();
    renderPage();

    await submit('hi');
    await waitFor(() => expect(screen.getByText('Sure, here is how it works.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Clear conversation/ }));

    expect(screen.queryByText('Sure, here is how it works.')).not.toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm your platform assistant/)).toBeInTheDocument();
  });

  it('navigates to discovery with the real suggestedCategoryId when FIND_PROVIDER is suggested (CUSTOMER)', async () => {
    mockPostResolved(diagnosisResponse({ suggestedCategoryId: 5 }));
    const user = userEvent.setup();
    renderPage();

    await submit('My brakes are grinding.');
    await waitFor(() => expect(screen.getByText('Preliminary Diagnosis')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Find Suitable Providers' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/customer/search?categoryId=5');
  });

  it('does not show the FIND_PROVIDER CTA for a PROVIDER or ADMIN role', async () => {
    mockUser = { id: 2, name: 'Prov', email: 'p@example.com', role: 'PROVIDER' };
    mockPostResolved(diagnosisResponse());
    renderPage();

    await submit('My brakes are grinding.');
    await waitFor(() => expect(screen.getByText('Preliminary Diagnosis')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Find Suitable Providers' })).not.toBeInTheDocument();
  });

  it('SEEK_IMMEDIATE_HELP shows safety-first messaging, not a primary booking CTA', async () => {
    mockPostResolved(
      diagnosisResponse({
        suggestedAction: 'SEEK_IMMEDIATE_HELP',
        suggestedCategoryId: null,
        diagnosis: {
          urgency: 'EMERGENCY',
          possibleCauses: [
            { name: 'Fuel leak', likelihood: 'LIKELY', explanation: 'Strong fuel smell reported.' },
          ],
          recommendedServiceCategory: null,
          safetyAdvice: 'Stop driving now and move away from the vehicle.',
          followUpQuestion: null,
        },
      }),
    );
    renderPage();

    await submit('I smell fuel and see a leak under my car.');

    await waitFor(() => expect(screen.getByText('Seek immediate help')).toBeInTheDocument());
    expect(screen.getByText('Stop driving now and move away from the vehicle.')).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find Suitable Providers' })).not.toBeInTheDocument();
    // Secondary, non-primary option only.
    expect(screen.getByRole('button', { name: 'Find nearby service providers' })).toBeInTheDocument();
  });

  it('sends locale "ar" and renders Arabic labels without breaking when the page language is Arabic', async () => {
    mockLanguage = 'ar';
    mockPostResolved(supportResponse());
    renderPage();

    expect(screen.getByRole('heading', { name: 'المساعد الذكي' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'مرحبا');
    await user.click(screen.getByRole('button', { name: 'إرسال' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).toMatchObject({ locale: 'ar' });
  });

  it('never sends a role field from the client, regardless of the authenticated role', async () => {
    mockUser = { id: 3, name: 'Admin', email: 'a@example.com', role: 'ADMIN' };
    mockPostResolved(supportResponse());
    renderPage();

    await submit('hi');

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(Object.keys(body as object).sort()).toEqual(['conversation', 'locale', 'message', 'mode']);
  });

  it('Enter sends the message; Shift+Enter inserts a newline instead', async () => {
    mockPostResolved(supportResponse());
    const user = userEvent.setup();
    renderPage();

    const textbox = screen.getByPlaceholderText('Type your message…');
    await user.type(textbox, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(textbox).toHaveValue('line one\nline two');

    await user.type(textbox, '{Enter}');
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
  });
});

describe('AiAssistantPage inside a right-to-left tree', () => {
  it('renders without error under a dir="rtl" ancestor', async () => {
    mockLanguage = 'ar';
    mockPostResolved(diagnosisResponse());
    const { container } = render(
      <div dir="rtl">
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/assistant']}>
            <Routes>
              <Route path="/assistant" element={<AiAssistantPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </div>,
    );

    expect(within(container).getByRole('heading', { name: 'المساعد الذكي' })).toBeInTheDocument();
  });
});
