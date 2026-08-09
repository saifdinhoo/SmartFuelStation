import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { ThemeProvider } from './providers/ThemeProvider';
import { DirectionProvider } from './providers/DirectionProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppRoutes } from '@/routes/AppRoutes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DirectionProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
