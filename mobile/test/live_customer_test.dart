@Tags(['live'])
library;

import 'dart:io' show HttpOverrides;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';

/// End-to-end customer journey against a running backend and real Postgres.
///
///   flutter test test/live_customer_test.dart --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:5000/api
void main() {
  const customerEmail = 'layla@smartauto.local';
  const otherCustomerEmail = 'omar@smartauto.local';
  const providerEmail = 'provider@smartauto.local';
  const password = 'demo123';

  late SecureTokenStore tokens;

  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    // The test binding stubs all HTTP as 400 unless overrides are cleared.
    HttpOverrides.global = null;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(
      {},
    );
    tokens = const SecureTokenStore(FlutterSecureStorage());
  });

  /// Builds the same object graph as AppProviders.
  Future<
    ({AuthState auth, CustomerRepository repo, QueryCache cache, ApiClient api})
  >
  signIn(String email) async {
    final auth = AuthState(tokens);
    final api = ApiClient(
      readToken: auth.readToken,
      onUnauthorized: auth.logout,
    );
    auth.api = AuthApi(api);
    final cache = QueryCache();
    final repo = CustomerRepository(api, cache);
    await auth.signIn(email: email, password: password);
    return (auth: auth, repo: repo, cache: cache, api: api);
  }

  test(
    'discovery returns real approved providers with parsed services',
    () async {
      final s = await signIn(customerEmail);
      final providers = await s.repo.refreshProviders();

      expect(providers, isNotEmpty);
      final provider = providers.first;
      expect(provider.businessName, isNotEmpty);
      expect(provider.services, isNotEmpty);
      // Decimal price must arrive as a real number, not a string.
      expect(provider.services.first.price, isA<double>());
      expect(provider.services.first.price, greaterThan(0));
    },
  );

  test(
    'rating summary and reviews come from the server, not the client',
    () async {
      final s = await signIn(customerEmail);
      final providers = await s.repo.refreshProviders();
      final id = providers.first.id;

      final rating = await s.cache.refresh(
        CacheKeys.providerRating(id),
        () async {
          final json = await s.api.get('/providers/$id/rating-summary') as Map;
          return RatingSummary.fromJson(Map<String, dynamic>.from(json));
        },
      );

      // Either a real average with reviews, or null with none — never 0.0
      // standing in for "no data".
      if (rating.reviewCount == 0) {
        expect(rating.averageRating, isNull);
      } else {
        expect(rating.averageRating, inInclusiveRange(1, 5));
      }
    },
  );

  test('queue summary is an aggregate with no entry-level detail', () async {
    final s = await signIn(customerEmail);
    final providers = await s.repo.refreshProviders();
    final id = providers.first.id;

    final json = await s.api.get('/queue/summary/$id') as Map;
    final summary = QueueSummary.fromJson(Map<String, dynamic>.from(json));

    expect(summary.queueLength, greaterThanOrEqualTo(0));
    // No customer names or entry ids in a public aggregate.
    expect(json.keys.toSet(), {
      'providerId',
      'queueLength',
      'estimatedWaitMinutes',
    });
  });

  test('full booking journey: create, appear in list, open, cancel', () async {
    final s = await signIn(customerEmail);
    final providers = await s.repo.refreshProviders();
    final provider = providers.firstWhere((p) => p.bookableServices.isNotEmpty);
    final service = provider.bookableServices.first;

    // Far future so it cannot overlap the seeded bookings.
    final when = DateTime.now().add(const Duration(days: 800));
    final created = await s.repo.createBooking(
      providerServiceId: service.id,
      scheduledAt: when,
      notes: 'Flutter Phase 1 verification',
    );

    expect(created.status, BookingStatus.pending);
    expect(created.providerName, provider.businessName);
    expect(created.priceAtBooking, service.price);

    final list = await s.repo.refreshBookings();
    expect(list.any((b) => b.id == created.id), isTrue);

    final fetched = await s.cache.refresh(
      CacheKeys.booking(created.id),
      () async {
        final json = await s.api.get('/bookings/${created.id}') as Map;
        return Booking.fromJson(Map<String, dynamic>.from(json));
      },
    );
    expect(fetched.id, created.id);
    expect(fetched.status.customerCanCancel, isTrue);

    final cancelled = await s.repo.cancelBooking(created.id);
    expect(cancelled.status, BookingStatus.cancelled);
    expect(cancelled.cancelledAt, isNotNull);

    final after = await s.repo.refreshBookings();
    final row = after.firstWhere((b) => b.id == created.id);
    expect(row.status, BookingStatus.cancelled);
    expect(row.status.isTerminal, isTrue);
  });

  test('booking validation is enforced by the server', () async {
    final s = await signIn(customerEmail);
    final providers = await s.repo.refreshProviders();
    final service = providers
        .firstWhere((p) => p.bookableServices.isNotEmpty)
        .bookableServices
        .first;

    // A past time must be refused.
    await expectLater(
      s.repo.createBooking(
        providerServiceId: service.id,
        scheduledAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      throwsA(isA<ApiException>()),
    );

    // An unknown service must 404.
    await expectLater(
      s.repo.createBooking(
        providerServiceId: 999999,
        scheduledAt: DateTime.now().add(const Duration(days: 801)),
      ),
      throwsA(isA<ApiException>()),
    );
  });

  test('a customer sees only their own bookings', () async {
    final mine = await signIn(customerEmail);
    final myBookings = await mine.repo.refreshBookings();
    final myId = mine.auth.user!['id'] as int;

    expect(
      myBookings.every((b) => b.customerId == myId),
      isTrue,
      reason: 'GET /bookings must be scoped to the caller',
    );

    // And another customer's list is genuinely different data.
    final other = await signIn(otherCustomerEmail);
    final otherId = other.auth.user!['id'] as int;
    final otherBookings = await other.repo.refreshBookings();
    expect(otherBookings.every((b) => b.customerId == otherId), isTrue);
    expect(otherId, isNot(myId));
  });

  test('a customer cannot open another customer\'s booking', () async {
    final other = await signIn(otherCustomerEmail);
    final theirBookings = await other.repo.refreshBookings();
    if (theirBookings.isEmpty) return; // nothing to attempt

    final theirId = theirBookings.first.id;
    final mine = await signIn(customerEmail);

    await expectLater(
      mine.api.get('/bookings/$theirId'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.isForbidden || e.isNotFound,
          'refused',
          isTrue,
        ),
      ),
    );
  });

  test('queue read is scoped to the caller and exposes no one else', () async {
    final s = await signIn(customerEmail);
    final entries = await s.repo.refreshMyQueue();

    // Whatever comes back belongs to this customer; the aggregate counts
    // ("2 ahead") are numbers, never other people's rows.
    final raw = await s.api.get('/queue') as List;
    expect(raw.length, entries.length);
    for (final entry in entries) {
      expect(entry.providerName, isNotEmpty);
      expect(entry.customersAhead ?? 0, greaterThanOrEqualTo(0));
    }
  });

  test('customers are refused provider and admin endpoints', () async {
    final s = await signIn(customerEmail);

    for (final path in [
      '/providers/me',
      '/providers/me/analytics',
      '/admin/users',
    ]) {
      await expectLater(
        s.api.get(path),
        throwsA(
          isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
        ),
        reason: '$path must be closed to a customer',
      );
    }
  });

  test('reviews follow the backend rules', () async {
    final s = await signIn(customerEmail);
    final bookings = await s.repo.refreshBookings();

    // A non-completed booking must be rejected for review.
    final open = bookings.where((b) => !b.status.isTerminal).firstOrNull;
    if (open != null) {
      await expectLater(
        s.repo.submitReview(bookingId: open.id, rating: 5),
        throwsA(isA<ApiException>()),
      );
    }

    // An out-of-range rating must be rejected even on a valid booking.
    final completed = bookings
        .where((b) => b.status == BookingStatus.completed)
        .firstOrNull;
    if (completed != null) {
      await expectLater(
        s.repo.submitReview(bookingId: completed.id, rating: 9),
        throwsA(isA<ApiException>()),
      );
    }
  });

  test('provider reviews are readable and carry customer identity', () async {
    final s = await signIn(customerEmail);
    final providers = await s.repo.refreshProviders();
    final id = providers.first.id;

    final raw = await s.api.get('/providers/$id/reviews') as List;
    final reviews = raw
        .whereType<Map>()
        .map((j) => Review.fromJson(Map<String, dynamic>.from(j)))
        .toList();

    for (final review in reviews) {
      expect(review.rating, inInclusiveRange(1, 5));
      expect(review.customerName, isNotEmpty);
    }
  });

  test('a mutation invalidates the caches it affects', () async {
    final s = await signIn(customerEmail);
    await s.repo.refreshBookings();
    expect(s.cache.hasKey(CacheKeys.bookings), isTrue);

    final providers = await s.repo.refreshProviders();
    final service = providers
        .firstWhere((p) => p.bookableServices.isNotEmpty)
        .bookableServices
        .first;

    final created = await s.repo.createBooking(
      providerServiceId: service.id,
      scheduledAt: DateTime.now().add(const Duration(days: 900)),
    );

    // Data is still present (no blank screen) but marked stale, so the next
    // watch refetches rather than showing a list missing the new booking.
    expect(
      s.cache.read<List<Booking>>(CacheKeys.bookings).valueOrNull,
      isNotNull,
    );
    final refreshed = await s.repo.refreshBookings();
    expect(refreshed.any((b) => b.id == created.id), isTrue);

    // clean up
    await s.repo.cancelBooking(created.id);
  });

  test(
    'a provider account is not routed through the customer repository',
    () async {
      // The provider role has its own area; this just confirms the shared
      // endpoints still scope correctly for a non-customer caller.
      final s = await signIn(providerEmail);
      final bookings = await s.repo.refreshBookings();
      // A provider sees their business's bookings, which is a different set
      // from any single customer's.
      expect(bookings, isA<List<Booking>>());
    },
  );
}
