import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/app/router.dart';
import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/storage/prefs_store.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/theme/theme_controller.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';

/// A signed-out AuthState, restored (isRestoring: false) against an empty
/// secure store — the real state the router's redirect sees for a logged-
/// out visitor. Real restoreSession() (not a shortcut) is what exercises
/// the actual redirect logic this test is verifying.
Future<AuthState> signedOutAuthState() async {
  SharedPreferences.setMockInitialValues({});
  FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});

  final apiClient = ApiClient(readToken: () => null, onUnauthorized: () async {});
  final auth = AuthState(const SecureTokenStore(FlutterSecureStorage()));
  auth.api = AuthApi(apiClient);
  await auth.restoreSession();
  return auth;
}

/// Mirrors app.dart's real provider tree — the login screen's AppBar
/// includes SettingsMenu, which needs both ThemeController and
/// LocaleController regardless of which route the test cares about.
Widget harness({required AuthState auth}) {
  final theme = ThemeController(const PrefsStore());
  final locale = LocaleController(const PrefsStore());
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthState>.value(value: auth),
      ChangeNotifierProvider<ThemeController>.value(value: theme),
      ChangeNotifierProvider<LocaleController>.value(value: locale),
    ],
    child: MaterialApp.router(
      routerConfig: createRouter(auth),
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: theme.mode,
      locale: locale.locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en'), Locale('ar')],
    ),
  );
}

void main() {
  testWidgets(
    'tapping Forgot Password on the login screen opens the Forgot Password screen and stays there',
    (tester) async {
      final auth = await signedOutAuthState();
      expect(auth.isAuthenticated, isFalse);

      await tester.pumpWidget(harness(auth: auth));
      await tester.pumpAndSettle();

      // Confirms the router actually starts on /login for a signed-out
      // visitor before the tap, so the assertion after it means something.
      expect(find.text('Forgot password?'), findsOneWidget);

      await tester.tap(find.text('Forgot password?'));
      await tester.pumpAndSettle();

      // Previously the router's redirect treated /forgot-password as an
      // unrecognized location for a signed-out visitor and bounced straight
      // back to /login — the button looked like it did nothing.
      // "Forgot your password?" legitimately appears twice at once (the
      // AppBar title and the body headline share the same l10n string),
      // so findsWidgets (at least one) is the right check, not findsOneWidget.
      expect(find.text('Forgot your password?'), findsWidgets);
      expect(find.text('Send reset link'), findsOneWidget);

      // Settles again after the tap resolved — confirms the router isn't
      // about to bounce back to /login on a later redirect re-evaluation
      // (e.g. triggered by AuthState's own notifyListeners as
      // refreshListenable), not just immediately after the tap.
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();
      expect(find.text('Send reset link'), findsOneWidget);
    },
  );
}
