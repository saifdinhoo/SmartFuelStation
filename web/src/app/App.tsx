import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { ThemeProvider } from './providers/ThemeProvider';
import { DirectionProvider } from './providers/DirectionProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRoutes } from '@/routes/AppRoutes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DirectionProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
