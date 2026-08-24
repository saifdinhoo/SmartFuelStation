import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/location/location_service.dart';
import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/state/async_value.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/customer/queue/queue_display.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/booking_status_ui.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

void main() {
  group('model parsing tolerates the shapes Prisma actually sends', () {
    test('reads Decimal price and coordinates delivered as strings', () {
      final provider = ServiceProvider.fromJson({
        'id': 1,
        'businessName': 'Cedars Auto Care',
        'address': 'Beirut',
        'isOpen': true,
        'latitude': '33.888630',
        'longitude': '35.495480',
        'estimatedWaitMinutes': 25,
        '_count': {'reviews': 3},
        'services': [
          {
            'id': 9,
            'name': 'Oil Change',
            'price': '42.50',
            'durationMinutes': 30,
            'isAvailable': true,
            'categoryId': 2,
            'category': {'id': 2, 'name': 'Oil'},
          },
        ],
      });

      expect(provider.latitude, closeTo(33.88863, 1e-6));
      expect(provider.services.single.price, 42.5);
      expect(provider.reviewCount, 3);
    });

    test('survives missing nested relations without throwing', () {
      final provider = ServiceProvider.fromJson({'id': 2, 'businessName': 'X'});
      expect(provider.services, isEmpty);
      expect(provider.reviewCount, 0);
      expect(provider.latitude, isNull);
    });

    test('lowestPrice ignores unavailable services', () {
      ProviderService svc(int id, double price, bool available) =>
          ProviderService.fromJson({
            'id': id,
            'name': 's$id',
            'price': price,
            'durationMinutes': 10,
            'isAvailable': available,
            'categoryId': 1,
            'category': {'id': 1, 'name': 'c'},
          });

      final provider = ServiceProvider(
        id: 1,
        businessName: 'X',
        address: 'a',
        isOpen: true,
        estimatedWaitMinutes: 0,
        reviewCount: 0,
        services: [svc(1, 5, false), svc(2, 20, true), svc(3, 30, true)],
      );

      expect(provider.lowestPrice, 20);
    });

    test('maps every booking status the backend can return', () {
      expect(BookingStatus.fromApi('IN_QUEUE'), BookingStatus.inQueue);
      expect(BookingStatus.fromApi('IN_SERVICE'), BookingStatus.inService);
      expect(BookingStatus.fromApi('REJECTED'), BookingStatus.rejected);
    });

    test('only pending and confirmed are customer-cancellable', () {
      final cancellable = BookingStatus.values
          .where((s) => s.customerCanCancel)
          .toSet();
      expect(cancellable, {BookingStatus.pending, BookingStatus.confirmed});
    });

    test('queue position is one more than the customers ahead', () {
      final entry = QueueEntry.fromJson({
        'id': 5,
        'status': 'WAITING',
        'providerId': 1,
        'customersAhead': 2,
        'estimatedWaitMinutes': 30,
        'joinedAt': '2026-08-16T10:00:00.000Z',
        'provider': {'id': 1, 'businessName': 'Cedars'},
        'providerService': {'id': 1, 'name': 'Oil', 'durationMinutes': 30},
      });
      expect(entry.position, 3);
      expect(entry.status.isActive, isTrue);
    });

    test('rating summary keeps null distinct from zero', () {
      final none = RatingSummary.fromJson({
        'averageRating': null,
        'reviewCount': 0,
      });
      expect(none.averageRating, isNull);
      final some = RatingSummary.fromJson({
        'averageRating': 4.5,
        'reviewCount': 2,
      });
      expect(some.averageRating, 4.5);
    });
  });

  group('QueryCache', () {
    test('caches a value so a second read does not refetch', () async {
      final cache = QueryCache();
      var calls = 0;
      Future<int> loader() async {
        calls++;
        return 7;
      }

      await cache.refresh('k', loader);
      expect(cache.read<int>('k'), isA<AsyncData<int>>());
      expect(calls, 1);

      cache.watch<int>('k', loader);
      await Future<void>.delayed(Duration.zero);
      expect(calls, 1, reason: 'fresh entries must not refetch');
    });

    test('dedupes concurrent requests for the same key', () async {
      final cache = QueryCache();
      var calls = 0;
      Future<int> loader() async {
        calls++;
        await Future<void>.delayed(const Duration(milliseconds: 20));
        return 1;
      }

      await Future.wait([
        cache.refresh('k', loader),
        cache.refresh('k', loader),
        cache.refresh('k', loader),
      ]);

      expect(calls, 1, reason: 'three asks, one request');
    });

    test('invalidate keeps the data but allows a refetch', () async {
      final cache = QueryCache();
      var calls = 0;
      Future<int> loader() async {
        calls++;
        return calls;
      }

      await cache.refresh('k', loader);
      cache.invalidate('k');

      // Data survives so the UI does not blank out.
      expect(cache.read<int>('k').valueOrNull, 1);

      cache.watch<int>('k', loader);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(calls, 2);
    });

    test('invalidatePrefix hits a whole family of keys', () async {
      final cache = QueryCache();
      await cache.refresh('provider/1/reviews', () async => 'a');
      await cache.refresh('provider/2/reviews', () async => 'b');
      await cache.refresh('bookings', () async => 'c');

      cache.invalidatePrefix('provider/');

      // All three still hold data; staleness is what changed.
      expect(cache.read<String>('provider/1/reviews').valueOrNull, 'a');
      expect(cache.read<String>('bookings').valueOrNull, 'c');
    });

    test(
      'surfaces a failure as AsyncError and rethrows to the caller',
      () async {
        final cache = QueryCache();
        await expectLater(
          cache.refresh<int>(
            'k',
            () async => throw ApiException('boom', statusCode: 500),
          ),
          throwsA(isA<ApiException>()),
        );
        expect(cache.read<int>('k'), isA<AsyncError<int>>());
        expect(cache.read<int>('k').errorOrNull?.message, 'boom');
      },
    );

    test('clear drops everything, so a new session starts empty', () async {
      final cache = QueryCache();
      await cache.refresh('bookings', () async => 1);
      expect(cache.hasKey('bookings'), isTrue);
      cache.clear();
      expect(cache.hasKey('bookings'), isFalse);
    });
  });

  group('queue display', () {
    late AppLocalizations en;
    setUp(() async => en = await loadL10n('en'));

    QueueEntry entry(QueueStatus status, {int? ahead, int? wait}) => QueueEntry(
      id: 1,
      status: status,
      providerId: 1,
      providerName: 'Cedars',
      serviceName: 'Oil',
      joinedAt: DateTime.now(),
      customersAhead: ahead,
      estimatedWaitMinutes: wait,
    );

    test('says nothing before the customer has arrived', () {
      expect(deriveQueueDisplay(en, null, BookingStatus.pending), isNull);
      expect(deriveQueueDisplay(en, null, BookingStatus.confirmed), isNull);
    });

    test('explains the gap between arriving and being queued', () {
      final display = deriveQueueDisplay(en, null, BookingStatus.arrived);
      expect(display, isNotNull);
      expect(display!.tone, QueueTone.neutral);
    });

    test('says "you\'re next" rather than "#1 in line"', () {
      final display = deriveQueueDisplay(
        en,
        entry(QueueStatus.waiting, ahead: 0, wait: 5),
        BookingStatus.inQueue,
      )!;
      expect(display.headline, en.queueYoureNext);
      expect(display.tone, QueueTone.waiting);
    });

    test('reports the real position when others are ahead', () {
      final display = deriveQueueDisplay(
        en,
        entry(QueueStatus.waiting, ahead: 3, wait: 45),
        BookingStatus.inQueue,
      )!;
      expect(display.headline, contains('4'));
      expect(display.detail, contains('45'));
    });

    test('switches tone once service starts', () {
      final display = deriveQueueDisplay(
        en,
        entry(QueueStatus.inService),
        BookingStatus.inService,
      )!;
      expect(display.tone, QueueTone.active);
    });
  });

  group('localization of new customer strings', () {
    test('booking statuses are translated in both locales', () async {
      final en = await loadL10n('en');
      final ar = await loadL10n('ar');

      for (final status in BookingStatus.values) {
        final english = bookingStatusLabel(en, status);
        final arabic = bookingStatusLabel(ar, status);
        expect(english, isNotEmpty);
        expect(arabic, isNotEmpty);
        expect(
          arabic,
          isNot(english),
          reason: '$status must actually be translated, not fall back',
        );
      }
    });

    test('queue strings are translated, not English fallbacks', () async {
      final ar = await loadL10n('ar');
      expect(ar.queueYoureNext, isNot('You\'re next'));
      expect(ar.navExplore, isNot('Explore'));
      expect(ar.bookingSubmit, isNot('Request booking'));
    });

    testWidgets('customer strings render right-to-left in Arabic', (
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
                Scaffold(body: Text(AppLocalizations.of(context)!.navBookings)),
          ),
        ),
      );

      final text = find.text('الحجوزات');
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });

  group('distance', () {
    test('computes a real great-circle distance', () {
      // Beirut -> Byblos is roughly 37 km.
      const beirut = LatLng(33.8886, 35.4955);
      final km = distanceKmBetween(beirut, 34.1230, 35.6519);
      expect(km, greaterThan(25));
      expect(km, lessThan(45));
    });

    test('is zero at the same point', () {
      const p = LatLng(33.8886, 35.4955);
      expect(distanceKmBetween(p, 33.8886, 35.4955), closeTo(0, 0.001));
    });
  });
}
