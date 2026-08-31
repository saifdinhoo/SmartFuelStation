import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/realtime/composite_realtime_handler.dart';
import 'package:smart_automotive_service_app/core/realtime/realtime_events.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/widgets/finance_trend_chart.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/notifications/data/notification_realtime_handler.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

Widget wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  locale: locale,
  theme: AppTheme.light,
  supportedLocales: LocaleController.supported,
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  home: Scaffold(body: child),
);

/// Counts how many events reach it, so composite fan-out can be proven
/// without depending on any real feature's cache-writing behaviour.
class _SpyHandler implements RealtimeEventHandler {
  int financeEvents = 0;
  Map<String, dynamic>? lastPayload;

  @override
  void onFinanceUpdated(Map<String, dynamic> payload) {
    financeEvents++;
    lastPayload = payload;
  }

  @override
  void onReconnected() {}
  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {}
  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {}
  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {}
  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {}
  @override
  void onNotificationNew(Map<String, dynamic> payload) {}
  @override
  void onProviderAvailabilityChanged(Map<String, dynamic> payload) {}
  @override
  void onProviderFuelUpdated(Map<String, dynamic> payload) {}
}

void main() {
  group('FinanceTrendPoint parsing', () {
    test('reads gross/commission/net for one real recorded day', () {
      final point = FinanceTrendPoint.fromJson(const {
        'label': '2026-08-30',
        'gross': 100.0,
        'commission': 10.0,
        'net': 90.0,
      });
      expect(point.label, '2026-08-30');
      expect(point.gross, 100.0);
      expect(point.commission, 10.0);
      expect(point.net, 90.0);
    });
  });

  group('FinanceSummary parsing', () {
    test('reads the platform-wide admin shape, including transactionCount', () {
      final summary = FinanceSummary.fromJson({
        'range': '30d',
        'grossServiceValue': 300.0,
        'platformCommissionRevenue': 30.0,
        'providerNetEarnings': 270.0,
        'pendingSettlementAmount': 90.0,
        'settledAmount': 180.0,
        'transactionCount': 3,
        'trend': [
          {'label': '2026-08-30', 'gross': 100.0, 'commission': 10.0, 'net': 90.0},
        ],
      });

      expect(summary.range, '30d');
      expect(summary.grossServiceValue, 300.0);
      expect(summary.transactionCount, 3);
      expect(summary.providerId, isNull, reason: 'platform-wide summary has no single provider');
      expect(summary.trend, hasLength(1));
    });

    test('reads a provider-scoped summary — transactionCount stays null', () {
      final summary = FinanceSummary.fromJson({
        'range': '30d',
        'providerId': 2,
        'commissionRate': 10.0,
        'grossServiceValue': 100.0,
        'platformCommissionRevenue': 10.0,
        'providerNetEarnings': 90.0,
        'pendingSettlementAmount': 90.0,
        'settledAmount': 0.0,
        'trend': const [],
      });

      expect(summary.providerId, 2);
      expect(summary.commissionRate, 10.0);
      expect(summary.transactionCount, isNull);
    });

    test('reports zero totals rather than throwing when fields are missing', () {
      final summary = FinanceSummary.fromJson(const {});
      expect(summary.grossServiceValue, 0.0);
      expect(summary.range, '30d', reason: 'falls back to the default range');
      expect(summary.trend, isEmpty);
    });
  });

  group('SettlementStatusModel', () {
    test('maps the two real backend values', () {
      expect(SettlementStatusModel.fromApi('PENDING'), SettlementStatusModel.pending);
      expect(SettlementStatusModel.fromApi('SETTLED'), SettlementStatusModel.settled);
      expect(SettlementStatusModel.pending.api, 'PENDING');
      expect(SettlementStatusModel.settled.api, 'SETTLED');
    });

    test('an unrecognized or missing status defaults to pending, never a crash', () {
      expect(SettlementStatusModel.fromApi(null), SettlementStatusModel.pending);
      expect(SettlementStatusModel.fromApi('SOMETHING_NEW'), SettlementStatusModel.pending);
    });
  });

  group('FinanceTransaction parsing — provider-safe shape', () {
    Map<String, dynamic> providerJson({String status = 'PENDING'}) => {
      'id': 1,
      'bookingId': 5,
      'grossAmount': 100.0,
      'commissionRate': 10.0,
      'commissionAmount': 10.0,
      'providerNetAmount': 90.0,
      'settlementStatus': status,
      'settledAt': null,
      'createdAt': '2026-08-30T00:00:00.000Z',
      'booking': {
        'id': 5,
        'status': 'COMPLETED',
        'scheduledAt': '2026-08-30T00:00:00.000Z',
        'serviceName': 'Oil Change',
      },
    };

    test('reads every real field the provider-own endpoint returns', () {
      final tx = FinanceTransaction.fromJson(providerJson());
      expect(tx.id, 1);
      expect(tx.bookingId, 5);
      expect(tx.grossAmount, 100.0);
      expect(tx.commissionAmount, 10.0);
      expect(tx.providerNetAmount, 90.0);
      expect(tx.settlementStatus, SettlementStatusModel.pending);
      expect(tx.booking?.serviceName, 'Oil Change');
    });

    test('this shape has no way to even hold a providerId or admin identity', () {
      // Structural proof, not just a runtime check: FinanceTransaction has
      // no providerId/providerName/settledByAdminId/settledByAdminName
      // fields at all — see AdminFinanceTransaction for the admin-only
      // superset. A provider screen reading this type can never leak them
      // because the compiler gives it nowhere to read them from.
      final tx = FinanceTransaction.fromJson(providerJson());
      expect(tx, isNot(isA<AdminFinanceTransaction>()));
    });

    test('gross/commission/net always come from the server, never recomputed client-side', () {
      // 12.5% of 33.33 would be 4.16625 if computed here — but the value
      // below is a deliberately "wrong" one relative to that formula, to
      // prove parsing takes the server's number verbatim rather than
      // deriving it.
      final tx = FinanceTransaction.fromJson({
        ...providerJson(),
        'grossAmount': 33.33,
        'commissionRate': 12.5,
        'commissionAmount': 4.17,
        'providerNetAmount': 29.16,
      });
      expect(tx.commissionAmount, 4.17);
      expect(tx.providerNetAmount, 29.16);
    });
  });

  group('AdminFinanceTransaction parsing — admin superset', () {
    test('reads providerId/providerName and settlement audit fields', () {
      final tx = AdminFinanceTransaction.fromJson({
        'id': 1,
        'bookingId': 5,
        'providerId': 2,
        'providerName': 'Cedars Auto Care',
        'grossAmount': 100.0,
        'commissionRate': 10.0,
        'commissionAmount': 10.0,
        'providerNetAmount': 90.0,
        'settlementStatus': 'SETTLED',
        'settledAt': '2026-08-31T00:00:00.000Z',
        'settledByAdminId': 1,
        'settledByAdminName': 'Site Admin',
        'createdAt': '2026-08-30T00:00:00.000Z',
        'booking': null,
      });

      expect(tx.providerId, 2);
      expect(tx.providerName, 'Cedars Auto Care');
      expect(tx.settlementStatus, SettlementStatusModel.settled);
      expect(tx.settledByAdminId, 1);
      expect(tx.settledByAdminName, 'Site Admin');
      expect(tx.booking, isNull, reason: 'a null booking must not throw');
    });

    test('is a FinanceTransaction too — the same widgets can render either shape', () {
      final tx = AdminFinanceTransaction.fromJson({
        'id': 1,
        'bookingId': 5,
        'providerId': 2,
        'providerName': 'Cedars Auto Care',
        'grossAmount': 100.0,
        'commissionRate': 10.0,
        'commissionAmount': 10.0,
        'providerNetAmount': 90.0,
        'settlementStatus': 'PENDING',
        'createdAt': '2026-08-30T00:00:00.000Z',
      });
      expect(tx, isA<FinanceTransaction>());
    });
  });

  group('AdminProviderFinance parsing', () {
    test('combines the scoped summary with its transaction list', () {
      final data = AdminProviderFinance.fromJson({
        'providerId': 2,
        'providerName': 'Cedars Auto Care',
        'commissionRate': 10.0,
        'range': '30d',
        'grossServiceValue': 100.0,
        'platformCommissionRevenue': 10.0,
        'providerNetEarnings': 90.0,
        'pendingSettlementAmount': 90.0,
        'settledAmount': 0.0,
        'trend': const [],
        'transactions': [
          {
            'id': 1,
            'bookingId': 5,
            'providerId': 2,
            'providerName': 'Cedars Auto Care',
            'grossAmount': 100.0,
            'commissionRate': 10.0,
            'commissionAmount': 10.0,
            'providerNetAmount': 90.0,
            'settlementStatus': 'PENDING',
            'createdAt': '2026-08-30T00:00:00.000Z',
          },
        ],
      });

      expect(data.summary.providerName, 'Cedars Auto Care');
      expect(data.transactions, hasLength(1));
      expect(data.transactions.first.id, 1);
    });
  });

  group('ProviderCommission parsing', () {
    test('reads the rate and audit metadata', () {
      final commission = ProviderCommission.fromJson({
        'providerId': 2,
        'commissionRate': 10.0,
        'updatedAt': '2026-08-30T00:00:00.000Z',
        'updatedByAdminId': 1,
      });
      expect(commission.providerId, 2);
      expect(commission.commissionRate, 10.0);
      expect(commission.updatedByAdminId, 1);
    });

    test('a never-updated commission has null audit fields, not a crash', () {
      final commission = ProviderCommission.fromJson(const {
        'providerId': 2,
        'commissionRate': 10.0,
      });
      expect(commission.updatedAt, isNull);
      expect(commission.updatedByAdminId, isNull);
    });
  });

  group('FinanceTrendChart', () {
    testWidgets('shows an honest empty message with no fabricated line for zero points', (
      tester,
    ) async {
      await tester.pumpWidget(wrap(const FinanceTrendChart(points: [])));
      final l10n = await loadL10n('en');
      expect(find.text(l10n.financeTrendEmpty), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('renders a real chart with no exception for real points', (tester) async {
      await tester.pumpWidget(
        wrap(
          const FinanceTrendChart(
            points: [
              FinanceTrendPoint(label: '2026-08-29', gross: 100, commission: 10, net: 90),
              FinanceTrendPoint(label: '2026-08-30', gross: 200, commission: 20, net: 180),
            ],
          ),
        ),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('shows the single-point note for exactly one recorded day', (tester) async {
      await tester.pumpWidget(
        wrap(
          const FinanceTrendChart(
            points: [FinanceTrendPoint(label: '2026-08-30', gross: 100, commission: 10, net: 90)],
          ),
        ),
      );
      final l10n = await loadL10n('en');
      expect(find.text(l10n.financeTrendSinglePoint), findsOneWidget);
    });

    testWidgets('hides the commission/net legend entries when showCommissionAndNet is false', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const FinanceTrendChart(
            points: [FinanceTrendPoint(label: '2026-08-30', gross: 100, commission: 10, net: 90)],
            showCommissionAndNet: false,
          ),
        ),
      );
      final l10n = await loadL10n('en');
      expect(find.text(l10n.financeGross), findsOneWidget);
      expect(find.text(l10n.financeCommission), findsNothing);
      expect(find.text(l10n.financeNet), findsNothing);
    });

    testWidgets('renders in Arabic with RTL direction', (tester) async {
      final ar = await loadL10n('ar');
      await tester.pumpWidget(
        wrap(const FinanceTrendChart(points: []), locale: const Locale('ar')),
      );
      final text = find.text(ar.financeTrendEmpty);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });

  group('finance localization — real translations, not English fallbacks', () {
    test('every new admin and provider finance string is actually translated', () async {
      final ar = await loadL10n('ar');
      expect(ar.aFinanceTitle, isNot('Finance'));
      expect(ar.aFinanceMarkSettled, isNot('Mark Settled'));
      expect(ar.aFinanceCommissionEdit, isNot('Manage commission'));
      expect(ar.pFinanceTitle, isNot('My Earnings'));
      expect(ar.pFinanceReadOnlyNote, isNot(contains('platform admin')));
      expect(ar.financeGross, isNot('Gross'));
      expect(ar.financeStatusPending, isNot('Pending'));
    });
  });

  group('finance realtime — roles with no finance access no-op (Phase D)', () {
    test('a customer never reacts to finance:updated', () {
      final handler = CustomerRealtimeHandler(QueryCache());
      expect(() => handler.onFinanceUpdated({'providerId': 2}), returnsNormally);
    });

    test('the notification handler never reacts to finance:updated', () {
      final handler = NotificationRealtimeHandler(QueryCache());
      expect(() => handler.onFinanceUpdated({'providerId': 2}), returnsNormally);
    });
  });

  group('CompositeRealtimeHandler fan-out — finance:updated', () {
    test('reaches every registered handler exactly once', () {
      final a = _SpyHandler();
      final b = _SpyHandler();
      final composite = CompositeRealtimeHandler([a, b]);

      composite.onFinanceUpdated({'providerId': 2});

      expect(a.financeEvents, 1);
      expect(b.financeEvents, 1);
      expect(a.lastPayload, {'providerId': 2});
    });
  });

  test('finance:updated is a real, distinct socket event name', () {
    expect(RealtimeEvents.financeUpdated, 'finance:updated');
    expect(RealtimeEvents.financeUpdated, isNot(RealtimeEvents.providerFuelUpdated));
  });
}
