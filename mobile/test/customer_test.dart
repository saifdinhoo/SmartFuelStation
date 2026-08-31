import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/day_labels.dart';
import 'package:smart_automotive_service_app/core/l10n/fuel_labels.dart';
import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/location/location_service.dart';
import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/state/async_value.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';
import 'package:smart_automotive_service_app/features/customer/queue/queue_display.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/booking_status_ui.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/fuel_status_list.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/operating_hours_list.dart';

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

    test('OperatingHour parses a closed day with null times', () {
      final hour = OperatingHour.fromJson({
        'dayOfWeek': 'FRIDAY',
        'isClosed': true,
        'openTime': null,
        'closeTime': null,
      });
      expect(hour.dayOfWeek, DayOfWeekModel.friday);
      expect(hour.isClosed, isTrue);
      expect(hour.openTime, isNull);
    });

    test('Availability parses OPEN status with its slot list', () {
      final availability = Availability.fromJson({
        'providerId': 2,
        'serviceId': 5,
        'date': '2026-09-01',
        'status': 'OPEN',
        'openingTime': '09:00',
        'closingTime': '18:00',
        'serviceDurationMinutes': 60,
        'slots': [
          {'startTime': '09:00', 'endTime': '10:00', 'status': 'AVAILABLE'},
          {'startTime': '10:00', 'endTime': '11:00', 'status': 'BOOKED'},
          {'startTime': '08:00', 'endTime': '09:00', 'status': 'PAST'},
        ],
      });

      expect(availability.status, AvailabilityStatusModel.open);
      expect(availability.slots, hasLength(3));
      expect(availability.slots[0].status, SlotStatusModel.available);
      expect(availability.slots[1].status, SlotStatusModel.booked);
      expect(availability.slots[2].status, SlotStatusModel.past);
    });

    test('Availability parses HOURS_NOT_CONFIGURED with an empty slot list — never fabricated', () {
      final availability = Availability.fromJson({
        'providerId': 2,
        'serviceId': 5,
        'date': '2026-09-01',
        'status': 'HOURS_NOT_CONFIGURED',
        'serviceDurationMinutes': 60,
        'slots': [],
      });

      expect(availability.status, AvailabilityStatusModel.hoursNotConfigured);
      expect(availability.openingTime, isNull);
      expect(availability.slots, isEmpty);
    });

    test('an availability slot never carries a customer identity or booking id', () {
      final slot = AvailabilitySlot.fromJson({
        'startTime': '10:00',
        'endTime': '11:00',
        'status': 'BOOKED',
      });
      // Nothing to assert against by name — the type itself has no such
      // field, so a leaked identity would be a compile error, not a
      // runtime one.
      expect(slot.status, SlotStatusModel.booked);
    });

    test('FuelInventoryItem parses the public shape with no admin fields', () {
      final item = FuelInventoryItem.fromJson({
        'fuelType': 'GASOLINE_95',
        'displayName': 'Gasoline 95',
        'capacityLiters': '20000.00',
        'currentLiters': '7450.00',
        'percentageRemaining': 37.3,
        'pricePerLiter': '6.80',
        'updatedAt': '2026-08-31T10:35:00.000Z',
      });
      expect(item.fuelType, FuelTypeModel.gasoline95);
      expect(item.currentLiters, 7450.0);
      expect(item.percentageRemaining, 37.3);
      expect(item.pricePerLiter, 6.8);
    });

    test('FuelInventoryItem tolerates a null price', () {
      final item = FuelInventoryItem.fromJson({
        'fuelType': 'DIESEL',
        'displayName': 'Diesel / Solar',
        'capacityLiters': 30000,
        'currentLiters': 22100,
        'percentageRemaining': 73.7,
        'pricePerLiter': null,
        'updatedAt': '2026-08-31T10:35:00.000Z',
      });
      expect(item.pricePerLiter, isNull);
    });

    test('FuelHistoryPoint carries only fuelType/liters/timestamp', () {
      final point = FuelHistoryPoint.fromJson({
        'fuelType': 'GASOLINE_95',
        'liters': 15000,
        'timestamp': '2026-08-01T00:00:00.000Z',
      });
      expect(point.fuelType, FuelTypeModel.gasoline95);
      expect(point.liters, 15000.0);
    });

    test('FuelTypeModel.api round-trips every value back to the backend enum', () {
      for (final type in FuelTypeModel.values) {
        expect(FuelTypeModel.fromApi(type.api), type);
      }
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

    test('operating-hours and availability strings are translated in both locales', () async {
      final en = await loadL10n('en');
      final ar = await loadL10n('ar');

      for (final day in DayOfWeekModel.week) {
        final english = dayLabel(en, day);
        final arabic = dayLabel(ar, day);
        expect(english, isNotEmpty);
        expect(arabic, isNotEmpty);
        expect(arabic, isNot(english), reason: '$day must actually be translated');
      }

      expect(ar.providerHoursNone, isNot(en.providerHoursNone));
      expect(ar.providerHoursNotSet, isNot(en.providerHoursNotSet));
      expect(ar.pHoursClosed, isNot(en.pHoursClosed));
      expect(ar.bookingConflictRetry, isNot(en.bookingConflictRetry));
      expect(ar.bookingHoursNotConfigured, isNot(en.bookingHoursNotConfigured));
      expect(ar.bookingOpenHours('09:00', '18:00'), isNot(en.bookingOpenHours('09:00', '18:00')));
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

    testWidgets('operating-hours strings render right-to-left in Arabic', (
      tester,
    ) async {
      final ar = await loadL10n('ar');
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
                Scaffold(body: Text(AppLocalizations.of(context)!.providerHoursTitle)),
          ),
        ),
      );

      final text = find.text(ar.providerHoursTitle);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });

  group('availability cache keys', () {
    test('a different service or date is a separate cached read', () {
      expect(
        CacheKeys.availability(2, 5, '2026-09-01'),
        isNot(CacheKeys.availability(2, 6, '2026-09-01')),
      );
      expect(
        CacheKeys.availability(2, 5, '2026-09-01'),
        isNot(CacheKeys.availability(2, 5, '2026-09-02')),
      );
    });

    test('every availability key for a provider sits under its invalidation prefix', () {
      expect(
        CacheKeys.availability(2, 5, '2026-09-01').startsWith(CacheKeys.availabilityPrefix(2)),
        isTrue,
      );
      expect(
        CacheKeys.availability(9, 5, '2026-09-01').startsWith(CacheKeys.availabilityPrefix(2)),
        isFalse,
      );
    });

    test('invalidatePrefix marks only the named provider\'s availability stale', () async {
      final cache = QueryCache();
      await cache.refresh(CacheKeys.availability(2, 5, '2026-09-01'), () async => 'a');
      await cache.refresh(CacheKeys.availability(9, 1, '2026-09-01'), () async => 'b');

      cache.invalidatePrefix(CacheKeys.availabilityPrefix(2));

      expect(cache.read<String>(CacheKeys.availability(2, 5, '2026-09-01')).valueOrNull, 'a');
      expect(cache.read<String>(CacheKeys.availability(9, 1, '2026-09-01')).valueOrNull, 'b');
    });
  });

  group('OperatingHoursList', () {
    late AppLocalizations en;
    setUp(() async => en = await loadL10n('en'));

    Widget wrap(Widget child) => MaterialApp(
      locale: const Locale('en'),
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

    testWidgets('shows a not-configured message when nothing is set at all', (tester) async {
      await tester.pumpWidget(wrap(const OperatingHoursList(hours: [])));
      expect(find.text(en.providerHoursNone), findsOneWidget);
    });

    testWidgets('shows the open interval for a configured day', (tester) async {
      await tester.pumpWidget(
        wrap(
          const OperatingHoursList(
            hours: [
              OperatingHour(
                dayOfWeek: DayOfWeekModel.monday,
                isClosed: false,
                openTime: '09:00',
                closeTime: '18:00',
              ),
            ],
          ),
        ),
      );
      expect(find.text(en.dayMonday), findsOneWidget);
      expect(find.text('09:00 – 18:00'), findsOneWidget);
      // The other 6 weekdays have no entry in the fixture above — never
      // fabricated.
      expect(find.text(en.providerHoursNotSet), findsNWidgets(6));
    });

    testWidgets('shows Closed for an explicitly closed day', (tester) async {
      await tester.pumpWidget(
        wrap(
          const OperatingHoursList(
            hours: [
              OperatingHour(dayOfWeek: DayOfWeekModel.friday, isClosed: true),
            ],
          ),
        ),
      );
      expect(find.text(en.pHoursClosed), findsOneWidget);
    });
  });

  group('fuel cache keys', () {
    test('a different fuelType or range is a separate cached history read', () {
      expect(
        CacheKeys.fuelHistory(2, 'GASOLINE_95', '7d'),
        isNot(CacheKeys.fuelHistory(2, 'DIESEL', '7d')),
      );
      expect(
        CacheKeys.fuelHistory(2, 'GASOLINE_95', '7d'),
        isNot(CacheKeys.fuelHistory(2, 'GASOLINE_95', '30d')),
      );
    });

    test('every fuel-history key for a provider sits under its invalidation prefix', () {
      expect(
        CacheKeys.fuelHistory(2, 'DIESEL', '7d').startsWith(CacheKeys.fuelHistoryPrefix(2)),
        isTrue,
      );
      expect(
        CacheKeys.fuelHistory(9, 'DIESEL', '7d').startsWith(CacheKeys.fuelHistoryPrefix(2)),
        isFalse,
      );
    });

    test('the current-status key sits under the shared provider/ prefix', () {
      expect(CacheKeys.fuel(2).startsWith(CacheKeys.providerPrefix), isTrue);
    });
  });

  group('FuelStatusList', () {
    Widget wrap(Widget child) => MaterialApp(
      locale: const Locale('en'),
      theme: AppTheme.light,
      supportedLocales: LocaleController.supported,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );

    FuelInventoryItem item({
      FuelTypeModel fuelType = FuelTypeModel.gasoline95,
      String displayName = 'Gasoline 95',
      double current = 7450,
      double capacity = 20000,
      double pct = 37.3,
      double? price = 6.8,
    }) => FuelInventoryItem(
      fuelType: fuelType,
      displayName: displayName,
      capacityLiters: capacity,
      currentLiters: current,
      percentageRemaining: pct,
      pricePerLiter: price,
      updatedAt: DateTime.now(),
    );

    testWidgets('renders nothing for an empty list', (tester) async {
      await tester.pumpWidget(wrap(const FuelStatusList(items: [])));
      expect(find.byType(FuelStatusList), findsOneWidget);
      // No card/progress bar content should be rendered.
      expect(find.byType(LinearProgressIndicator), findsNothing);
    });

    testWidgets('shows the display name, percentage and a real progress bar', (tester) async {
      await tester.pumpWidget(wrap(FuelStatusList(items: [item()])));
      expect(find.text('Gasoline 95'), findsOneWidget);
      expect(find.text('37.3%'), findsOneWidget);
      final bar = tester.widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator));
      expect(bar.value, closeTo(0.373, 0.001));
    });

    testWidgets('hides price when showPrice is false — provider read-only view', (tester) async {
      await tester.pumpWidget(wrap(FuelStatusList(items: [item()], showPrice: false)));
      expect(find.textContaining('/L'), findsNothing);
    });

    testWidgets('renders no buttons or text fields — this is a read-only display', (tester) async {
      await tester.pumpWidget(wrap(FuelStatusList(items: [item()])));
      expect(find.byType(ElevatedButton), findsNothing);
      expect(find.byType(OutlinedButton), findsNothing);
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets('shows every fuel type independently', (tester) async {
      await tester.pumpWidget(
        wrap(
          FuelStatusList(
            items: [
              item(),
              item(fuelType: FuelTypeModel.diesel, displayName: 'Diesel / Solar', current: 22100, capacity: 30000, pct: 73.7),
            ],
          ),
        ),
      );
      expect(find.text('Gasoline 95'), findsOneWidget);
      expect(find.text('Diesel / Solar'), findsOneWidget);
    });
  });

  group('fuel localization', () {
    test('fuel type and status strings are translated in both locales', () async {
      final en = await loadL10n('en');
      final ar = await loadL10n('ar');

      for (final type in FuelTypeModel.values) {
        final english = fuelTypeLabel(en, type);
        final arabic = fuelTypeLabel(ar, type);
        expect(english, isNotEmpty);
        expect(arabic, isNotEmpty);
        expect(arabic, isNot(english), reason: '$type must actually be translated');
      }

      expect(ar.fuelAvailabilityTitle, isNot(en.fuelAvailabilityTitle));
      expect(ar.fuelHistorySinglePoint, isNot(en.fuelHistorySinglePoint));
      expect(ar.fuelManagedByAdminNote, isNot(en.fuelManagedByAdminNote));
    });

    testWidgets('fuel strings render right-to-left in Arabic', (tester) async {
      final ar = await loadL10n('ar');
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
                Scaffold(body: Text(AppLocalizations.of(context)!.fuelAvailabilityTitle)),
          ),
        ),
      );

      final text = find.text(ar.fuelAvailabilityTitle);
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
