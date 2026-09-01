import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { AiAssistantPage } from './AiAssistantPage';

// Exercises the exact RoleRoute wrapping used for the real "/assistant"
// route in AppRoutes.tsx — the assistant page must stay reachable by every
// role, and still redirect an unauthenticated visitor like any other
// protected route.

vi.mock('@/services/apiClient', () => ({ apiClient: { post: vi.fn() } }));

let mockUser: { id: number; name: string; email: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' } | null =
  null;
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockUser !== null,
    loading: false,
    loginWithResult: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/app/providers/DirectionProvider', () => ({
  useDirection: () => ({ language: 'en', dir: 'ltr', toggleLanguage: vi.fn() }),
}));

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderAssistantRoute() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/assistant']}>
        <Routes>
          <Route
            path="/assistant"
            element={
              <RoleRoute roles={['CUSTOMER', 'PROVIDER', 'ADMIN']}>
                <AiAssistantPage />
              </RoleRoute>
            }
          />
          <Route path="/login" element={<LocationProbe />} />
          <Route path="/unauthorized" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('/assistant route access', () => {
  it.each(['CUSTOMER', 'PROVIDER', 'ADMIN'] as const)('is reachable by %s', (role) => {
    mockUser = { id: 1, name: 'User', email: 'u@example.com', role };
    renderAssistantRoute();
    expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to /login', () => {
    mockUser = null;
    renderAssistantRoute();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
