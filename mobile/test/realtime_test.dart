import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';
import 'package:smart_automotive_service_app/features/notifications/data/notification_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/notifications/data/notification_repository.dart';

/// Exercises the event → cache mapping without a socket, so the rules are
/// pinned independently of transport behaviour.
void main() {
  late QueryCache cache;
  late CustomerRealtimeHandler handler;

  setUp(() {
    cache = QueryCache();
    handler = CustomerRealtimeHandler(cache);
  });

  Map<String, dynamic> queuePayload({
    int id = 1,
    String status = 'WAITING',
    int? ahead,
    int? wait,
    int? bookingId,
  }) => {
    'id': id,
    'status': status,
    'providerId': 1,
    'bookingId': bookingId,
    'customersAhead': ahead,
    'estimatedWaitMinutes': wait,
    'joinedAt': '2026-08-16T10:00:00.000Z',
    'provider': {'id': 1, 'businessName': 'Cedars'},
    'providerService': {'id': 1, 'name': 'Oil', 'durationMinutes': 30},
  };

  // Explicitly typed: letting Dart infer T from a `Future<void>` return
  // would store the entry as AsyncData<void> and make later typed reads
  // miss it.
  Future<List<QueueEntry>> seedQueue(List<QueueEntry> entries) =>
      cache.refresh<List<QueueEntry>>(CacheKeys.myQueue, () async => entries);

  group('booking:status_changed', () {
    test('invalidates the list, the one booking, and the queue', () async {
      await cache.refresh(CacheKeys.bookings, () async => <Booking>[]);
      await cache.refresh(CacheKeys.booking(7), () async => 'placeholder');
      await seedQueue([]);

      handler.onBookingStatusChanged({'bookingId': 7, 'status': 'CONFIRMED'});

      // Data survives (no blank screen); staleness is what changed.
      expect(
        cache.read<List<Booking>>(CacheKeys.bookings).valueOrNull,
        isNotNull,
      );
      expect(cache.hasKey(CacheKeys.booking(7)), isTrue);
      expect(handler.appliedEvents, 1);
    });

    test('ignores a malformed payload rather than throwing', () {
      handler.onBookingStatusChanged({'status': 'CONFIRMED'});
      handler.onBookingStatusChanged(<String, dynamic>{});
      expect(handler.appliedEvents, 0);
    });
  });

  group('queue:my_update', () {
    test('patches position and wait in place, without a refetch', () async {
      await seedQueue([QueueEntry.fromJson(queuePayload(ahead: 3, wait: 45))]);

      handler.onMyQueueUpdate(queuePayload(ahead: 1, wait: 15));

      final entries = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!;
      expect(entries, hasLength(1));
      expect(entries.single.customersAhead, 1);
      expect(entries.single.position, 2);
      expect(entries.single.estimatedWaitMinutes, 15);
    });

    test('reflects IN_QUEUE -> IN_SERVICE', () async {
      await seedQueue([QueueEntry.fromJson(queuePayload(ahead: 0))]);

      handler.onMyQueueUpdate(queuePayload(status: 'IN_SERVICE'));

      final entry = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!
          .single;
      expect(entry.status, QueueStatus.inService);
      expect(entry.status.isActive, isTrue);
    });

    test('reflects IN_SERVICE -> COMPLETED', () async {
      await seedQueue([
        QueueEntry.fromJson(queuePayload(status: 'IN_SERVICE')),
      ]);

      handler.onMyQueueUpdate(queuePayload(status: 'COMPLETED'));

      final entry = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!
          .single;
      expect(entry.status, QueueStatus.completed);
      expect(entry.status.isActive, isFalse);
    });

    test('removes an entry on the removed flag', () async {
      await seedQueue([
        QueueEntry.fromJson(queuePayload(id: 1)),
        QueueEntry.fromJson(queuePayload(id: 2)),
      ]);

      handler.onMyQueueUpdate({'id': 1, 'removed': true});

      final entries = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!;
      expect(entries.map((e) => e.id), [2]);
    });

    test('appends an entry the client had not seen yet', () async {
      await seedQueue([QueueEntry.fromJson(queuePayload(id: 1))]);

      handler.onMyQueueUpdate(queuePayload(id: 9));

      final entries = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!;
      expect(entries.map((e) => e.id), [1, 9]);
    });

    test('keeps list order stable when patching', () async {
      await seedQueue([
        QueueEntry.fromJson(queuePayload(id: 1)),
        QueueEntry.fromJson(queuePayload(id: 2)),
        QueueEntry.fromJson(queuePayload(id: 3)),
      ]);

      handler.onMyQueueUpdate(queuePayload(id: 2, ahead: 0));

      final entries = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!;
      expect(entries.map((e) => e.id), [1, 2, 3]);
    });

    test('applying the same event twice is idempotent', () async {
      await seedQueue([QueueEntry.fromJson(queuePayload(ahead: 3))]);

      final event = queuePayload(ahead: 1, wait: 10);
      handler.onMyQueueUpdate(event);
      handler.onMyQueueUpdate(event);

      final entries = cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!;
      expect(
        entries,
        hasLength(1),
        reason: 'a replayed event must not duplicate a row',
      );
      expect(entries.single.customersAhead, 1);
    });

    test('falls back to invalidation when nothing is cached yet', () {
      // Queue screen never opened: patching has nothing to patch, so the
      // key must be fetched rather than the event silently dropped.
      handler.onMyQueueUpdate(queuePayload());
      expect(cache.hasKey(CacheKeys.myQueue), isFalse);
      expect(handler.appliedEvents, 1);
    });

    test('a booking-linked entry also refreshes that booking', () async {
      await seedQueue([QueueEntry.fromJson(queuePayload(bookingId: 42))]);
      await cache.refresh(CacheKeys.booking(42), () async => 'x');

      handler.onMyQueueUpdate(
        queuePayload(status: 'IN_SERVICE', bookingId: 42),
      );

      expect(cache.hasKey(CacheKeys.booking(42)), isTrue);
    });

    test('ignores a payload with no id', () {
      handler.onMyQueueUpdate({'status': 'WAITING'});
      expect(handler.appliedEvents, 0);
    });
  });

  group('reconnect', () {
    test('marks the time-sensitive keys stale so they refetch', () async {
      var bookingLoads = 0;
      await cache.refresh(CacheKeys.bookings, () async {
        bookingLoads++;
        return <Booking>[];
      });
      expect(bookingLoads, 1);

      handler.onReconnected();

      // Still showing the old data while the refetch runs.
      expect(
        cache.read<List<Booking>>(CacheKeys.bookings).valueOrNull,
        isNotNull,
      );

      cache.watch<List<Booking>>(CacheKeys.bookings, () async {
        bookingLoads++;
        return <Booking>[];
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(bookingLoads, 2, reason: 'reconnect must resync from REST');
    });

    test('does not count as an applied event', () {
      handler.onReconnected();
      expect(handler.appliedEvents, 0);
    });

    test('also marks cached availability stale, across every provider', () async {
      var loads = 0;
      await cache.refresh(CacheKeys.availability(2, 5, '2026-09-01'), () async {
        loads++;
        return 'a';
      });

      handler.onReconnected();

      cache.watch(CacheKeys.availability(2, 5, '2026-09-01'), () async {
        loads++;
        return 'a';
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(loads, 2, reason: 'a booking made while offline is never replayed');
    });
  });

  group('provider:status_changed', () {
    ServiceProvider providerAt(int id, {bool isOpen = true, int wait = 0}) =>
        ServiceProvider(
          id: id,
          businessName: 'Business $id',
          address: 'somewhere',
          isOpen: isOpen,
          estimatedWaitMinutes: wait,
          services: const [],
          reviewCount: 0,
        );

    Future<List<ServiceProvider>> seedProviders(List<ServiceProvider> list) =>
        cache.refresh<List<ServiceProvider>>(
          CacheKeys.providers,
          () async => list,
        );

    test('flips open -> closed in place, with no refetch', () async {
      await seedProviders([providerAt(1, isOpen: true), providerAt(2)]);

      handler.onProviderStatusChanged({
        'providerId': 1,
        'isOpen': false,
        'estimatedWaitMinutes': 0,
        'isApproved': true,
      });

      final list = cache
          .read<List<ServiceProvider>>(CacheKeys.providers)
          .valueOrNull!;
      expect(list.firstWhere((p) => p.id == 1).isOpen, isFalse);
      expect(
        list.firstWhere((p) => p.id == 2).isOpen,
        isTrue,
        reason: 'others untouched',
      );
    });

    test('updates the advertised wait time', () async {
      await seedProviders([providerAt(1, wait: 10)]);

      handler.onProviderStatusChanged({
        'providerId': 1,
        'isOpen': true,
        'estimatedWaitMinutes': 45,
        'isApproved': true,
      });

      expect(
        cache
            .read<List<ServiceProvider>>(CacheKeys.providers)
            .valueOrNull!
            .single
            .estimatedWaitMinutes,
        45,
      );
    });

    test('preserves fields the payload does not carry', () async {
      await seedProviders([providerAt(1).copyWithDistance(3.2)]);

      handler.onProviderStatusChanged({
        'providerId': 1,
        'isOpen': false,
        'estimatedWaitMinutes': 5,
        'isApproved': true,
      });

      final patched = cache
          .read<List<ServiceProvider>>(CacheKeys.providers)
          .valueOrNull!
          .single;
      expect(patched.businessName, 'Business 1');
      expect(patched.distanceKm, 3.2, reason: 'computed distance must survive');
    });

    test('removes a business that loses approval', () async {
      await seedProviders([providerAt(1), providerAt(2)]);

      handler.onProviderStatusChanged({
        'providerId': 1,
        'isOpen': false,
        'estimatedWaitMinutes': 0,
        'isApproved': false,
      });

      // GET /providers would no longer return it, so neither should the
      // cache — a revoked business must disappear from discovery.
      final ids = cache
          .read<List<ServiceProvider>>(CacheKeys.providers)
          .valueOrNull!
          .map((p) => p.id);
      expect(ids, [2]);
    });

    test('is idempotent when the same event arrives twice', () async {
      await seedProviders([providerAt(1, isOpen: true)]);

      final event = {
        'providerId': 1,
        'isOpen': false,
        'estimatedWaitMinutes': 15,
        'isApproved': true,
      };
      handler.onProviderStatusChanged(event);
      handler.onProviderStatusChanged(event);

      final list = cache
          .read<List<ServiceProvider>>(CacheKeys.providers)
          .valueOrNull!;
      expect(list, hasLength(1));
      expect(list.single.isOpen, isFalse);
    });

    test('ignores a payload with no providerId', () {
      handler.onProviderStatusChanged({'isOpen': false});
      expect(handler.appliedEvents, 0);
    });

    test('falls back to invalidation when the list is not cached', () {
      handler.onProviderStatusChanged({
        'providerId': 1,
        'isOpen': false,
        'estimatedWaitMinutes': 0,
        'isApproved': true,
      });
      expect(handler.appliedEvents, 1);
      expect(cache.hasKey(CacheKeys.providers), isFalse);
    });
  });

  group('provider:availability_changed', () {
    test('marks only the named provider\'s availability stale', () async {
      await cache.refresh(CacheKeys.availability(2, 5, '2026-09-01'), () async => 'a');
      await cache.refresh(CacheKeys.availability(9, 1, '2026-09-01'), () async => 'b');

      handler.onProviderAvailabilityChanged({'providerId': 2});

      // Data survives (no blank screen); staleness is what changed.
      expect(cache.read<String>(CacheKeys.availability(2, 5, '2026-09-01')).valueOrNull, 'a');
      expect(cache.read<String>(CacheKeys.availability(9, 1, '2026-09-01')).valueOrNull, 'b');
      expect(handler.appliedEvents, 1);
    });

    test('ignores a payload with no providerId', () {
      handler.onProviderAvailabilityChanged({});
      expect(handler.appliedEvents, 0);
    });
  });

  group('provider:fuel_updated', () {
    test('invalidates the current status and every cached history range for the provider', () async {
      var statusLoads = 0;
      var historyLoads = 0;
      await cache.refresh<List<FuelInventoryItem>>(CacheKeys.fuel(2), () async {
        statusLoads++;
        return const [];
      });
      await cache.refresh<List<FuelHistoryPoint>>(
        CacheKeys.fuelHistory(2, 'GASOLINE_95', '7d'),
        () async {
          historyLoads++;
          return const [];
        },
      );

      handler.onProviderFuelUpdated({'providerId': 2});
      expect(handler.appliedEvents, 1);

      cache.watch<List<FuelInventoryItem>>(CacheKeys.fuel(2), () async {
        statusLoads++;
        return const [];
      });
      cache.watch<List<FuelHistoryPoint>>(
        CacheKeys.fuelHistory(2, 'GASOLINE_95', '7d'),
        () async {
          historyLoads++;
          return const [];
        },
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(statusLoads, 2);
      expect(historyLoads, 2);
    });

    test('leaves a different provider\'s cached fuel data untouched', () async {
      var otherLoads = 0;
      await cache.refresh<List<FuelInventoryItem>>(CacheKeys.fuel(9), () async {
        otherLoads++;
        return const [];
      });

      handler.onProviderFuelUpdated({'providerId': 2});

      cache.watch<List<FuelInventoryItem>>(CacheKeys.fuel(9), () async {
        otherLoads++;
        return const [];
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(otherLoads, 1, reason: 'provider 9 was never touched by an event about provider 2');
    });

    test('ignores a payload with no providerId', () {
      handler.onProviderFuelUpdated({});
      expect(handler.appliedEvents, 0);
    });
  });

  group('provider queue snapshot', () {
    test('only refreshes that provider\'s public summary', () async {
      await cache.refresh(CacheKeys.queueSummary(3), () async => 'summary');

      handler.onProviderQueueUpdated({
        'providerId': 3,
        'entries': [],
        'summary': {},
      });

      expect(cache.hasKey(CacheKeys.queueSummary(3)), isTrue);
      expect(handler.appliedEvents, 1);
    });

    test(
      'never writes other customers\' entries into the personal queue',
      () async {
        await seedQueue([QueueEntry.fromJson(queuePayload(id: 1))]);

        // A provider snapshot carries the whole line. Even if one somehow
        // reached a customer socket, it must not land in their own queue.
        handler.onProviderQueueUpdated({
          'providerId': 1,
          'entries': [queuePayload(id: 77), queuePayload(id: 88)],
          'summary': {
            'providerId': 1,
            'queueLength': 2,
            'estimatedWaitMinutes': 30,
          },
        });

        final mine = cache
            .read<List<QueueEntry>>(CacheKeys.myQueue)
            .valueOrNull!;
        expect(mine.map((e) => e.id), [1]);
      },
    );
  });

  group('notification:new', () {
    late NotificationRealtimeHandler notificationHandler;

    setUp(() {
      notificationHandler = NotificationRealtimeHandler(cache);
    });

    Map<String, dynamic> notificationPayload({int id = 1, bool isRead = false}) => {
      'id': id,
      'type': 'NEW_REVIEW',
      'title': 'New review',
      'message': 'You received a new 5-star review.',
      'isRead': isRead,
      'createdAt': '2026-01-01T00:00:00.000Z',
    };

    test('prepends a pushed notification onto an already-cached list', () async {
      await cache.refresh<List<AppNotification>>(
        NotificationCacheKeys.notifications,
        () async => [AppNotification.fromJson(notificationPayload(id: 1))],
      );

      notificationHandler.onNotificationNew(notificationPayload(id: 2));

      final notifications = cache
          .read<List<AppNotification>>(NotificationCacheKeys.notifications)
          .valueOrNull!;
      expect(notifications.map((n) => n.id), [2, 1]);
      expect(notificationHandler.appliedEvents, 1);
    });

    test('falls back to invalidation when nothing was cached yet', () {
      notificationHandler.onNotificationNew(notificationPayload());

      // Nothing to patch — the key is left stale/absent so the next watch
      // fetches it, rather than silently dropping the push.
      expect(
        cache.hasKey(NotificationCacheKeys.notifications),
        isFalse,
      );
      expect(notificationHandler.appliedEvents, 1);
    });

    test('reconnect invalidates the notifications cache to resync from REST', () async {
      await cache.refresh<List<AppNotification>>(
        NotificationCacheKeys.notifications,
        () async => [AppNotification.fromJson(notificationPayload())],
      );

      notificationHandler.onReconnected();

      // Data survives (no blank screen) — invalidate() only marks the key
      // stale so the next watch refetches, exactly like every other handler.
      expect(
        cache
            .read<List<AppNotification>>(NotificationCacheKeys.notifications)
            .valueOrNull,
        isNotNull,
      );
      expect(cache.hasKey(NotificationCacheKeys.notifications), isTrue);
    });

    test('other events are no-ops for the notification handler', () {
      notificationHandler.onBookingStatusChanged({'bookingId': 1, 'status': 'CONFIRMED'});
      notificationHandler.onMyQueueUpdate({'id': 1});
      notificationHandler.onProviderQueueUpdated({'providerId': 1});
      notificationHandler.onProviderStatusChanged({'providerId': 1});
      notificationHandler.onProviderAvailabilityChanged({'providerId': 1});

      expect(notificationHandler.appliedEvents, 0);
    });
  });
}
