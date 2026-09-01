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
import { ProviderFinancePage } from '@/features/provider/finance/ProviderFinancePage';
import { AdminFinancePage } from '@/features/admin/finance/AdminFinancePage';
import { DiscoveryPage } from '@/features/customer/discovery/DiscoveryPage';
import { ProviderDetailsPage } from '@/features/customer/discovery/ProviderDetailsPage';
import { LiveStationPage } from '@/features/liveStation/LiveStationPage';
import { CategoriesPage } from '@/features/admin/categories/CategoriesPage';
import { AdminProvidersPage } from '@/features/admin/providers/AdminProvidersPage';
import { AdminUsersPage } from '@/features/admin/users/AdminUsersPage';
import { AdminBookingsPage } from '@/features/admin/bookings/AdminBookingsPage';
import { AdminReviewsPage } from '@/features/admin/reviews/AdminReviewsPage';
import { AdminComplaintsPage } from '@/features/admin/complaints/AdminComplaintsPage';
import { AdminAnalyticsPage } from '@/features/admin/analytics/AdminAnalyticsPage';
import { AdminSettingsPage } from '@/features/admin/settings/AdminSettingsPage';
import { AdminFuelPage } from '@/features/admin/fuel/AdminFuelPage';
import { BookingHistoryPage } from '@/features/customer/bookings/BookingHistoryPage';
import { BookingDetailsPage } from '@/features/customer/bookings/BookingDetailsPage';
import { ProviderBookingsPage } from '@/features/provider/bookings/ProviderBookingsPage';
import { ProviderBookingDetailsPage } from '@/features/provider/bookings/ProviderBookingDetailsPage';
import { BusinessProfilePage } from '@/features/provider/profile/BusinessProfilePage';
import { LiveStatusPage } from '@/features/provider/livestatus/LiveStatusPage';
import { ProviderReviewsPage } from '@/features/provider/reviews/ProviderReviewsPage';
import { ProviderSettingsPage } from '@/features/provider/settings/ProviderSettingsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { AiAssistantPage } from '@/features/ai/AiAssistantPage';
import { CustomerSettingsPage } from '@/features/customer/settings/CustomerSettingsPage';
import { MyReviewsPage } from '@/features/customer/reviews/MyReviewsPage';
import { MyComplaintsPage } from '@/features/customer/complaints/MyComplaintsPage';
import { FavoritesPage } from '@/features/customer/favorites/FavoritesPage';

// Every nav item except "Overview" (which has its own real dashboard page)
// gets a shared ComingSoonPage — the shell is done, page details are not.
// Every provider nav item now has a real page, so no ComingSoonPage stubs
// remain for this role.
const providerSubRoutes: ReturnType<typeof getNavForRole> = [];
// Every admin nav item now has a real page, so no ComingSoonPage stubs
// remain for this role either.
const adminSubRoutes: ReturnType<typeof getNavForRole> = [];
// "Find Services", "AI Assistant", "Bookings", "Favorites", "Reviews",
// "Complaints", and "Settings" have real pages; the rest of the customer
// nav is still ComingSoonPage, same convention as above.
const customerSubRoutes = getNavForRole('CUSTOMER').filter(
  (item) =>
    item.path !== '/customer/search' &&
    item.path !== '/assistant' &&
    item.path !== '/customer/bookings' &&
    item.path !== '/customer/favorites' &&
    item.path !== '/customer/reviews' &&
    item.path !== '/customer/complaints' &&
    item.path !== '/customer/settings',
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
            path="/provider/profile"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <BusinessProfilePage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/live-status"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <LiveStatusPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/reviews"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderReviewsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/settings"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderSettingsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/bookings"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderBookingsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/provider/bookings/:id"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderBookingDetailsPage />
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
          <Route
            path="/provider/finance"
            element={
              <PageTransition>
                <RoleRoute roles={['PROVIDER']}>
                  <AuthenticatedDashboardLayout>
                    <ProviderFinancePage />
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
          {(
            [
              ['/admin/categories', <CategoriesPage key="cat" />],
              ['/admin/fuel', <AdminFuelPage key="fuel" />],
              ['/admin/providers', <AdminProvidersPage key="prov" />],
              ['/admin/customers', <AdminUsersPage key="users" />],
              ['/admin/bookings', <AdminBookingsPage key="book" />],
              ['/admin/reviews', <AdminReviewsPage key="rev" />],
              ['/admin/complaints', <AdminComplaintsPage key="comp" />],
              ['/admin/analytics', <AdminAnalyticsPage key="an" />],
              ['/admin/finance', <AdminFinancePage key="fin" />],
              ['/admin/system-settings', <AdminSettingsPage key="set" />],
            ] as const
          ).map(([path, element]) => (
            <Route
              key={path}
              path={path}
              element={
                <PageTransition>
                  <RoleRoute roles={['ADMIN']}>
                    <AuthenticatedDashboardLayout>{element}</AuthenticatedDashboardLayout>
                  </RoleRoute>
                </PageTransition>
              }
            />
          ))}
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
          <Route
            path="/customer/live-station/:providerId"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <LiveStationPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/bookings"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <BookingHistoryPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/bookings/:id"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <BookingDetailsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/settings"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <CustomerSettingsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/reviews"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <MyReviewsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/favorites"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <FavoritesPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/customer/complaints"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER']}>
                  <AuthenticatedDashboardLayout>
                    <MyComplaintsPage />
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
            path="/notifications"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER', 'PROVIDER', 'ADMIN']}>
                  <AuthenticatedDashboardLayout>
                    <NotificationsPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
              </PageTransition>
            }
          />
          <Route
            path="/assistant"
            element={
              <PageTransition>
                <RoleRoute roles={['CUSTOMER', 'PROVIDER', 'ADMIN']}>
                  <AuthenticatedDashboardLayout>
                    <AiAssistantPage />
                  </AuthenticatedDashboardLayout>
                </RoleRoute>
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
