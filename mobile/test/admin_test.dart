import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/models/admin_models.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/admin/data/admin_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/admin/data/admin_repository.dart';
import 'package:smart_automotive_service_app/features/admin/widgets/admin_widgets.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

void main() {
  group('admin models parse the real payload shapes', () {
    test('overview keeps every section and its nested lists', () {
      final overview = AdminOverview.fromJson({
        'users': {
          'total': 12,
          'customers': 8,
          'providerAccounts': 3,
          'admins': 1,
        },
        'providers': {'total': 3, 'approved': 2, 'pending': 1, 'openNow': 1},
        'bookings': {
          'total': 40,
          'active': 5,
          'completed': 30,
          'cancelled': 4,
          'rejected': 1,
        },
        'reviews': {'total': 9, 'averageRating': 4.3},
        'queue': {'activeEntries': 2},
        'catalog': {'categories': 6, 'activeCategories': 5, 'services': 14},
        'complaints': {'open': 2, 'total': 7},
        'recentRegistrations': [
          {
            'id': 5,
            'name': 'Layla',
            'role': 'CUSTOMER',
            'createdAt': '2026-08-01T10:00:00.000Z',
          },
        ],
        'pendingProviders': [
          {
            'id': 3,
            'businessName': 'New Garage',
            'address': 'Street 1',
            'createdAt': '2026-08-02T10:00:00.000Z',
            'user': {'id': 9, 'name': 'Owner', 'email': 'owner@example.com'},
          },
        ],
        'recentComplaints': [
          {
            'id': 1,
            'subject': 'Late service',
            'severity': 'HIGH',
            'status': 'OPEN',
            'createdAt': '2026-08-03T10:00:00.000Z',
            'submittedBy': {'id': 5, 'name': 'Layla'},
            'provider': {'id': 1, 'businessName': 'Cedars'},
          },
        ],
      });

      expect(overview.users.total, 12);
      expect(overview.providers.pending, 1);
      expect(overview.bookings.completed, 30);
      expect(overview.reviews.averageRating, 4.3);
      expect(overview.activeQueueEntries, 2);
      expect(overview.catalog.services, 14);
      expect(overview.complaints.open, 2);
      expect(overview.recentRegistrations.single.name, 'Layla');
      expect(overview.pendingProviders.single.ownerEmail, 'owner@example.com');
      expect(overview.recentComplaints.single.severity, ComplaintSeverity.high);
      expect(overview.recentComplaints.single.providerName, 'Cedars');
    });

    test('a platform with no reviews yet has a null average, not zero', () {
      final overview = AdminOverview.fromJson({
        'reviews': {'total': 0, 'averageRating': null},
      });
      expect(overview.reviews.total, 0);
      expect(
        overview.reviews.averageRating,
        isNull,
        reason: 'null must render as a dash, never as 0.0',
      );
    });

    test('a missing section degrades to zeroes rather than throwing', () {
      // The overview endpoint always returns every section, but a partial
      // payload must not take the screen down.
      final overview = AdminOverview.fromJson(const {});
      expect(overview.users.total, 0);
      expect(overview.recentComplaints, isEmpty);
      expect(overview.pendingProviders, isEmpty);
    });

    test('complaint parses its people, severity, status and resolvedAt', () {
      final complaint = Complaint.fromJson({
        'id': 4,
        'subject': 'Rude staff',
        'details': 'Details here',
        'severity': 'LOW',
        'status': 'RESOLVED',
        'resolvedAt': '2026-08-10T12:00:00.000Z',
        'createdAt': '2026-08-09T12:00:00.000Z',
        'submittedBy': {
          'id': 5,
          'name': 'Layla',
          'email': 'layla@example.com',
          'role': 'CUSTOMER',
        },
        'provider': {'id': 2, 'businessName': 'Cedars'},
      });

      expect(complaint.severity, ComplaintSeverity.low);
      expect(complaint.status, ComplaintStatus.resolved);
      expect(complaint.status.isClosed, isTrue);
      expect(complaint.resolvedAt, isNotNull);
      expect(complaint.submittedByRole, UserRoleModel.customer);
      expect(complaint.providerName, 'Cedars');
    });

    test('an open complaint has no closing date', () {
      final complaint = Complaint.fromJson({
        'id': 1,
        'subject': 'x',
        'status': 'OPEN',
        'severity': 'MEDIUM',
        'createdAt': '2026-08-09T12:00:00.000Z',
        'resolvedAt': null,
        'provider': {'id': 1, 'businessName': 'Cedars'},
      });
      expect(complaint.status.isClosed, isFalse);
      expect(complaint.resolvedAt, isNull);
    });

    test('an unrecognized status or severity falls back, never throws', () {
      final complaint = Complaint.fromJson({
        'id': 1,
        'subject': 'x',
        'status': 'SOMETHING_NEW',
        'severity': 'SEVERE',
        'createdAt': '2026-08-09T12:00:00.000Z',
        'provider': {'id': 1, 'businessName': 'Cedars'},
      });
      expect(complaint.status, ComplaintStatus.open);
      expect(complaint.severity, ComplaintSeverity.medium);
    });

    test('user rows carry their counts and linked business', () {
      final user = AdminUserRow.fromJson({
        'id': 7,
        'name': 'Owner',
        'email': 'owner@example.com',
        'role': 'PROVIDER',
        'phone': '+9611',
        'createdAt': '2026-08-01T10:00:00.000Z',
        'provider': {'id': 2, 'businessName': 'Cedars', 'isApproved': true},
        '_count': {'bookings': 3, 'reviews': 1},
      });

      expect(user.role, UserRoleModel.provider);
      expect(user.bookingCount, 3);
      expect(user.reviewCount, 1);
      expect(user.businessName, 'Cedars');
      expect(user.providerApproved, isTrue);
    });

    test('a customer row has no business attached', () {
      final user = AdminUserRow.fromJson({
        'id': 5,
        'name': 'Layla',
        'email': 'layla@example.com',
        'role': 'CUSTOMER',
        'createdAt': '2026-08-01T10:00:00.000Z',
        'provider': null,
        '_count': {'bookings': 2, 'reviews': 0},
      });
      expect(user.providerId, isNull);
      expect(user.providerApproved, isNull);
    });

    test('user detail parses counts, business and recent activity', () {
      final detail = AdminUserDetail.fromJson({
        'id': 7,
        'name': 'Owner',
        'email': 'owner@example.com',
        'role': 'PROVIDER',
        'createdAt': '2026-08-01T10:00:00.000Z',
        'provider': {
          'id': 2,
          'businessName': 'Cedars',
          'address': 'Street 1',
          'isApproved': true,
          'isOpen': false,
          '_count': {'services': 4, 'reviews': 6},
        },
        'bookings': [
          {
            'id': 1,
            'status': 'COMPLETED',
            'scheduledAt': '2026-08-05T10:00:00.000Z',
            'providerService': {'name': 'Oil change'},
          },
        ],
        'reviews': [
          {
            'id': 3,
            'rating': 5,
            'comment': 'Great',
            'createdAt': '2026-08-06T10:00:00.000Z',
          },
        ],
        '_count': {'bookings': 9, 'reviews': 2, 'complaints': 1},
      });

      expect(detail.bookingCount, 9);
      expect(detail.complaintCount, 1);
      expect(detail.business!.serviceCount, 4);
      expect(detail.business!.isOpen, isFalse);
      expect(detail.recentBookings.single.serviceName, 'Oil change');
      expect(detail.recentBookings.single.status, BookingStatus.completed);
      expect(detail.recentReviews.single.rating, 5);
    });

    test('admin provider rows keep approval state and counts', () {
      final row = AdminProviderRow.fromJson({
        'id': 2,
        'businessName': 'Cedars',
        'address': 'Street 1',
        'isApproved': false,
        'isOpen': false,
        'user': {
          'id': 7,
          'name': 'Owner',
          'email': 'owner@example.com',
          'phone': '+9611',
        },
        'services': [
          {'id': 1, 'name': 'Oil', 'price': '10', 'durationMinutes': 30},
          {'id': 2, 'name': 'Tyres', 'price': '20', 'durationMinutes': 45},
        ],
        '_count': {'reviews': 6, 'queueEntries': 3},
      });

      expect(row.isApproved, isFalse);
      expect(row.serviceCount, 2);
      expect(row.reviewCount, 6);
      expect(row.queueEntryCount, 3);
      expect(row.ownerEmail, 'owner@example.com');
    });

    test('admin provider rows parse latitude/longitude for View location', () {
      final row = AdminProviderRow.fromJson({
        'id': 2,
        'businessName': 'Cedars',
        'address': 'Street 1',
        'isApproved': true,
        'isOpen': true,
        'latitude': '33.8938',
        'longitude': '35.5018',
      });
      expect(row.latitude, 33.8938);
      expect(row.longitude, 35.5018);
    });

    test('admin provider rows without coordinates parse as null, never a fabricated 0,0', () {
      final row = AdminProviderRow.fromJson({
        'id': 3,
        'businessName': 'No Location Yet',
        'address': 'Street 2',
        'isApproved': true,
        'isOpen': true,
      });
      expect(row.latitude, isNull);
      expect(row.longitude, isNull);
    });

    test('analytics parses every series and invents no revenue field', () {
      final analytics = AdminAnalytics.fromJson({
        'range': '7d',
        'since': '2026-08-01T00:00:00.000Z',
        'summary': {
          'bookings': 10,
          'completed': 6,
          'cancelled': 2,
          'cancellationRate': 20.0,
          'newCustomers': 3,
          'newProviders': 1,
          'reviews': 4,
          'averageRating': 4.5,
        },
        'bookingTrend': [
          {'label': '2026-08-01', 'bookings': 2},
          {'label': '2026-08-02', 'bookings': 3},
        ],
        'userGrowth': [
          {'label': '2026-08-01', 'customers': 2, 'providers': 1},
        ],
        'statusBreakdown': [
          {'status': 'COMPLETED', 'count': 6},
        ],
        'popularServices': [
          {'service': 'Oil change', 'bookings': 5},
        ],
        'topProviders': [
          {'provider': 'Cedars', 'bookings': 7},
        ],
        'providerCategories': [
          {'category': 'Maintenance', 'count': 2},
        ],
      });

      expect(analytics.range, '7d');
      expect(analytics.bookings, 10);
      expect(analytics.cancellationRate, 20.0);
      expect(analytics.bookingTrend.length, 2);
      expect(analytics.userGrowth.single.customers, 2);
      expect(analytics.userGrowth.single.providers, 1);
      expect(analytics.statusBreakdown.single.label, 'COMPLETED');
      expect(analytics.popularServices.single.label, 'Oil change');
      expect(analytics.topProviders.single.count, 7);
      expect(analytics.providerCategories.single.label, 'Maintenance');
      expect(analytics.toString().toLowerCase(), isNot(contains('revenue')));
    });

    test('an empty analytics window has a null average rating', () {
      final analytics = AdminAnalytics.fromJson({
        'range': '30d',
        'summary': {'bookings': 0, 'averageRating': null},
      });
      expect(analytics.bookings, 0);
      expect(analytics.averageRating, isNull);
    });
  });

  group('AdminRealtimeHandler', () {
    late QueryCache cache;
    late AdminRealtimeHandler handler;

    setUp(() {
      cache = QueryCache();
      handler = AdminRealtimeHandler(cache);
    });

    Map<String, dynamic> providerJson(int id, {bool isOpen = false}) => {
      'id': id,
      'businessName': 'Business $id',
      'address': 'Street',
      'isApproved': true,
      'isOpen': isOpen,
      'services': const [],
      '_count': {'reviews': 0, 'queueEntries': 0},
    };

    test('patches the open flag of the business the event names', () async {
      await cache.refresh<List<AdminProviderRow>>(
        AdminKeys.providers,
        () async => [
          AdminProviderRow.fromJson(providerJson(1)),
          AdminProviderRow.fromJson(providerJson(2)),
        ],
      );

      handler.onProviderStatusChanged({'providerId': 2, 'isOpen': true});

      final rows = cache
          .read<List<AdminProviderRow>>(AdminKeys.providers)
          .valueOrNull!;
      expect(rows.firstWhere((r) => r.id == 2).isOpen, isTrue);
      expect(
        rows.firstWhere((r) => r.id == 1).isOpen,
        isFalse,
        reason: 'only the named business may change',
      );
      expect(handler.appliedEvents, 1);
    });

    test('leaves approval and counts alone when a business opens', () async {
      await cache.refresh<List<AdminProviderRow>>(
        AdminKeys.providers,
        () async => [
          AdminProviderRow.fromJson({
            ...providerJson(1),
            'isApproved': true,
            '_count': {'reviews': 4, 'queueEntries': 2},
          }),
        ],
      );

      handler.onProviderStatusChanged({'providerId': 1, 'isOpen': true});

      final row = cache
          .read<List<AdminProviderRow>>(AdminKeys.providers)
          .valueOrNull!
          .single;
      expect(row.isApproved, isTrue);
      expect(row.reviewCount, 4);
      expect(row.queueEntryCount, 2);
    });

    test('a status event with nothing cached is ignored', () {
      handler.onProviderStatusChanged({'providerId': 1, 'isOpen': true});
      expect(handler.appliedEvents, 0);
    });

    test('a malformed status payload is ignored', () async {
      await cache.refresh<List<AdminProviderRow>>(
        AdminKeys.providers,
        () async => [AdminProviderRow.fromJson(providerJson(1))],
      );

      handler.onProviderStatusChanged({'isOpen': true}); // no providerId
      handler.onProviderStatusChanged({'providerId': 1}); // no isOpen
      expect(handler.appliedEvents, 0);
    });

    test('events an admin socket never receives are no-ops', () {
      // booking:status_changed goes to the customer and owning provider
      // rooms; queue:provider_updated goes to one provider's room.
      handler.onBookingStatusChanged({'bookingId': 1, 'status': 'CANCELLED'});
      handler.onProviderQueueUpdated({'providerId': 1, 'entries': const []});
      handler.onMyQueueUpdate({'id': 1});
      handler.onProviderAvailabilityChanged({'providerId': 1});
      expect(handler.appliedEvents, 0);
    });

    test('reconnect marks every admin key stale', () async {
      var loads = 0;
      await cache.refresh<AdminOverview>(AdminKeys.overview, () async {
        loads++;
        return AdminOverview.fromJson(const {});
      });

      handler.onReconnected();
      cache.watch<AdminOverview>(AdminKeys.overview, () async {
        loads++;
        return AdminOverview.fromJson(const {});
      });
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(loads, 2, reason: 'reconnect must resync from REST');
    });
  });

  group('admin cache keys', () {
    test('a filter change is a separate cached read', () {
      expect(
        AdminKeys.usersFiltered('PROVIDER', ''),
        isNot(AdminKeys.usersFiltered('CUSTOMER', '')),
      );
      expect(
        AdminKeys.complaintsFiltered('OPEN', 'ALL'),
        isNot(AdminKeys.complaintsFiltered('OPEN', 'HIGH')),
      );
      expect(
        AdminKeys.analyticsFor('7d'),
        isNot(AdminKeys.analyticsFor('30d')),
      );
    });

    test('shared endpoints reuse the other areas\' keys', () {
      // An admin editing a category must invalidate what the provider's
      // service form and customer discovery read.
      expect(AdminKeys.categories, 'categories');
      expect(AdminKeys.bookings, 'bookings');
    });

    test('every filtered key sits under its invalidation prefix', () {
      // setComplaintStatus invalidates by prefix, so a filtered list must
      // start with it or a triaged complaint would linger on screen.
      expect(
        AdminKeys.complaintsFiltered('OPEN', 'HIGH'),
        startsWith(AdminKeys.complaints),
      );
      expect(
        AdminKeys.reviewsFiltered('5', 'ALL'),
        startsWith(AdminKeys.reviews),
      );
      expect(AdminKeys.usersFiltered('ALL', 'x'), startsWith(AdminKeys.users));
      expect(AdminKeys.analyticsFor('7d'), startsWith(AdminKeys.analytics));
    });

    test('fuel keys are scoped per provider, and history keys per range too', () {
      expect(AdminKeys.fuel(2), isNot(AdminKeys.fuel(3)));
      expect(AdminKeys.fuelHistory(2, '7d'), isNot(AdminKeys.fuelHistory(2, '30d')));
    });
  });

  group('admin vocabulary', () {
    late AppLocalizations en;
    late AppLocalizations ar;

    setUp(() async {
      en = await loadL10n('en');
      ar = await loadL10n('ar');
    });

    test('every complaint status and severity has a label', () {
      for (final status in ComplaintStatus.values) {
        expect(complaintStatusLabel(en, status), isNotEmpty);
        expect(complaintStatusLabel(ar, status), isNotEmpty);
        expect(
          complaintStatusLabel(ar, status),
          isNot(complaintStatusLabel(en, status)),
          reason: '$status must actually be translated',
        );
      }
      for (final severity in ComplaintSeverity.values) {
        expect(complaintSeverityLabel(en, severity), isNotEmpty);
        expect(
          complaintSeverityLabel(ar, severity),
          isNot(complaintSeverityLabel(en, severity)),
        );
      }
    });

    test('severity and status tones are distinct enough to scan', () {
      expect(
        complaintSeverityTone(ComplaintSeverity.high),
        isNot(complaintSeverityTone(ComplaintSeverity.low)),
      );
      expect(
        complaintStatusTone(ComplaintStatus.open),
        isNot(complaintStatusTone(ComplaintStatus.resolved)),
      );
    });

    test('an unknown role renders as a dash, not a crash', () {
      expect(roleLabel(en, null), '—');
      expect(roleLabel(en, UserRoleModel.admin), en.roleAdmin);
    });

    test('admin navigation is translated, not an English fallback', () {
      final pairs = <(String, String)>[
        (en.aNavOverview, ar.aNavOverview),
        (en.aNavProviders, ar.aNavProviders),
        (en.aNavBookings, ar.aNavBookings),
        (en.aNavComplaints, ar.aNavComplaints),
        (en.aNavMore, ar.aNavMore),
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

    test('the unsupported-feature copy explains why, in both languages', () {
      for (final l10n in [en, ar]) {
        expect(l10n.aMoreNoPlatformSettings, isNotEmpty);
        expect(l10n.aUsersReadOnly, isNotEmpty);
        expect(l10n.aAnalyticsSource, isNotEmpty);
        expect(l10n.aMoreRealtimeNote, isNotEmpty);
      }
      // The analytics note names the endpoint it draws from.
      expect(en.aAnalyticsSource, contains('/admin/analytics'));
      expect(ar.aAnalyticsSource, contains('/admin/analytics'));
    });

    testWidgets('admin strings render right-to-left in Arabic', (tester) async {
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
            builder: (context) => Scaffold(
              body: Text(AppLocalizations.of(context)!.aNavComplaints),
            ),
          ),
        ),
      );

      final text = find.text(ar.aNavComplaints);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });

  group('admin date formatting', () {
    test('pads month and day so rows line up', () {
      expect(adminDate(DateTime(2026, 8, 4)), '2026-08-04');
      expect(adminDate(DateTime(2026, 12, 31)), '2026-12-31');
    });
  });
}
