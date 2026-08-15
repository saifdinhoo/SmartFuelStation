import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/l10n/generated/app_localizations.dart';
import '../core/widgets/loading_view.dart';
import '../features/admin/screens/admin_categories_screen.dart';
import '../features/admin/screens/admin_providers_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/auth/state/auth_state.dart';
import '../features/shell/screens/dashboard_screen.dart';
import '../features/shell/screens/home_shell.dart';
import '../features/shell/screens/unauthorized_screen.dart';

/// Route paths in one place so nothing navigates by raw string literal.
class Routes {
  const Routes._();

  static const splash = '/';
  static const login = '/login';
  static const register = '/register';
  static const dashboard = '/dashboard';
  static const categories = '/categories';
  static const adminProviders = '/admin/providers';
  static const unauthorized = '/unauthorized';
}

/// Roles allowed on a route, read by the redirect guard below.
///
/// This is the mobile counterpart of the web's `RoleRoute`. Note it is a
/// navigation guard, not a security boundary: the backend authorizes every
/// request independently, so a bypass here would still be refused by the
/// API. Its job is to keep users out of screens that would only show them
/// errors.
const _roleGuards = <String, Set<UserRole>>{
  Routes.adminProviders: {UserRole.admin},
};

GoRouter createRouter(AuthState auth) {
  return GoRouter(
    initialLocation: Routes.splash,
    // Re-evaluates `redirect` whenever the session changes, which is what
    // makes login and logout navigate on their own — no screen has to
    // remember to push or pop after an auth change.
    refreshListenable: auth,
    redirect: (context, state) {
      final location = state.matchedLocation;

      // Session still being restored from secure storage: hold on the
      // splash route rather than flashing login and then bouncing away.
      if (auth.isRestoring) {
        return location == Routes.splash ? null : Routes.splash;
      }

      final signedIn = auth.isAuthenticated;
      final onAuthScreen =
          location == Routes.login || location == Routes.register;

      if (!signedIn) {
        // Returning null when already on an auth screen is what prevents the
        // classic redirect loop.
        return onAuthScreen ? null : Routes.login;
      }

      // Signed in but sitting on splash or an auth screen — move along.
      if (onAuthScreen || location == Routes.splash) return Routes.dashboard;

      final allowed = _roleGuards[location];
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

      // The signed-in area keeps its bottom navigation across tab changes by
      // rendering them inside a shared shell.
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
