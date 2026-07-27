import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/layouts/MainLayout';
import { PageTransition } from '@/layouts/PageTransition';
import { Home } from '@/pages/Home';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DesignSystemPreview } from '@/pages/DesignSystemPreview';
import { ComponentShowcase } from '@/pages/ComponentShowcase';

export function AppRoutes() {
  const location = useLocation();

  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Home />
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            }
          />
          <Route
            path="/register"
            element={
              <PageTransition>
                <RegisterPage />
              </PageTransition>
            }
          />
          <Route
            path="/design-system"
            element={
              <PageTransition>
                <DesignSystemPreview />
              </PageTransition>
            }
          />
          <Route
            path="/components"
            element={
              <PageTransition>
                <ComponentShowcase />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </MainLayout>
  );
}
