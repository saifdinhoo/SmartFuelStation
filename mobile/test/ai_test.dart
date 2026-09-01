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
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/app/router.dart';
import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/storage/prefs_store.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/features/ai/data/ai_repository.dart';
import 'package:smart_automotive_service_app/features/ai/models/ai_models.dart';
import 'package:smart_automotive_service_app/features/ai/screens/ai_assistant_screen.dart';
import 'package:smart_automotive_service_app/features/ai/state/ai_chat_state.dart';
import 'package:smart_automotive_service_app/features/ai/widgets/chat_bubble.dart';
import 'package:smart_automotive_service_app/features/ai/widgets/diagnosis_card.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/// Captures every request handed to it and returns queued responses/errors —
/// used for AiChatState tests, where only the request *shape* and sequencing
/// matter, not the real wire format (that is covered separately below via a
/// real Dio adapter fake against AiRepository).
class _FakeAiRepository extends AiRepository {
  _FakeAiRepository()
    : super(ApiClient(readToken: () => null, onUnauthorized: () async {}));

  final List<AiChatRequest> requests = [];
  final List<AiChatResponse> _queuedResponses = [];
  bool failNext = false;
  Completer<void>? _gate;

  void queueResponse(AiChatResponse response) => _queuedResponses.add(response);

  /// Holds the next sendMessage() call open until [Completer.complete] is
  /// called. Without this, a fake response resolves via microtasks only —
  /// no real Timer/IO gap — so a single `pump()` flushes the entire request
  /// lifecycle and the "isSending" window is never observable.
  Completer<void> pauseNextResponse() {
    final gate = Completer<void>();
    _gate = gate;
    return gate;
  }

  @override
  Future<AiChatResponse> sendMessage(AiChatRequest request) async {
    requests.add(request);
    final gate = _gate;
    if (gate != null) {
      _gate = null;
      await gate.future;
    }
    if (failNext) {
      failNext = false;
      throw ApiException('boom', statusCode: 502);
    }
    if (_queuedResponses.isNotEmpty) return _queuedResponses.removeAt(0);
    return const AiChatResponse(
      reply: 'ok',
      mode: AiResponseMode.support,
      suggestedAction: null,
      suggestedCategoryId: null,
      diagnosis: null,
    );
  }
}

/// A Dio adapter that captures the outgoing request and answers with a
/// canned JSON body — ApiClient.raw is exposed specifically "for tests that
/// need to swap the transport" (see its doc comment), so this needs no new
/// dependency to exercise the real POST path/body/response-parsing path.
class _CapturingAdapter implements HttpClientAdapter {
  RequestOptions? lastOptions;
  Object? lastBody;
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
  _FakeAuthApi(this.role)
    : super(ApiClient(readToken: () => null, onUnauthorized: () async {}));

  final String role;

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async => {
    'token': 'fake-token',
    'user': {'id': 1, 'name': 'Test', 'email': email, 'role': role},
  };
}

/// A signed-in AuthState with the given role, without any network call or
/// platform-channel dependency — `SecureTokenStore`'s constructor is inert
/// until read()/write() are actually invoked, and restoreSession() is never
/// called here.
Future<AuthState> fakeAuthState(String role) async {
  final auth = AuthState(const SecureTokenStore(FlutterSecureStorage()));
  auth.api = _FakeAuthApi(role);
  await auth.signIn(email: 'test@example.com', password: 'x');
  return auth;
}

Widget _harness({
  required Widget child,
  required AiRepository repo,
  required AuthState auth,
  required LocaleController locale,
}) {
  return MultiProvider(
    providers: [
      Provider<AiRepository>.value(value: repo),
      ChangeNotifierProvider<AuthState>.value(value: auth),
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
      home: child,
    ),
  );
}

Diagnosis _diagnosis({
  DiagnosisUrgency urgency = DiagnosisUrgency.medium,
  List<DiagnosisCause> possibleCauses = const [],
  String? recommendedServiceCategory = 'Brake Inspection',
  String? safetyAdvice,
  String? followUpQuestion,
}) => Diagnosis(
  urgency: urgency,
  possibleCauses: possibleCauses,
  recommendedServiceCategory: recommendedServiceCategory,
  safetyAdvice: safetyAdvice,
  followUpQuestion: followUpQuestion,
);

void main() {
  // Without this, FlutterSecureStorage()'s platform-interface calls hang
  // indefinitely in a plain widget test (no native implementation exists to
  // answer them) — this is the same fix live_backend_test.dart uses to
  // construct a real, signed-in AuthState off-device.
  setUpAll(() => TestWidgetsFlutterBinding.ensureInitialized());
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
  });

  // ---------------------------------------------------------------------
  // MODELS
  // ---------------------------------------------------------------------
  group('AiChatResponse / Diagnosis parsing', () {
    test('parses a SUPPORT response with a null diagnosis', () {
      final response = AiChatResponse.fromJson({
        'reply': 'Sure, here is how it works.',
        'mode': 'SUPPORT',
        'suggestedAction': null,
        'suggestedCategoryId': null,
        'diagnosis': null,
      });

      expect(response.reply, 'Sure, here is how it works.');
      expect(response.mode, AiResponseMode.support);
      expect(response.suggestedAction, isNull);
      expect(response.suggestedCategoryId, isNull);
      expect(response.diagnosis, isNull);
    });

    test('parses a full DIAGNOSIS response, including possibleCauses', () {
      final response = AiChatResponse.fromJson({
        'reply': 'This could be a brake issue.',
        'mode': 'DIAGNOSIS',
        'suggestedAction': 'FIND_PROVIDER',
        'suggestedCategoryId': 5,
        'diagnosis': {
          'urgency': 'MEDIUM',
          'possibleCauses': [
            {
              'name': 'Worn brake pads',
              'likelihood': 'LIKELY',
              'explanation': 'Common cause of this symptom.',
            },
            {
              'name': 'Warped rotor',
              'likelihood': 'POSSIBLE',
              'explanation': 'Less common but possible.',
            },
          ],
          'recommendedServiceCategory': 'Brake Inspection',
          'safetyAdvice': null,
          'followUpQuestion': null,
        },
      });

      expect(response.mode, AiResponseMode.diagnosis);
      expect(response.suggestedAction, SuggestedAction.findProvider);
      expect(response.suggestedCategoryId, 5);
      expect(response.diagnosis, isNotNull);
      expect(response.diagnosis!.urgency, DiagnosisUrgency.medium);
      expect(response.diagnosis!.possibleCauses, hasLength(2));
      expect(response.diagnosis!.possibleCauses[0].name, 'Worn brake pads');
      expect(
        response.diagnosis!.possibleCauses[0].likelihood,
        DiagnosisLikelihood.likely,
      );
      expect(
        response.diagnosis!.possibleCauses[1].likelihood,
        DiagnosisLikelihood.possible,
      );
      expect(response.diagnosis!.recommendedServiceCategory, 'Brake Inspection');
    });

    test('maps every real suggestedAction value', () {
      expect(SuggestedAction.fromApi('FIND_PROVIDER'), SuggestedAction.findProvider);
      expect(
        SuggestedAction.fromApi('SEEK_IMMEDIATE_HELP'),
        SuggestedAction.seekImmediateHelp,
      );
      expect(SuggestedAction.fromApi('NONE'), SuggestedAction.none);
    });

    test('an unrecognized or missing suggestedAction becomes null, never a fabricated action', () {
      expect(SuggestedAction.fromApi(null), isNull);
      expect(SuggestedAction.fromApi('SOMETHING_NEW'), isNull);
    });

    test('an unrecognized urgency/likelihood/mode falls back to a safe sentinel, never throws', () {
      expect(DiagnosisUrgency.fromApi('CATASTROPHIC'), DiagnosisUrgency.unknown);
      expect(DiagnosisUrgency.fromApi(null), DiagnosisUrgency.unknown);
      expect(DiagnosisLikelihood.fromApi('CERTAIN'), DiagnosisLikelihood.unknown);
      expect(AiResponseMode.fromApi('AUTO'), AiResponseMode.unknown);
      expect(AiResponseMode.fromApi(null), AiResponseMode.unknown);
    });

    test('a non-numeric/malformed suggestedCategoryId becomes null rather than crashing', () {
      final response = AiChatResponse.fromJson({
        'reply': 'x',
        'mode': 'DIAGNOSIS',
        'suggestedAction': 'NONE',
        'suggestedCategoryId': 'not-a-number',
        'diagnosis': null,
      });
      expect(response.suggestedCategoryId, isNull);
    });

    test('a missing/non-object diagnosis becomes null rather than throwing', () {
      expect(Diagnosis.fromJsonOrNull(null), isNull);
      expect(Diagnosis.fromJsonOrNull('not an object'), isNull);
      expect(Diagnosis.fromJsonOrNull([1, 2, 3]), isNull);
    });

    test('AiChatRequest.toJson has exactly the real four keys, never role', () {
      const request = AiChatRequest(
        message: 'hi',
        mode: AiMode.support,
        conversation: [
          AiConversationMessage(role: ChatRole.user, content: 'earlier'),
        ],
        locale: 'en',
      );
      final json = request.toJson();

      expect(json.keys.toSet(), {'message', 'mode', 'conversation', 'locale'});
      expect(json['mode'], 'SUPPORT');
      expect(json['conversation'], [
        {'role': 'user', 'content': 'earlier'},
      ]);
    });
  });

  // ---------------------------------------------------------------------
  // REPOSITORY
  // ---------------------------------------------------------------------
  group('AiRepository', () {
    test('POSTs to /ai/chat with the exact request body, and parses the real envelope', () async {
      final adapter = _CapturingAdapter(
        jsonEncode({
          'success': true,
          'data': {
            'reply': 'Sure.',
            'mode': 'SUPPORT',
            'suggestedAction': null,
            'suggestedCategoryId': null,
            'diagnosis': null,
          },
        }),
      );
      final apiClient = ApiClient(
        readToken: () => 'jwt-token',
        onUnauthorized: () async {},
      );
      apiClient.raw.httpClientAdapter = adapter;
      final repo = AiRepository(apiClient);

      const request = AiChatRequest(
        message: 'How do I cancel a booking?',
        mode: AiMode.auto,
        conversation: [
          AiConversationMessage(role: ChatRole.assistant, content: 'Hello!'),
        ],
        locale: 'en',
      );

      final response = await repo.sendMessage(request);

      expect(adapter.lastOptions!.path, '/ai/chat');
      expect(adapter.lastOptions!.method, 'POST');
      final sentBody = adapter.lastBody as Map<String, dynamic>;
      expect(sentBody['message'], 'How do I cancel a booking?');
      expect(sentBody['mode'], 'AUTO');
      expect(sentBody['locale'], 'en');
      expect(sentBody['conversation'], [
        {'role': 'assistant', 'content': 'Hello!'},
      ]);
      expect(sentBody.containsKey('role'), isFalse);

      // The JWT is attached automatically by ApiClient's own interceptor —
      // this repository never has to (and never does) set it itself.
      expect(adapter.lastOptions!.headers['Authorization'], 'Bearer jwt-token');

      expect(response.reply, 'Sure.');
      expect(response.mode, AiResponseMode.support);
    });

    test('sends the given locale through unchanged', () async {
      final adapter = _CapturingAdapter(
        jsonEncode({
          'success': true,
          'data': {
            'reply': 'حسناً',
            'mode': 'SUPPORT',
            'suggestedAction': null,
            'suggestedCategoryId': null,
            'diagnosis': null,
          },
        }),
      );
      final apiClient = ApiClient(readToken: () => null, onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = AiRepository(apiClient);

      await repo.sendMessage(
        const AiChatRequest(
          message: 'مرحبا',
          mode: AiMode.support,
          conversation: [],
          locale: 'ar',
        ),
      );

      expect((adapter.lastBody as Map<String, dynamic>)['locale'], 'ar');
    });

    test(
      'uses a 40s receiveTimeout for /ai/chat — above the backend\'s own 30s Gemini ceiling',
      () async {
        final adapter = _CapturingAdapter(
          jsonEncode({
            'success': true,
            'data': {
              'reply': 'Sure.',
              'mode': 'SUPPORT',
              'suggestedAction': null,
              'suggestedCategoryId': null,
              'diagnosis': null,
            },
          }),
        );
        final apiClient = ApiClient(readToken: () => null, onUnauthorized: () async {});
        apiClient.raw.httpClientAdapter = adapter;
        final repo = AiRepository(apiClient);

        await repo.sendMessage(
          const AiChatRequest(message: 'hi', mode: AiMode.auto, conversation: [], locale: 'en'),
        );

        expect(adapter.lastOptions!.receiveTimeout, const Duration(seconds: 40));
      },
    );

    test(
      'a normal (non-AI) call keeps the shared 20s default — the AI override is scoped to /ai/chat only',
      () async {
        final adapter = _CapturingAdapter(jsonEncode({'success': true, 'data': []}));
        final apiClient = ApiClient(readToken: () => null, onUnauthorized: () async {});
        apiClient.raw.httpClientAdapter = adapter;

        await apiClient.get('/categories');

        expect(adapter.lastOptions!.receiveTimeout, const Duration(seconds: 20));
      },
    );
  });

  // ---------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------
  group('AiChatState', () {
    test('defaults to AUTO mode with no messages', () {
      final state = AiChatState(_FakeAiRepository());
      expect(state.mode, AiMode.auto);
      expect(state.messages, isEmpty);
      expect(state.isSending, isFalse);
      expect(state.hasError, isFalse);
    });

    test('setMode changes the mode without touching existing messages', () async {
      final repo = _FakeAiRepository();
      final state = AiChatState(repo);
      await state.sendMessage('hi', locale: 'en');
      final before = state.messages;

      state.setMode(AiMode.diagnosis);

      expect(state.mode, AiMode.diagnosis);
      // `messages` wraps the same underlying list fresh each call — compare
      // contents/identity of the elements, not the wrapper list itself.
      expect(state.messages, hasLength(before.length));
      expect(
        state.messages.map((m) => identityHashCode(m)),
        before.map((m) => identityHashCode(m)),
      );
    });

    test('ignores an empty/whitespace-only message', () async {
      final repo = _FakeAiRepository();
      final state = AiChatState(repo);
      await state.sendMessage('   ', locale: 'en');
      expect(state.messages, isEmpty);
      expect(repo.requests, isEmpty);
    });

    test('appends the user bubble immediately, then the assistant reply on success', () async {
      final repo = _FakeAiRepository()
        ..queueResponse(
          const AiChatResponse(
            reply: 'Here you go.',
            mode: AiResponseMode.support,
            suggestedAction: null,
            suggestedCategoryId: null,
            diagnosis: null,
          ),
        );
      final state = AiChatState(repo);

      final future = state.sendMessage('How do I cancel?', locale: 'en');
      expect(state.messages, hasLength(1));
      expect(state.messages.single.role, ChatRole.user);
      expect(state.isSending, isTrue);

      await future;

      expect(state.isSending, isFalse);
      expect(state.hasError, isFalse);
      expect(state.messages, hasLength(2));
      expect(state.messages.last.role, ChatRole.assistant);
      expect(state.messages.last.content, 'Here you go.');
    });

    test('sends prior turns as conversation, never duplicating the current message', () async {
      final repo = _FakeAiRepository();
      final state = AiChatState(repo);

      await state.sendMessage('first', locale: 'en');
      await state.sendMessage('second', locale: 'en');

      expect(repo.requests, hasLength(2));
      expect(repo.requests[0].conversation, isEmpty);
      expect(repo.requests[1].message, 'second');
      expect(repo.requests[1].conversation, [
        isA<AiConversationMessage>()
            .having((m) => m.role, 'role', ChatRole.user)
            .having((m) => m.content, 'content', 'first'),
        isA<AiConversationMessage>()
            .having((m) => m.role, 'role', ChatRole.assistant)
            .having((m) => m.content, 'content', 'ok'),
      ]);
      expect(
        repo.requests[1].conversation.any((m) => m.content == 'second'),
        isFalse,
        reason: 'the message being sent must never also appear in its own history',
      );
    });

    test('bounds conversation history to the most recent 20 entries', () async {
      final repo = _FakeAiRepository();
      final state = AiChatState(repo);

      for (var i = 0; i < 12; i++) {
        await state.sendMessage('message $i', locale: 'en');
      }
      // 12 turns => 24 messages total; the 12th request's history is capped
      // at 20 of the 22 messages that existed before it.
      final lastRequest = repo.requests.last;
      expect(lastRequest.conversation.length, lessThanOrEqualTo(20));
      expect(lastRequest.conversation.length, 20);
    });

    test('folds a diagnosis follow-up question into assistant history content', () async {
      final repo = _FakeAiRepository()
        ..queueResponse(
          AiChatResponse(
            reply: 'Could be a few things.',
            mode: AiResponseMode.diagnosis,
            suggestedAction: SuggestedAction.none,
            suggestedCategoryId: null,
            diagnosis: _diagnosis(
              recommendedServiceCategory: null,
              followUpQuestion: 'Does it happen while braking?',
            ),
          ),
        );
      final state = AiChatState(repo);

      await state.sendMessage('My car makes a noise.', locale: 'en');
      await state.sendMessage('Yes, while braking.', locale: 'en');

      final history = repo.requests[1].conversation;
      expect(history[1].content, contains('Does it happen while braking?'));
    });

    test('a failed send sets hasError, and canRetry only once a request actually failed', () async {
      final repo = _FakeAiRepository()..failNext = true;
      final state = AiChatState(repo);

      await state.sendMessage('hi', locale: 'en');

      expect(state.hasError, isTrue);
      expect(state.canRetry, isTrue);
      expect(state.isSending, isFalse);
      // No fabricated assistant reply on failure.
      expect(state.messages, hasLength(1));
    });

    test('retry replays the exact same request and clears the error on success', () async {
      final repo = _FakeAiRepository()..failNext = true;
      final state = AiChatState(repo);
      await state.sendMessage('hi', locale: 'en');
      expect(state.hasError, isTrue);

      await state.retry();

      expect(state.hasError, isFalse);
      expect(repo.requests, hasLength(2));
      expect(repo.requests[0].message, repo.requests[1].message);
      expect(state.messages, hasLength(2));
    });

    test('retry does nothing when there is no failed request', () async {
      final repo = _FakeAiRepository();
      final state = AiChatState(repo);
      await state.retry();
      expect(repo.requests, isEmpty);
    });

    test('clear resets messages and error state', () async {
      final repo = _FakeAiRepository()..failNext = true;
      final state = AiChatState(repo);
      await state.sendMessage('hi', locale: 'en');
      expect(state.hasError, isTrue);

      state.clear();

      expect(state.messages, isEmpty);
      expect(state.hasError, isFalse);
      expect(state.canRetry, isFalse);
    });
  });

  // ---------------------------------------------------------------------
  // UI — DiagnosisCard / ChatBubble in isolation
  // ---------------------------------------------------------------------
  Widget wrapDiagnosis(Widget child, {Locale locale = const Locale('en')}) {
    return MaterialApp(
      locale: locale,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      supportedLocales: LocaleController.supported,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );
  }

  group('DiagnosisCard', () {
    testWidgets('renders urgency, possible causes, likelihood and explanation', (tester) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(
              urgency: DiagnosisUrgency.high,
              possibleCauses: const [
                DiagnosisCause(
                  name: 'Worn brake pads',
                  likelihood: DiagnosisLikelihood.likely,
                  explanation: 'Common cause of this symptom.',
                ),
              ],
            ),
            suggestedAction: SuggestedAction.none,
            suggestedCategoryId: null,
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );

      expect(find.text('Preliminary Diagnosis'), findsOneWidget);
      expect(find.text('High'), findsOneWidget);
      expect(find.text('Worn brake pads'), findsOneWidget);
      expect(find.textContaining('Likely'), findsOneWidget);
      expect(find.text('Common cause of this symptom.'), findsOneWidget);
    });

    testWidgets('shows safety advice and the follow-up question card', (tester) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(
              recommendedServiceCategory: null,
              safetyAdvice: 'Keep an eye on the tire pressure warning light.',
              followUpQuestion: 'When does the noise happen?',
            ),
            suggestedAction: SuggestedAction.none,
            suggestedCategoryId: null,
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );

      expect(find.text('Safety advice'), findsOneWidget);
      expect(
        find.text('Keep an eye on the tire pressure warning light.'),
        findsOneWidget,
      );
      expect(find.text('I need a little more information.'), findsOneWidget);
      expect(find.text('When does the noise happen?'), findsOneWidget);
    });

    testWidgets('FIND_PROVIDER shows the primary CTA for CUSTOMER, using the real category id', (
      tester,
    ) async {
      int? tappedCategoryId;
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(),
            suggestedAction: SuggestedAction.findProvider,
            suggestedCategoryId: 5,
            role: UserRole.customer,
            onFindProviders: (id) => tappedCategoryId = id,
          ),
        ),
      );

      final button = find.text('Find Suitable Providers');
      expect(button, findsOneWidget);
      await tester.tap(button);
      expect(tappedCategoryId, 5);
    });

    testWidgets('never shows the FIND_PROVIDER CTA for PROVIDER or ADMIN', (tester) async {
      for (final role in [UserRole.provider, UserRole.admin]) {
        await tester.pumpWidget(
          wrapDiagnosis(
            DiagnosisCard(
              diagnosis: _diagnosis(),
              suggestedAction: SuggestedAction.findProvider,
              suggestedCategoryId: 5,
              role: role,
              onFindProviders: (_) {},
            ),
          ),
        );
        expect(find.text('Find Suitable Providers'), findsNothing);
      }
    });

    testWidgets('never shows a FIND_PROVIDER CTA when suggestedCategoryId is missing (safe fallback)', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(),
            suggestedAction: SuggestedAction.findProvider,
            suggestedCategoryId: null,
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );
      expect(find.text('Find Suitable Providers'), findsNothing);
    });

    testWidgets('SEEK_IMMEDIATE_HELP shows safety-first messaging and only a secondary CTA', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(
              urgency: DiagnosisUrgency.emergency,
              recommendedServiceCategory: null,
              safetyAdvice: 'Stop driving now and move away from the vehicle.',
            ),
            suggestedAction: SuggestedAction.seekImmediateHelp,
            suggestedCategoryId: null,
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );

      expect(find.text('Seek immediate help'), findsOneWidget);
      expect(find.text('Emergency'), findsOneWidget);
      expect(find.text('Find Suitable Providers'), findsNothing);
      expect(find.text('Find nearby service providers'), findsOneWidget);
    });

    testWidgets('renders Arabic labels under the Arabic locale', (tester) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          DiagnosisCard(
            diagnosis: _diagnosis(urgency: DiagnosisUrgency.low),
            suggestedAction: SuggestedAction.none,
            suggestedCategoryId: null,
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
          locale: const Locale('ar'),
        ),
      );

      expect(find.text('تشخيص أولي'), findsOneWidget);
      expect(find.text('منخفضة'), findsOneWidget);
    });
  });

  group('ChatBubble', () {
    testWidgets('a SUPPORT message renders as a plain bubble, never a diagnosis card', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          ChatBubble(
            message: const ChatMessage(
              id: '1',
              role: ChatRole.assistant,
              content: 'You can cancel from Bookings.',
              responseMode: AiResponseMode.support,
            ),
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );

      expect(find.text('You can cancel from Bookings.'), findsOneWidget);
      expect(find.byType(DiagnosisCard), findsNothing);
    });

    testWidgets('a DIAGNOSIS message with a diagnosis payload renders the diagnosis card', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapDiagnosis(
          ChatBubble(
            message: ChatMessage(
              id: '1',
              role: ChatRole.assistant,
              content: 'This could be a brake issue.',
              responseMode: AiResponseMode.diagnosis,
              diagnosis: _diagnosis(),
            ),
            role: UserRole.customer,
            onFindProviders: (_) {},
          ),
        ),
      );

      expect(find.byType(DiagnosisCard), findsOneWidget);
    });
  });

  // ---------------------------------------------------------------------
  // UI — full screen
  // ---------------------------------------------------------------------
  group('AiAssistantScreen', () {
    testWidgets('renders the title, description, and a welcome message', (tester) async {
      final auth = await fakeAuthState('CUSTOMER');
      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: _FakeAiRepository(),
          auth: auth,
          locale: LocaleController(const PrefsStore()),
        ),
      );

      expect(find.text('AI Assistant'), findsOneWidget);
      expect(find.textContaining('Ask how the platform works'), findsOneWidget);
      expect(find.textContaining("Hi! I'm your platform assistant"), findsOneWidget);
    });

    testWidgets('defaults to AUTO and can switch to SUPPORT and DIAGNOSIS', (tester) async {
      final auth = await fakeAuthState('CUSTOMER');
      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: _FakeAiRepository(),
          auth: auth,
          locale: LocaleController(const PrefsStore()),
        ),
      );

      ChoiceChip chipFor(String label) =>
          tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, label));

      expect(chipFor('Auto').selected, isTrue);

      await tester.tap(find.text('Platform Support'));
      await tester.pump();
      expect(chipFor('Platform Support').selected, isTrue);

      await tester.tap(find.text('Vehicle Diagnosis'));
      await tester.pump();
      expect(chipFor('Vehicle Diagnosis').selected, isTrue);
    });

    testWidgets('submits a message, shows the typing indicator, then the reply; Send is disabled meanwhile', (
      tester,
    ) async {
      final repo = _FakeAiRepository()
        ..queueResponse(
          const AiChatResponse(
            reply: 'You can cancel from Bookings.',
            mode: AiResponseMode.support,
            suggestedAction: null,
            suggestedCategoryId: null,
            diagnosis: null,
          ),
        );
      // A truly-instant fake response resolves within the same pump() as the
      // tap, which would make the "isSending" window unobservable — hold it
      // open until this test has asserted the loading state.
      final gate = repo.pauseNextResponse();
      final auth = await fakeAuthState('CUSTOMER');
      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: repo,
          auth: auth,
          locale: LocaleController(const PrefsStore()),
        ),
      );

      await tester.enterText(find.byType(TextField), 'How do I cancel my booking?');
      await tester.pump();
      await tester.tap(find.byIcon(Icons.send));
      await tester.pump();

      expect(find.text('How do I cancel my booking?'), findsOneWidget);
      expect(find.text('Thinking…'), findsOneWidget);
      final sendButton = tester.widget<IconButton>(
        find.byKey(const Key('aiAssistantSendButton')),
      );
      expect(sendButton.onPressed, isNull);

      gate.complete();
      await tester.pumpAndSettle();

      expect(find.text('You can cancel from Bookings.'), findsOneWidget);
      expect(find.text('Thinking…'), findsNothing);
    });

    testWidgets('shows the friendly error banner on failure, and Retry clears it on success', (
      tester,
    ) async {
      final repo = _FakeAiRepository()..failNext = true;
      final auth = await fakeAuthState('CUSTOMER');
      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: repo,
          auth: auth,
          locale: LocaleController(const PrefsStore()),
        ),
      );

      await tester.enterText(find.byType(TextField), 'hi');
      await tester.pump();
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      expect(
        find.text('AI Assistant is temporarily unavailable. Please try again.'),
        findsOneWidget,
      );

      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      expect(
        find.text('AI Assistant is temporarily unavailable. Please try again.'),
        findsNothing,
      );
      expect(find.text('ok'), findsOneWidget);
    });

    testWidgets('Clear conversation resets back to the welcome message', (tester) async {
      final repo = _FakeAiRepository()
        ..queueResponse(
          const AiChatResponse(
            reply: 'Sure.',
            mode: AiResponseMode.support,
            suggestedAction: null,
            suggestedCategoryId: null,
            diagnosis: null,
          ),
        );
      final auth = await fakeAuthState('CUSTOMER');
      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: repo,
          auth: auth,
          locale: LocaleController(const PrefsStore()),
        ),
      );

      await tester.enterText(find.byType(TextField), 'hi');
      await tester.pump();
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();
      expect(find.text('Sure.'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.delete_outline));
      await tester.pumpAndSettle();

      expect(find.text('Sure.'), findsNothing);
      expect(find.textContaining("Hi! I'm your platform assistant"), findsOneWidget);
    });

    testWidgets('sends locale "ar" when the app locale is Arabic, and renders Arabic UI', (
      tester,
    ) async {
      final repo = _FakeAiRepository();
      final auth = await fakeAuthState('CUSTOMER');
      final locale = LocaleController(const PrefsStore());
      await locale.setLocale(const Locale('ar'));

      await tester.pumpWidget(
        _harness(
          child: const AiAssistantScreen(),
          repo: repo,
          auth: auth,
          locale: locale,
        ),
      );

      expect(find.text('المساعد الذكي'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('المساعد الذكي'))),
        TextDirection.rtl,
      );

      await tester.enterText(find.byType(TextField), 'مرحبا');
      await tester.pump();
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      expect(repo.requests.single.locale, 'ar');
    });

    testWidgets('navigates into the real Explore route with the resolved category id on FIND_PROVIDER', (
      tester,
    ) async {
      final repo = _FakeAiRepository()
        ..queueResponse(
          AiChatResponse(
            reply: 'This could be a brake issue.',
            mode: AiResponseMode.diagnosis,
            suggestedAction: SuggestedAction.findProvider,
            suggestedCategoryId: 5,
            diagnosis: _diagnosis(),
          ),
        );
      final auth = await fakeAuthState('CUSTOMER');
      final locale = LocaleController(const PrefsStore());

      final router = GoRouter(
        initialLocation: '/assistant',
        routes: [
          GoRoute(path: '/assistant', builder: (_, _) => const AiAssistantScreen()),
          GoRoute(
            path: Routes.customerExplore,
            builder: (_, state) =>
                Scaffold(body: Text('explore:${state.extra}')),
          ),
        ],
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            Provider<AiRepository>.value(value: repo),
            ChangeNotifierProvider<AuthState>.value(value: auth),
            ChangeNotifierProvider<LocaleController>.value(value: locale),
          ],
          child: MaterialApp.router(
            routerConfig: router,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            supportedLocales: LocaleController.supported,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
          ),
        ),
      );

      await tester.enterText(find.byType(TextField), 'My brakes are grinding.');
      await tester.pump();
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Find Suitable Providers'));
      await tester.pumpAndSettle();

      expect(find.text('explore:5'), findsOneWidget);
    });
  });

  group('localization', () {
    test('AI strings are translated, not English fallbacks', () async {
      final ar = await loadL10n('ar');
      expect(ar.aiAssistantTitle, isNot('AI Assistant'));
      expect(ar.aiModeAuto, isNot('Auto'));
      expect(ar.aiModeSupport, isNot('Platform Support'));
      expect(ar.aiModeDiagnosis, isNot('Vehicle Diagnosis'));
      expect(ar.aiAssistantUnavailable, isNot(contains('temporarily unavailable')));
      expect(ar.aiSeekImmediateHelpBody, isNot(contains('Stop driving')));
    });
  });
}
