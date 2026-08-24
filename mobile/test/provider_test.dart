import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/provider/data/provider_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/provider/data/provider_repository.dart';
import 'package:smart_automotive_service_app/features/provider/workflow/booking_actions.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

void main() {
  group('provider workflow actions mirror the backend state machine', () {
    late AppLocalizations en;
    setUp(() async => en = await loadL10n('en'));

    test('PENDING offers confirm and reject only', () {
      final ids = providerActionsFor(
        en,
        BookingStatus.pending,
      ).map((a) => a.id);
      expect(ids, ['confirm', 'reject']);
    });

    test('CONFIRMED offers arrive and cancel', () {
      final ids = providerActionsFor(
        en,
        BookingStatus.confirmed,
      ).map((a) => a.id);
      expect(ids, ['arrive', 'cancel']);
    });

    test('ARRIVED goes through the queue endpoint, not a booking PATCH', () {
      final queueAction = providerActionsFor(
        en,
        BookingStatus.arrived,
      ).firstWhere((a) => a.id == 'queue');
      expect(queueAction.kind, ProviderActionKind.queueAdd);
    });

    test(
      'IN_QUEUE start uses the queue endpoint so the booking stays in sync',
      () {
        final start = providerActionsFor(
          en,
          BookingStatus.inQueue,
        ).firstWhere((a) => a.id == 'start');
        expect(start.kind, ProviderActionKind.queueStatus);
        expect(start.targetStatus, 'IN_SERVICE');
        expect(start.needsQueueEntry, isTrue);
      },
    );

    test(
      'IN_QUEUE removal drops the entry rather than PATCHing the booking',
      () {
        final remove = providerActionsFor(
          en,
          BookingStatus.inQueue,
        ).firstWhere((a) => a.id == 'remove');
        expect(remove.kind, ProviderActionKind.queueRemove);
        expect(remove.isDestructive, isTrue);
        expect(remove.needsConfirmation, isTrue);
      },
    );

    test(
      'IN_SERVICE only completes — the backend has no cancel edge from here',
      () {
        final actions = providerActionsFor(en, BookingStatus.inService);
        expect(actions.map((a) => a.id), ['complete']);
        expect(actions.single.targetStatus, 'COMPLETED');
      },
    );

    test('terminal statuses offer nothing', () {
      for (final status in [
        BookingStatus.completed,
        BookingStatus.cancelled,
        BookingStatus.rejected,
      ]) {
        expect(providerActionsFor(en, status), isEmpty, reason: '$status');
      }
    });

    test('every destructive action asks for confirmation first', () {
      for (final status in BookingStatus.values) {
        for (final action in providerActionsFor(en, status)) {
          if (action.isDestructive) {
            expect(
              action.needsConfirmation,
              isTrue,
              reason: '${action.id} on $status must confirm',
            );
          }
        }
      }
    });

    test('only queue-keyed actions declare they need an entry id', () {
      for (final status in BookingStatus.values) {
        for (final action in providerActionsFor(en, status)) {
          final expected =
              action.kind == ProviderActionKind.queueStatus ||
              action.kind == ProviderActionKind.queueRemove;
          expect(action.needsQueueEntry, expected, reason: action.id);
        }
      }
    });

    test('needs-action covers exactly the states awaiting the provider', () {
      final needing = BookingStatus.values
          .where(bookingNeedsProviderAction)
          .toSet();
      expect(needing, {
        BookingStatus.pending,
        BookingStatus.arrived,
        BookingStatus.inQueue,
        BookingStatus.inService,
      });
    });

    test('action labels are translated in Arabic', () async {
      final ar = await loadL10n('ar');
      final english = providerActionsFor(en, BookingStatus.pending).first.label;
      final arabic = providerActionsFor(ar, BookingStatus.pending).first.label;
      expect(arabic, isNot(english));
      expect(arabic, isNotEmpty);
    });
  });

  group('ProviderRealtimeHandler', () {
    late QueryCache cache;
    late ProviderRealtimeHandler handler;

    setUp(() {
      cache = QueryCache();
      handler = ProviderRealtimeHandler(cache);
    });

    Map<String, dynamic> entryJson(
      int id, {
      int position = 1,
      String status = 'WAITING',
    }) => {
      'id': id,
      'status': status,
      'providerId': 1,
      'position': position,
      'customerName': 'Customer $id',
      'joinedAt': '2026-08-16T10:00:00.000Z',
      'provider': {'id': 1, 'businessName': 'Cedars'},
      'providerService': {'id': 1, 'name': 'Oil', 'durationMinutes': 30},
    };

    test('replaces the line from the snapshot and sorts by position', () {
      handler.onProviderQueueUpdated({
        'providerId': 1,
        'entries': [entryJson(3, position: 3), entryJson(1, position: 1)],
        'summary': {
          'providerId': 1,
          'queueLength': 2,
          'estimatedWaitMinutes': 30,
        },
      });

      final entries = cache
          .read<List<QueueEntry>>(ProviderKeys.queue)
          .valueOrNull!;
      expect(entries.map((e) => e.id), [1, 3]);
      expect(entries.first.customerName, 'Customer 1');
      expect(handler.appliedEvents, 1);
    });

    test('a shrinking snapshot removes finished customers', () async {
      handler.onProviderQueueUpdated({
        'providerId': 1,
        'entries': [entryJson(1), entryJson(2, position: 2)],
      });
      expect(
        cache.read<List<QueueEntry>>(ProviderKeys.queue).valueOrNull,
        hasLength(2),
      );

      // The backend snapshot only holds WAITING/IN_SERVICE, so a completed
      // customer simply disappears from it — merging would strand them.
      handler.onProviderQueueUpdated({
        'providerId': 1,
        'entries': [entryJson(2, position: 1)],
      });
      final entries = cache
          .read<List<QueueEntry>>(ProviderKeys.queue)
          .valueOrNull!;
      expect(entries.map((e) => e.id), [2]);
    });

    test('replaying the same snapshot is idempotent', () {
      final event = {
        'providerId': 1,
        'entries': [entryJson(1)],
      };
      handler.onProviderQueueUpdated(event);
      handler.onProviderQueueUpdated(event);
      expect(
        cache.read<List<QueueEntry>>(ProviderKeys.queue).valueOrNull,
        hasLength(1),
      );
    });

    test('ignores another business\'s public status', () async {
      final mine = OwnProviderProfile.fromJson({
        'id': 1,
        'businessName': 'Mine',
        'address': 'a',
        'isOpen': true,
        'isApproved': true,
        'estimatedWaitMinutes': 5,
      });
      await cache.refresh<OwnProviderProfile>(
        ProviderKeys.profile,
        () async => mine,
      );

      handler.onProviderStatusChanged({'providerId': 999, 'isOpen': false});
      expect(
        handler.appliedEvents,
        0,
        reason: 'another business is irrelevant',
      );

      handler.onProviderStatusChanged({'providerId': 1, 'isOpen': false});
      expect(handler.appliedEvents, 1);
    });

    test('a customer-room-only event is a no-op for a provider', () {
      handler.onMyQueueUpdate({'id': 1, 'status': 'WAITING'});
      expect(handler.appliedEvents, 0);
    });

    test(
      'a customer cancellation refreshes the provider booking keys',
      () async {
        var bookingLoads = 0;
        await cache.refresh<List<Booking>>(ProviderKeys.bookings, () async {
          bookingLoads++;
          return const [];
        });

        handler.onBookingStatusChanged({'bookingId': 7, 'status': 'CANCELLED'});
        expect(handler.appliedEvents, 1);

        cache.watch<List<Booking>>(ProviderKeys.bookings, () async {
          bookingLoads++;
          return const [];
        });
        await Future<void>.delayed(const Duration(milliseconds: 10));
        expect(
          bookingLoads,
          2,
          reason: 'the provider list must refetch after a live cancellation',
        );
      },
    );

    test('the queue is left alone by a booking status event', () async {
      var queueLoads = 0;
      await cache.refresh<List<QueueEntry>>(ProviderKeys.queue, () async {
        queueLoads++;
        return const [];
      });

      // A customer can only cancel from PENDING or CONFIRMED, neither of
      // which has a queue row — every queue-driven change arrives as a
      // queue:provider_updated snapshot instead.
      handler.onBookingStatusChanged({'bookingId': 7, 'status': 'CANCELLED'});

      cache.watch<List<QueueEntry>>(ProviderKeys.queue, () async {
        queueLoads++;
        return const [];
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(queueLoads, 1, reason: 'no needless queue refetch');
    });

    test('a booking event without an id is ignored', () {
      handler.onBookingStatusChanged({'status': 'CANCELLED'});
      expect(handler.appliedEvents, 0);
    });

    test('reconnect marks the provider keys stale', () async {
      var loads = 0;
      await cache.refresh<List<QueueEntry>>(ProviderKeys.queue, () async {
        loads++;
        return const [];
      });

      handler.onReconnected();
      cache.watch<List<QueueEntry>>(ProviderKeys.queue, () async {
        loads++;
        return const [];
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(loads, 2, reason: 'reconnect must resync from REST');
    });
  });

  group('provider models', () {
    test('parses the own-profile payload including nested user and rating', () {
      final profile = OwnProviderProfile.fromJson({
        'id': 1,
        'businessName': 'Cedars Auto Care',
        'address': 'Beirut',
        'isApproved': true,
        'isOpen': false,
        'estimatedWaitMinutes': 25,
        'latitude': '33.888630',
        'services': [
          {
            'id': 4,
            'name': 'Battery',
            'price': '15.00',
            'durationMinutes': 15,
            'isAvailable': true,
            'categoryId': 2,
            'category': {'id': 2, 'name': 'Battery'},
          },
        ],
        'user': {'name': 'Maya', 'email': 'p@x.com', 'phone': '+961'},
        'rating': {'averageRating': 4.5, 'reviewCount': 2},
      });

      expect(profile.contactName, 'Maya');
      expect(profile.latitude, closeTo(33.88863, 1e-6));
      expect(profile.services.single.price, 15.0);
      expect(profile.rating.averageRating, 4.5);
    });

    test('provider queue rows carry the customer name and stored position', () {
      final entry = QueueEntry.fromJson({
        'id': 7,
        'status': 'IN_SERVICE',
        'providerId': 1,
        'position': 2,
        'customerName': 'Sami',
        'joinedAt': '2026-08-16T10:00:00.000Z',
        'provider': {'id': 1, 'businessName': 'Cedars'},
        'providerService': {'id': 1, 'name': 'Oil', 'durationMinutes': 30},
      });
      expect(entry.customerName, 'Sami');
      expect(entry.queuePosition, 2);
      expect(entry.status, QueueStatus.inService);
    });

    test('analytics parses without any revenue field', () {
      final analytics = ProviderAnalytics.fromJson({
        'range': '30d',
        'summary': {
          'totalBookings': 9,
          'completedBookings': 3,
          'cancelledBookings': 2,
          'cancellationRate': 22.2,
          'averageWaitMinutes': 15,
          'averageRating': null,
          'reviewCount': 0,
          'queueEntriesHandled': 5,
        },
        'popularServices': [
          {'service': 'Oil', 'bookings': 7},
        ],
        'busyHours': [
          {'hour': '09:00', 'bookings': 3},
        ],
        'statusBreakdown': [
          {'status': 'COMPLETED', 'count': 3},
        ],
        'ratingDistribution': [
          {'stars': 5, 'count': 0},
        ],
      });

      expect(analytics.totalBookings, 9);
      // Null rating must stay null so the UI shows a dash, not 0.0.
      expect(analytics.averageRating, isNull);
      expect(analytics.popularServices.single.label, 'Oil');
      expect(analytics.busyHours.single.count, 3);
    });
  });

  group('provider localization', () {
    late AppLocalizations en;
    late AppLocalizations ar;
    setUp(() async {
      en = await loadL10n('en');
      ar = await loadL10n('ar');
    });

    test('provider navigation is translated, not an English fallback', () {
      final pairs = <(String, String)>[
        (en.pNavOverview, ar.pNavOverview),
        (en.pNavBookings, ar.pNavBookings),
        (en.pNavQueue, ar.pNavQueue),
        (en.pNavServices, ar.pNavServices),
        (en.pNavMore, ar.pNavMore),
      ];
      for (final (english, arabic) in pairs) {
        expect(arabic, isNotEmpty);
        expect(
          arabic,
          isNot(english),
          reason: '"$english" must actually be translated',
        );
      }
    });

    testWidgets('provider strings render right-to-left in Arabic', (
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
                Scaffold(body: Text(AppLocalizations.of(context)!.pNavQueue)),
          ),
        ),
      );

      final text = find.text(ar.pNavQueue);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });
}
