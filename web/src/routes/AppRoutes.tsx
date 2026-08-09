import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/layouts/MainLayout';
import { PageTransition } from '@/layouts/PageTransition';
import { Home } from '@/pages/Home';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProviderDashboardPage } from '@/features/provider/DashboardPage';
import { AdminDashboardPage } from '@/features/admin/DashboardPage';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { AuthenticatedDashboardLayout } from '@/components/dashboard/AuthenticatedDashboardLayout';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';
import { getNavForRole } from '@/features/dashboard/navigation';
import { DesignSystemPreview } from '@/pages/DesignSystemPreview';
import { ComponentShowcase } from '@/pages/ComponentShowcase';
import { DashboardShellPreview } from '@/pages/DashboardShellPreview';
import { ServicesPage } from '@/features/provider/services/ServicesPage';
import { QueuePage } from '@/features/provider/queue/QueuePage';
import { AnalyticsPage } from '@/features/provider/analytics/AnalyticsPage';
import { DiscoveryPage } from '@/features/customer/discovery/DiscoveryPage';
import { ProviderDetailsPage } from '@/features/customer/discovery/ProviderDetailsPage';

// Every nav item except "Overview" (which has its own real dashboard page)
// gets a shared ComingSoonPage — the shell is done, page details are not.
// "Services", "Queue", and "Analytics" now have real pages too, so they're excluded.
const providerSubRoutes = getNavForRole('PROVIDER')
  .slice(1)
  .filter(
    (item) =>
      item.path !== '/provider/services' &&
      item.path !== '/provider/queue' &&
      item.path !== '/provider/analytics',
  );
const adminSubRoutes = getNavForRole('ADMIN').slice(1);
// "Find Services" (the customer's landing page) has a real page; the rest
// of the customer nav is still ComingSoonPage, same convention as above.
const customerSubRoutes = getNavForRole('CUSTOMER').filter(
  (item) => item.path !== '/customer/search',
);

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
            path="/forgot-password"
            element={
              <PageTransition>
                <ForgotPasswordPage />
              </PageTransition>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PageTransition>
                <ResetPasswordPage />
              </PageTransition>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <PageTransition>
                <UnauthorizedPage />
              </PageTransition>
            }
          />
          <Route
            path="/provider/dashboard"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <ProviderDashboardPage />
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/services"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ServicesPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/queue"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <QueuePage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/analytics"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <AnalyticsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          {providerSubRoutes.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={
                <PageTransition>
                  <RoleRoute roles={['PROVIDER']}>
                    <AuthenticatedDashboardLayout>
                      <ComingSoonPage />
                    </AuthenticatedDashboardLayout>
                  </RoleRoute>
                </PageTransition>
              }
            />
          ))}
          <Route
            path="/admin/dashboard"
            element={
              <PageTransition>
                <RoleRoute roles={['ADMIN']}>
                  <AdminDashboardPage />
                </RoleRoute>
              </PageTransition>
            }
          />
          {adminSubRoutes.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={
                <PageTransition>
                  <RoleRoute roles={['ADMIN']}>
                    <AuthenticatedDashboardLayout>
                      <ComingSoonPage />
                    </AuthenticatedDashboardLayout>
                  </RoleRoute>
                </PageTransition>
              }
            />
          ))}
          <Route
            path="/customer/search"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <DiscoveryPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/providers/:id"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderDetailsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          {customerSubRoutes.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={
                <PageTransition>
                  <RoleRoute roles={['CUSTOMER']}>
                    <AuthenticatedDashboardLayout>
                      <ComingSoonPage />
                    </AuthenticatedDashboardLayout>
                  </RoleRoute>
                </PageTransition>
              }
            />
          ))}
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
          <Route
            path="/dashboard-preview"
            element={
              <PageTransition>
                <DashboardShellPreview />
              </PageTransition>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFoundPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </MainLayout>
  );
}
