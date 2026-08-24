import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/l10n/generated/app_localizations.dart';
import '../core/widgets/loading_view.dart';
import '../features/admin/screens/admin_categories_screen.dart';
import '../features/admin/screens/admin_providers_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/auth/state/auth_state.dart';
import '../features/customer/booking/booking_details_screen.dart';
import '../features/customer/booking/bookings_screen.dart';
import '../features/customer/discovery/explore_screen.dart';
import '../features/customer/discovery/provider_details_screen.dart';
import '../features/customer/home/customer_home_screen.dart';
import '../features/customer/profile/customer_profile_screen.dart';
import '../features/customer/queue/queue_screen.dart';
import '../features/customer/shell/customer_shell.dart';
import '../features/provider/analytics/provider_analytics_screen.dart';
import '../features/provider/bookings/provider_booking_details_screen.dart';
import '../features/provider/bookings/provider_bookings_screen.dart';
import '../features/provider/livestatus/live_status_screen.dart';
import '../features/provider/more/provider_more_screen.dart';
import '../features/provider/overview/provider_overview_screen.dart';
import '../features/provider/profile/business_profile_screen.dart';
import '../features/provider/queue/provider_queue_screen.dart';
import '../features/provider/reviews/provider_reviews_screen.dart';
import '../features/provider/services/provider_services_screen.dart';
import '../features/provider/shell/provider_shell.dart';
import '../features/shell/screens/dashboard_screen.dart';
import '../features/shell/screens/home_shell.dart';
import '../features/shell/screens/unauthorized_screen.dart';

/// Route paths in one place so nothing navigates by raw string literal.
class Routes {
  const Routes._();

  static const splash = '/';
  static const login = '/login';
  static const register = '/register';
  static const unauthorized = '/unauthorized';

  // Provider/admin area (Phase 0). Customer accounts land in the customer
  // shell instead — see the redirect below.
  static const dashboard = '/dashboard';
  static const categories = '/categories';
  static const adminProviders = '/admin/providers';

  // Customer area.
  static const customerHome = '/customer/home';
  static const customerExplore = '/customer/explore';
  static const customerBookings = '/customer/bookings';
  static const customerQueue = '/customer/queue';
  static const customerProfile = '/customer/profile';

  static String customerProviderDetails(int id) => '/customer/providers/$id';
  static String customerBookingDetails(int id) => '/customer/bookings/$id';

  // Provider area.
  static const providerOverview = '/provider/overview';
  static const providerBookings = '/provider/bookings';
  static const providerQueue = '/provider/queue';
  static const providerServices = '/provider/services';
  static const providerMore = '/provider/more';
  static const providerProfile = '/provider/profile';
  static const providerLiveStatus = '/provider/live-status';
  static const providerReviews = '/provider/reviews';
  static const providerAnalytics = '/provider/analytics';

  static String providerBookingDetails(int id) => '/provider/bookings/$id';
}

/// Roles allowed on a route prefix, checked by the redirect below.
///
/// This is the mobile counterpart of the web's `RoleRoute`. It is a
/// navigation guard, not a security boundary: the backend authorizes every
/// request independently, so bypassing this would still be refused by the
/// API. Its job is to keep users out of screens that would only error.
const _roleGuards = <String, Set<UserRole>>{
  '/customer': {UserRole.customer},
  '/provider': {UserRole.provider},
  '/admin': {UserRole.admin},
  // Admin mobile still lives in the legacy shell; providers have their own
  // area now, so these stay admin-only.
  Routes.dashboard: {UserRole.admin},
  Routes.categories: {UserRole.admin},
};

Set<UserRole>? _allowedRolesFor(String location) {
  for (final entry in _roleGuards.entries) {
    if (location == entry.key || location.startsWith('${entry.key}/')) {
      return entry.value;
    }
  }
  return null;
}

/// Where a signed-in account belongs when it has no specific destination.
String _homeFor(UserRole? role) => switch (role) {
  UserRole.customer => Routes.customerHome,
  UserRole.provider => Routes.providerOverview,
  // Admin mobile is not built yet; the legacy shell is still their landing.
  UserRole.admin || null => Routes.dashboard,
};

GoRouter createRouter(AuthState auth) {
  return GoRouter(
    initialLocation: Routes.splash,
    // Re-evaluates `redirect` whenever the session changes, which is what
    // makes login and logout navigate on their own.
    refreshListenable: auth,
    redirect: (context, state) {
      final location = state.matchedLocation;

      // Session still restoring from secure storage: hold on splash rather
      // than flashing login and bouncing away.
      if (auth.isRestoring) {
        return location == Routes.splash ? null : Routes.splash;
      }

      final signedIn = auth.isAuthenticated;
      final onAuthScreen =
          location == Routes.login || location == Routes.register;

      if (!signedIn) {
        // Returning null when already on an auth screen prevents a loop.
        return onAuthScreen ? null : Routes.login;
      }

      if (onAuthScreen || location == Routes.splash) return _homeFor(auth.role);

      final allowed = _allowedRolesFor(location);
      if (allowed != null && !allowed.contains(auth.role)) {
        return Routes.unauthorized;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: Routes.splash,
        builder: (_, _) => const Scaffold(body: LoadingView()),
      ),
      GoRoute(path: Routes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (_, _) => const RegisterScreen()),
      GoRoute(
        path: Routes.unauthorized,
        builder: (_, _) => const UnauthorizedScreen(),
      ),

      // --- customer area -----------------------------------------------
      // Details routes sit outside the shell so they push full-screen with
      // a back button rather than keeping the bottom bar.
      GoRoute(
        path: '/customer/providers/:id',
        builder: (_, state) => ProviderDetailsScreen(
          providerId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/customer/bookings/:id',
        builder: (_, state) => BookingDetailsScreen(
          bookingId: int.parse(state.pathParameters['id']!),
        ),
      ),
      ShellRoute(
        builder: (_, _, child) => CustomerShell(child: child),
        routes: [
          GoRoute(
            path: Routes.customerHome,
            builder: (_, _) => const CustomerHomeScreen(),
          ),
          GoRoute(
            path: Routes.customerExplore,
            // `extra` carries a category id when arriving from a Home chip.
            builder: (_, state) =>
                ExploreScreen(initialCategoryId: state.extra as int?),
          ),
          GoRoute(
            path: Routes.customerBookings,
            builder: (_, _) => const BookingsScreen(),
          ),
          GoRoute(
            path: Routes.customerQueue,
            builder: (_, _) => const QueueScreen(),
          ),
          GoRoute(
            path: Routes.customerProfile,
            builder: (_, _) => const CustomerProfileScreen(),
          ),
        ],
      ),

      // --- provider area -------------------------------------------------
      // Detail and secondary screens sit outside the shell so they push
      // full-screen with a back button instead of keeping the bottom bar.
      GoRoute(
        path: '/provider/bookings/:id',
        builder: (_, state) => ProviderBookingDetailsScreen(
          bookingId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: Routes.providerProfile,
        builder: (_, _) => const BusinessProfileScreen(),
      ),
      GoRoute(
        path: Routes.providerLiveStatus,
        builder: (_, _) => const LiveStatusScreen(),
      ),
      GoRoute(
        path: Routes.providerReviews,
        builder: (_, _) => const ProviderReviewsScreen(),
      ),
      GoRoute(
        path: Routes.providerAnalytics,
        builder: (_, _) => const ProviderAnalyticsScreen(),
      ),
      ShellRoute(
        builder: (_, _, child) => ProviderShell(child: child),
        routes: [
          GoRoute(
            path: Routes.providerOverview,
            builder: (_, _) => const ProviderOverviewScreen(),
          ),
          GoRoute(
            path: Routes.providerBookings,
            builder: (_, _) => const ProviderBookingsScreen(),
          ),
          GoRoute(
            path: Routes.providerQueue,
            builder: (_, _) => const ProviderQueueScreen(),
          ),
          GoRoute(
            path: Routes.providerServices,
            builder: (_, _) => const ProviderServicesScreen(),
          ),
          GoRoute(
            path: Routes.providerMore,
            builder: (_, _) => const ProviderMoreScreen(),
          ),
        ],
      ),

      // --- admin area (legacy shell, pending Admin Mobile) ---------------
      ShellRoute(
        builder: (_, _, child) => HomeShell(child: child),
        routes: [
          GoRoute(
            path: Routes.dashboard,
            builder: (_, _) => const DashboardScreen(),
          ),
          GoRoute(
            path: Routes.categories,
            builder: (_, _) => const AdminCategoriesScreen(),
          ),
          GoRoute(
            path: Routes.adminProviders,
            builder: (_, _) => const AdminProvidersScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: Center(child: Text(AppLocalizations.of(context)!.notFoundTitle)),
    ),
  );
}
