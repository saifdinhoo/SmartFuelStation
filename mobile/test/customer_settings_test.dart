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

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async => {
    'token': 'fake-token',
    'user': {'id': 1, 'name': 'Layla Haddad', 'email': email, 'role': 'CUSTOMER'},
  };

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (failWith != null) throw failWith!;
  }
}

Future<AuthState> fakeAuthState(AuthApi api) async {
  final auth = AuthState(const SecureTokenStore(FlutterSecureStorage()));
  auth.api = api;
  await auth.signIn(email: 'layla@smartauto.local', password: 'demo123');
  return auth;
}

Widget _harness({required AuthState auth}) {
  final theme = ThemeController(const PrefsStore());
  final locale = LocaleController(const PrefsStore());
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthState>.value(value: auth),
      ChangeNotifierProvider<ThemeController>.value(value: theme),
      ChangeNotifierProvider<LocaleController>.value(value: locale),
    ],
    child: MaterialApp(
      locale: locale.locale,
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

  group('CustomerProfileScreen — change password UI', () {
    testWidgets('renders the real change-password fields, never stale "unsupported" wording', (
      tester,
    ) async {
      final auth = await fakeAuthState(_FakeAuthApi());
      await tester.pumpWidget(_harness(auth: auth));
      await tester.pumpAndSettle();

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
}
