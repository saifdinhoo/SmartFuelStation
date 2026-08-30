import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/notifications/data/notification_repository.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

void main() {
  group('AppNotification parsing', () {
    Map<String, dynamic> json({
      String type = 'BOOKING_CONFIRMED',
      bool isRead = false,
    }) => {
      'id': 1,
      'type': type,
      'title': 'Booking confirmed',
      'message': 'Al-Nour Auto Service confirmed your booking for 3:00 PM.',
      'isRead': isRead,
      'relatedBookingId': 42,
      'relatedProviderId': null,
      'relatedReviewId': null,
      'relatedQueueEntryId': null,
      'createdAt': '2026-01-01T15:00:00.000Z',
    };

    test('reads every field from the backend response shape', () {
      final notification = AppNotification.fromJson(json());

      expect(notification.id, 1);
      expect(notification.type, NotificationType.bookingConfirmed);
      expect(notification.title, 'Booking confirmed');
      expect(notification.isRead, isFalse);
      expect(notification.relatedBookingId, 42);
      expect(notification.relatedProviderId, isNull);
      expect(
        notification.createdAt.isAtSameMomentAs(
          DateTime.parse('2026-01-01T15:00:00.000Z'),
        ),
        isTrue,
      );
    });

    test('maps every notification type the backend can send', () {
      const cases = {
        'BOOKING_CREATED': NotificationType.bookingCreated,
        'BOOKING_REJECTED': NotificationType.bookingRejected,
        'BOOKING_CANCELLED': NotificationType.bookingCancelled,
        'QUEUE_JOINED': NotificationType.queueJoined,
        'QUEUE_ALMOST_TURN': NotificationType.queueAlmostTurn,
        'SERVICE_STARTED': NotificationType.serviceStarted,
        'SERVICE_COMPLETED': NotificationType.serviceCompleted,
        'NEW_REVIEW': NotificationType.newReview,
        'PROVIDER_REGISTERED': NotificationType.providerRegistered,
        'PROVIDER_APPROVED': NotificationType.providerApproved,
        'PROVIDER_REJECTED': NotificationType.providerRejected,
      };
      for (final entry in cases.entries) {
        expect(NotificationType.fromApi(entry.key), entry.value);
      }
      expect(NotificationType.fromApi('SOMETHING_NEW'), NotificationType.unknown);
    });

    test('copyWithRead only changes isRead', () {
      final notification = AppNotification.fromJson(json());
      final read = notification.copyWithRead(true);

      expect(read.isRead, isTrue);
      expect(read.id, notification.id);
      expect(read.title, notification.title);
      expect(read.relatedBookingId, notification.relatedBookingId);
    });
  });

  test('unreadCountOf counts only unread notifications', () {
    // unreadCountOf is a pure function of the list it's given — the
    // ApiClient is never touched, so a harmless one satisfies the
    // constructor without making any network call.
    final repo = NotificationRepository(
      ApiClient(readToken: () => null, onUnauthorized: () async {}),
      QueryCache(),
    );
    final notifications = [
      AppNotification.fromJson({
        'id': 1,
        'type': 'BOOKING_CONFIRMED',
        'title': 't',
        'message': 'm',
        'isRead': false,
        'createdAt': '2026-01-01T00:00:00.000Z',
      }),
      AppNotification.fromJson({
        'id': 2,
        'type': 'NEW_REVIEW',
        'title': 't',
        'message': 'm',
        'isRead': true,
        'createdAt': '2026-01-01T00:00:00.000Z',
      }),
    ];

    expect(repo.unreadCountOf(notifications), 1);
  });

  test('logout clears the notifications cache like every other key', () async {
    final cache = QueryCache();
    await cache.refresh<List<AppNotification>>(
      NotificationCacheKeys.notifications,
      () async => [
        AppNotification.fromJson({
          'id': 1,
          'type': 'NEW_REVIEW',
          'title': 't',
          'message': 'm',
          'isRead': false,
          'createdAt': '2026-01-01T00:00:00.000Z',
        }),
      ],
    );
    expect(cache.hasKey(NotificationCacheKeys.notifications), isTrue);

    cache.clear();

    expect(cache.hasKey(NotificationCacheKeys.notifications), isFalse);
  });

  group('localization', () {
    test('notification strings are translated, not English fallbacks', () async {
      final ar = await loadL10n('ar');
      expect(ar.notifTitle, isNot('Notifications'));
      expect(ar.notifMarkAllRead, isNot('Mark all read'));
      expect(ar.notifEmpty, isNot('No notifications yet.'));
    });

    testWidgets('notification strings render right-to-left in Arabic', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('ar'),
          supportedLocales: LocaleController.supported,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: Builder(
            builder: (context) =>
                Scaffold(body: Text(AppLocalizations.of(context)!.notifTitle)),
          ),
        ),
      );

      final text = find.text('الإشعارات');
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });
}
