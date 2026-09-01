import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/screens/forgot_password_screen.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';

/// Real ApiClient -> Dio chain with only the transport swapped — proves the
/// exact request shape, same pattern as ai_test.dart/customer_settings_test.dart.
class _CapturingAdapter implements HttpClientAdapter {
  RequestOptions? lastOptions;
  Object? lastBody;
  Object? errorToThrow;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastOptions = options;
    lastBody = options.data;
    if (errorToThrow != null) throw errorToThrow!;
    return ResponseBody.fromString(
      jsonEncode({
        'success': true,
        'data': {'message': 'If an account exists for that email, a reset link has been sent.'},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// No sign-in happens anywhere in this flow, so [SecureTokenStore] is never
/// touched — its constructor is inert until read()/write() are actually
/// invoked (see ai_test.dart's fakeAuthState doc comment).
AuthState buildAuthState(_CapturingAdapter adapter) {
  final apiClient = ApiClient(readToken: () => null, onUnauthorized: () async {});
  apiClient.raw.httpClientAdapter = adapter;
  final auth = AuthState(const SecureTokenStore(FlutterSecureStorage()));
  auth.api = AuthApi(apiClient);
  return auth;
}

Widget harness({required Widget child, required AuthState auth}) {
  return ChangeNotifierProvider<AuthState>.value(
    value: auth,
    child: MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en'), Locale('ar')],
      home: child,
    ),
  );
}

void main() {
  testWidgets('POSTs the real email to /auth/forgot-password and shows the generic confirmation', (
    tester,
  ) async {
    final adapter = _CapturingAdapter();
    final auth = buildAuthState(adapter);

    await tester.pumpWidget(harness(child: const ForgotPasswordScreen(), auth: auth));
    await tester.enterText(find.byType(TextField), 'user@example.com');
    await tester.tap(find.widgetWithText(FilledButton, 'Send reset link'));
    await tester.pumpAndSettle();

    expect(adapter.lastOptions!.path, '/auth/forgot-password');
    expect(adapter.lastOptions!.method, 'POST');
    expect(adapter.lastBody, {'email': 'user@example.com'});
    expect(find.text('Check your email'), findsOneWidget);
  });

  testWidgets('shows the same generic confirmation for an email that is not registered', (
    tester,
  ) async {
    final adapter = _CapturingAdapter();
    final auth = buildAuthState(adapter);

    await tester.pumpWidget(harness(child: const ForgotPasswordScreen(), auth: auth));
    await tester.enterText(find.byType(TextField), 'nobody@example.com');
    await tester.tap(find.widgetWithText(FilledButton, 'Send reset link'));
    await tester.pumpAndSettle();

    expect(find.text('Check your email'), findsOneWidget);
  });

  testWidgets('shows a real error and does not claim success when the request fails', (
    tester,
  ) async {
    final adapter = _CapturingAdapter()
      ..errorToThrow = DioException(
        requestOptions: RequestOptions(path: '/auth/forgot-password'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/forgot-password'),
          statusCode: 429,
          data: {'success': false, 'message': 'Too many requests'},
        ),
        type: DioExceptionType.badResponse,
      );
    final auth = buildAuthState(adapter);

    await tester.pumpWidget(harness(child: const ForgotPasswordScreen(), auth: auth));
    await tester.enterText(find.byType(TextField), 'user@example.com');
    await tester.tap(find.widgetWithText(FilledButton, 'Send reset link'));
    await tester.pumpAndSettle();

    expect(find.text('Too many requests'), findsOneWidget);
    expect(find.text('Check your email'), findsNothing);
  });
}
