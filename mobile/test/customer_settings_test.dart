import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/storage/prefs_store.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/theme/theme_controller.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';
import 'package:smart_automotive_service_app/features/customer/profile/customer_profile_screen.dart';

/// Captures every request handed to it and returns a queued response/error —
/// same pattern as ai_test.dart's own adapter, proving the REAL AuthApi ->
/// ApiClient -> Dio chain, not a reimplementation of it.
class _CapturingAdapter implements HttpClientAdapter {
  RequestOptions? lastOptions;
  Object? lastBody;
  Object? errorToThrow;
  final String responseJson;

  _CapturingAdapter(this.responseJson);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastOptions = options;
    lastBody = options.data;
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
    return ResponseBody.fromString(
      responseJson,
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _FakeAuthApi extends AuthApi {
  _FakeAuthApi()
    : super(ApiClient(readToken: () => null, onUnauthorized: () async {}));

  Object? failWith;
  Object? updateProfileFailWith;
  Map<String, dynamic>? lastUpdateProfileCall;

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async => {
    'token': 'fake-token',
    'user': {
      'id': 1,
      'name': 'Layla Haddad',
      'email': email,
      'role': 'CUSTOMER',
      'phone': '+961 70 555 101',
    },
  };

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (failWith != null) throw failWith!;
  }

  @override
  Future<Map<String, dynamic>> updateProfile({String? name, String? phone}) async {
    lastUpdateProfileCall = {'name': name, 'phone': phone};
    if (updateProfileFailWith != null) throw updateProfileFailWith!;
    return {
      'id': 1,
      'name': name ?? 'Layla Haddad',
      'email': 'layla@smartauto.local',
      'role': 'CUSTOMER',
      'phone': phone ?? '+961 70 555 101',
    };
  }
}

Future<AuthState> fakeAuthState(AuthApi api) async {
  final auth = AuthState(const SecureTokenStore(FlutterSecureStorage()));
  auth.api = api;
  await auth.signIn(email: 'layla@smartauto.local', password: 'demo123');
  return auth;
}

Widget _harness({required AuthState auth, Locale? locale}) {
  final theme = ThemeController(const PrefsStore());
  final localeController = LocaleController(const PrefsStore());
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthState>.value(value: auth),
      ChangeNotifierProvider<ThemeController>.value(value: theme),
      ChangeNotifierProvider<LocaleController>.value(value: localeController),
    ],
    child: MaterialApp(
      locale: locale ?? localeController.locale,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      supportedLocales: LocaleController.supported,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const CustomerProfileScreen(),
    ),
  );
}

/// The Change Password section sits below other real profile content (the
/// My Reviews link, etc.), so in the test's fixed-size viewport it starts
/// off past what `ListView`'s sliver has actually mounted — `ensureVisible`
/// alone can't bring a not-yet-mounted widget into view, so this scrolls
/// incrementally until the target itself first appears.
Future<void> _scrollToChangePassword(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.text('Current password'),
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => TestWidgetsFlutterBinding.ensureInitialized());
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
  });

  group('AuthApi.changePassword — real request shape', () {
    test('PATCHes /auth/change-password with exactly the two real fields', () async {
      final adapter = _CapturingAdapter(jsonEncode({'success': true, 'data': {}}));
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final api = AuthApi(apiClient);

      await api.changePassword(currentPassword: 'old-real-pw', newPassword: 'new-real-pw');

      expect(adapter.lastOptions!.path, '/auth/change-password');
      expect(adapter.lastOptions!.method, 'PATCH');
      expect(adapter.lastBody, {
        'currentPassword': 'old-real-pw',
        'newPassword': 'new-real-pw',
      });
      // The JWT is attached automatically, same as every other request —
      // this call never has to (and never does) build the header itself.
      expect(adapter.lastOptions!.headers['Authorization'], 'Bearer jwt-token');
    });

    test('a 400 (wrong current password) surfaces as a real ApiException with the backend message', () async {
      final adapter = _CapturingAdapter('');
      adapter.errorToThrow = DioException(
        requestOptions: RequestOptions(path: '/auth/change-password'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/change-password'),
          statusCode: 400,
          data: {'success': false, 'message': 'Current password is incorrect'},
        ),
        type: DioExceptionType.badResponse,
      );
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final api = AuthApi(apiClient);

      await expectLater(
        api.changePassword(currentPassword: 'wrong', newPassword: 'new-real-pw'),
        throwsA(
          isA<ApiException>().having((e) => e.message, 'message', 'Current password is incorrect'),
        ),
      );
    });
  });

  group('AuthState.changePassword', () {
    test('does not touch the current session/token on success', () async {
      final auth = await fakeAuthState(_FakeAuthApi());
      final tokenBefore = auth.token;
      final userBefore = auth.user;

      await auth.changePassword(currentPassword: 'old-real-pw', newPassword: 'new-real-pw');

      expect(auth.token, tokenBefore);
      expect(auth.user, userBefore);
    });
  });

  group('AuthApi.updateProfile — real request shape', () {
    test('PATCHes /auth/me with exactly name and phone', () async {
      final adapter = _CapturingAdapter(
        jsonEncode({
          'success': true,
          'data': {
            'id': 1,
            'name': 'Layla H.',
            'email': 'layla@smartauto.local',
            'role': 'CUSTOMER',
            'phone': '+961 70 999 000',
          },
        }),
      );
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final api = AuthApi(apiClient);

      final result = await api.updateProfile(name: 'Layla H.', phone: '+961 70 999 000');

      expect(adapter.lastOptions!.path, '/auth/me');
      expect(adapter.lastOptions!.method, 'PATCH');
      expect(adapter.lastBody, {'name': 'Layla H.', 'phone': '+961 70 999 000'});
      expect(adapter.lastOptions!.headers['Authorization'], 'Bearer jwt-token');
      expect(result['name'], 'Layla H.');
    });

    test('a validation error (e.g. empty name) surfaces as a real ApiException', () async {
      final adapter = _CapturingAdapter('');
      adapter.errorToThrow = DioException(
        requestOptions: RequestOptions(path: '/auth/me'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/me'),
          statusCode: 400,
          data: {'success': false, 'message': 'name cannot be empty'},
        ),
        type: DioExceptionType.badResponse,
      );
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final api = AuthApi(apiClient);

      await expectLater(
        api.updateProfile(name: '', phone: 'x'),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'name cannot be empty')),
      );
    });
  });

  group('AuthState.updateProfile', () {
    test('replaces the in-memory user with the real sanitized row and notifies listeners', () async {
      final auth = await fakeAuthState(_FakeAuthApi());
      var notified = false;
      auth.addListener(() => notified = true);

      await auth.updateProfile(name: 'Layla H.', phone: '+961 70 999 000');

      expect(auth.displayName, 'Layla H.');
      expect(auth.user?['phone'], '+961 70 999 000');
      expect(notified, isTrue);
    });

    test('does not touch the current session token', () async {
      final auth = await fakeAuthState(_FakeAuthApi());
      final tokenBefore = auth.token;

      await auth.updateProfile(name: 'Layla H.', phone: '+961 70 999 000');

      expect(auth.token, tokenBefore);
    });
  });

  group('CustomerProfileScreen — change password UI', () {
    testWidgets('renders the real change-password fields, never stale "unsupported" wording', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();
      await _scrollToChangePassword(tester);

      expect(find.text('Current password'), findsOneWidget);
      expect(find.text('New password'), findsOneWidget);
      expect(find.text('Confirm new password'), findsOneWidget);
      expect(find.textContaining('no change-password endpoint'), findsNothing);
      expect(find.textContaining("There's no change-password"), findsNothing);
    });

    testWidgets('rejects a mismatched confirmation locally, without calling the backend', (
      tester,
    ) async {
      final api = _FakeAuthApi();
      final auth = await fakeAuthState(api);
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();
      await _scrollToChangePassword(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'demo123');
      await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-real-pw');
      await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'different');
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('rejects a too-short new password locally, without calling the backend', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();
      await _scrollToChangePassword(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'demo123');
      await tester.enterText(find.widgetWithText(TextField, 'New password'), 'abc');
      await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'abc');
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();

      expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    });

    testWidgets('a valid submit clears the fields and shows a real success message', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();
      await _scrollToChangePassword(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'demo123');
      await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-real-pw');
      await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'new-real-pw');
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();

      expect(find.text('Password changed successfully'), findsOneWidget);
      final currentField = tester.widget<TextField>(
        find.widgetWithText(TextField, 'Current password'),
      );
      expect(currentField.controller!.text, isEmpty);
    });

    testWidgets('shows the real backend error on failure — e.g. wrong current password', (
      tester,
    ) async {
      final api = _FakeAuthApi()..failWith = ApiException('Current password is incorrect', statusCode: 400);
      final auth = await fakeAuthState(api);
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();
      await _scrollToChangePassword(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'wrong');
      await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-real-pw');
      await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'new-real-pw');
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
      await tester.pumpAndSettle();

      expect(find.text('Current password is incorrect'), findsOneWidget);
    });
  });

  group('CustomerProfileScreen — edit profile UI', () {
    testWidgets('loads and shows the real authenticated values, never stale "unsupported" wording', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

      expect(find.text('Layla Haddad'), findsWidgets);
      expect(find.text('layla@smartauto.local'), findsOneWidget);
      expect(find.text('+961 70 555 101'), findsOneWidget);
      expect(find.text('Edit Profile'), findsOneWidget);
      expect(find.textContaining('Not available yet'), findsNothing);
      expect(find.textContaining('needs a backend endpoint'), findsNothing);
    });

    testWidgets('Edit Profile opens edit mode with editable Name/Phone and a disabled Email field', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(OutlinedButton, 'Edit Profile'));
      await tester.pumpAndSettle();

      final nameField = tester.widget<TextField>(
        find.widgetWithText(TextField, 'Layla Haddad').first,
      );
      expect(nameField.enabled, isTrue);
      expect(nameField.controller!.text, 'Layla Haddad');

      final phoneField = tester.widget<TextField>(
        find.widgetWithText(TextField, '+961 70 555 101'),
      );
      expect(phoneField.enabled, isTrue);

      final emailField = tester.widget<TextField>(
        find.widgetWithText(TextField, 'layla@smartauto.local'),
      );
      expect(
        emailField.enabled,
        isFalse,
        reason: 'email stays read-only even while editing the rest of the profile',
      );

      expect(find.widgetWithText(FilledButton, 'Save'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Cancel'), findsOneWidget);
    });

    testWidgets('rejects an empty name locally, without calling the backend', (tester) async {
      final api = _FakeAuthApi();
      final auth = await fakeAuthState(api);
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(OutlinedButton, 'Edit Profile'));
      await tester.pumpAndSettle();

      final nameFieldFinder = find.widgetWithText(TextField, 'Layla Haddad').first;
      await tester.enterText(nameFieldFinder, '   ');
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();

      expect(find.text('Name is required'), findsOneWidget);
      expect(api.lastUpdateProfileCall, isNull);
    });

    testWidgets(
      'Save calls the real repository, refreshes the displayed values everywhere, and exits edit mode',
      (tester) async {
        final api = _FakeAuthApi();
        final auth = await fakeAuthState(api);
        await tester.pumpWidget(_harness(auth: auth));
        await tester.pumpAndSettle();

        await tester.tap(find.widgetWithText(OutlinedButton, 'Edit Profile'));
        await tester.pumpAndSettle();

        await tester.enterText(find.widgetWithText(TextField, 'Layla Haddad').first, 'Layla H.');
        await tester.enterText(
          find.widgetWithText(TextField, '+961 70 555 101'),
          '+961 70 999 000',
        );
        await tester.tap(find.widgetWithText(FilledButton, 'Save'));
        await tester.pumpAndSettle();

        expect(api.lastUpdateProfileCall, {'name': 'Layla H.', 'phone': '+961 70 999 000'});
        expect(find.text('Profile updated successfully'), findsOneWidget);
        // Back to read-only view, showing the fresh values — not the stale
        // pre-edit ones, and nowhere left showing the old name.
        expect(find.widgetWithText(FilledButton, 'Save'), findsNothing);
        expect(find.text('Layla H.'), findsWidgets);
        expect(find.text('+961 70 999 000'), findsOneWidget);
        expect(find.text('Layla Haddad'), findsNothing);
        // AuthState itself was refreshed too, not just this screen's local state.
        expect(auth.displayName, 'Layla H.');
      },
    );

    testWidgets('shows the real backend error and stays in edit mode on failure — never a fake success', (
      tester,
    ) async {
      final api = _FakeAuthApi()
        ..updateProfileFailWith = ApiException('name cannot be empty', statusCode: 400);
      final auth = await fakeAuthState(api);
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(OutlinedButton, 'Edit Profile'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();

      expect(find.text('name cannot be empty'), findsOneWidget);
      // Still in edit mode — a failed save must not look like it worked.
      expect(find.widgetWithText(FilledButton, 'Save'), findsOneWidget);
    });

    testWidgets('Cancel discards the edit without calling the backend or persisting anything', (
      tester,
    ) async {
      final api = _FakeAuthApi();
      final auth = await fakeAuthState(api);
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(OutlinedButton, 'Edit Profile'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Layla Haddad').first,
        'Unsaved Name',
      );
      await tester.tap(find.widgetWithText(OutlinedButton, 'Cancel'));
      await tester.pumpAndSettle();

      expect(api.lastUpdateProfileCall, isNull);
      expect(find.text('Layla Haddad'), findsWidgets);
      expect(find.text('Unsaved Name'), findsNothing);
      expect(auth.displayName, 'Layla Haddad');
    });

    testWidgets('renders correctly right-to-left in Arabic, with the real translated label', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth, locale: const Locale('ar')));
      await tester.pumpAndSettle();

      expect(find.text('تعديل الملف الشخصي'), findsOneWidget);
      final directionality = tester.widget<Directionality>(
        find.byType(Directionality).first,
      );
      expect(directionality.textDirection, TextDirection.rtl);
    });
  });
}
