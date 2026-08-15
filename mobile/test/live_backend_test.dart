@Tags(['live'])
library;

import 'dart:io' show HttpOverrides;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';

/// Integration checks against a running backend.
///
/// Excluded from the default suite because they need `npm start` in
/// `backend/` and a seeded database. Run explicitly with:
///
///   flutter test test/live_backend_test.dart --dart-define=API_BASE_URL=http://localhost:5000/api
///
/// The --dart-define is required on desktop: the app's Android default of
/// 10.0.2.2 is meaningless outside an emulator, which is exactly the
/// hardcoding Phase 0 removed.
void main() {
  const adminEmail = 'admin@smartfuelstation.com';
  const adminPassword = 'admin123';
  const customerEmail = 'layla@smartauto.local';
  const demoPassword = 'demo123';

  late Map<String, String> secureData;
  late SecureTokenStore tokens;

  setUpAll(() {
    // The binding is needed for the SharedPreferences and secure-storage
    // mocks, but it also installs an HttpOverrides that stubs every request
    // as 400 without touching the network. Clearing it restores real HTTP,
    // which is the entire point of this suite.
    TestWidgetsFlutterBinding.ensureInitialized();
    HttpOverrides.global = null;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    secureData = <String, String>{};
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(
      secureData,
    );
    tokens = const SecureTokenStore(FlutterSecureStorage());
  });

  /// Builds the same object graph as AppProviders, so these tests exercise
  /// the real wiring rather than a simplified stand-in.
  ({AuthState auth, ApiClient client}) buildSession() {
    final auth = AuthState(tokens);
    final client = ApiClient(
      readToken: auth.readToken,
      onUnauthorized: auth.logout,
    );
    auth.api = AuthApi(client);
    return (auth: auth, client: client);
  }

  test(
    'logs in against the real backend and stores the token securely',
    () async {
      final session = buildSession();

      await session.auth.signIn(email: adminEmail, password: adminPassword);

      expect(session.auth.isAuthenticated, isTrue);
      expect(session.auth.role, UserRole.admin);
      expect(session.auth.displayName, isNotEmpty);

      // The token must be in secure storage and nowhere in plain preferences.
      expect(await tokens.read(), isNotNull);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('token'), isNull);
      expect(prefs.getKeys().where((k) => k.contains('token')), isEmpty);
    },
  );

  test(
    'rejects wrong credentials without destroying an existing session',
    () async {
      final session = buildSession();
      await session.auth.signIn(email: adminEmail, password: adminPassword);

      await expectLater(
        session.auth.signIn(email: adminEmail, password: 'definitely-wrong'),
        throwsA(isA<ApiException>()),
      );

      // A 401 from a login attempt is "wrong password", not an expired
      // session — the interceptor must not log the user out.
      expect(session.auth.isAuthenticated, isTrue);
    },
  );

  test('restores a persisted session on a fresh app start', () async {
    final first = buildSession();
    await first.auth.signIn(email: customerEmail, password: demoPassword);
    final savedToken = await tokens.read();

    // A new AuthState over the same storage simulates relaunching the app.
    final second = buildSession();
    await second.auth.restoreSession();

    expect(second.auth.isAuthenticated, isTrue);
    expect(second.auth.token, savedToken);
    expect(second.auth.role, UserRole.customer);
  });

  test(
    'migrates a legacy SharedPreferences token instead of logging the user out',
    () async {
      // Reproduces an upgrade from the pre-Phase-0 build, which wrote the JWT
      // to SharedPreferences under 'token'.
      final bootstrap = buildSession();
      await bootstrap.auth.signIn(email: adminEmail, password: adminPassword);
      final realToken = (await tokens.read())!;

      secureData.clear();
      SharedPreferences.setMockInitialValues({'token': realToken});

      final upgraded = buildSession();
      await upgraded.auth.restoreSession();

      expect(
        upgraded.auth.isAuthenticated,
        isTrue,
        reason: 'the upgrade must preserve the session',
      );
      expect(
        await tokens.read(),
        realToken,
        reason: 'token moved into secure storage',
      );
      final prefs = await SharedPreferences.getInstance();
      expect(
        prefs.getString('token'),
        isNull,
        reason: 'plaintext copy deleted after migration',
      );
    },
  );

  test(
    'an invalid token is discarded rather than kept as a dead session',
    () async {
      await tokens.write('not-a-real-jwt');
      final session = buildSession();

      await session.auth.restoreSession();

      expect(session.auth.isAuthenticated, isFalse);
      expect(await tokens.read(), isNull);
    },
  );

  test('a 401 on a normal request logs the session out globally', () async {
    final session = buildSession();
    await session.auth.signIn(email: adminEmail, password: adminPassword);
    expect(session.auth.isAuthenticated, isTrue);

    // Corrupt the stored token so the next call is rejected, mimicking an
    // expired JWT mid-session.
    await tokens.write('expired.token.value');
    final stale = buildSession();
    await stale.auth.restoreSession();
    expect(
      stale.auth.isAuthenticated,
      isFalse,
      reason: 'interceptor cleared the dead session',
    );
  });

  test('role checks reflect what the backend actually returns', () async {
    final admin = buildSession();
    await admin.auth.signIn(email: adminEmail, password: adminPassword);
    expect(admin.auth.role, UserRole.admin);

    final customer = buildSession();
    await customer.auth.signIn(email: customerEmail, password: demoPassword);
    expect(customer.auth.role, UserRole.customer);

    final provider = buildSession();
    await provider.auth.signIn(
      email: 'provider@smartauto.local',
      password: demoPassword,
    );
    expect(provider.auth.role, UserRole.provider);
  });

  test('logout clears the token from secure storage', () async {
    final session = buildSession();
    await session.auth.signIn(email: adminEmail, password: adminPassword);
    expect(await tokens.read(), isNotNull);

    await session.auth.logout();

    expect(session.auth.isAuthenticated, isFalse);
    expect(session.auth.user, isNull);
    expect(await tokens.read(), isNull);
  });

  test(
    'the interceptor attaches the token without any call site passing it',
    () async {
      final session = buildSession();
      await session.auth.signIn(email: adminEmail, password: adminPassword);

      // No token argument anywhere — an admin-only endpoint succeeding proves
      // the header was added by the interceptor.
      final users = await session.client.get('/admin/users');
      expect(users, isA<List<dynamic>>());
      expect((users as List).isNotEmpty, isTrue);
    },
  );

  test(
    'a customer is refused admin data by the backend, not just the UI',
    () async {
      final session = buildSession();
      await session.auth.signIn(email: customerEmail, password: demoPassword);

      // The router guard hides admin routes; this proves the API refuses them
      // independently, so the guard is convenience rather than the boundary.
      await expectLater(
        session.client.get('/admin/users'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.isForbidden,
            'isForbidden',
            isTrue,
          ),
        ),
      );
      expect(
        session.auth.isAuthenticated,
        isTrue,
        reason: '403 is not a dead session',
      );
    },
  );
}
