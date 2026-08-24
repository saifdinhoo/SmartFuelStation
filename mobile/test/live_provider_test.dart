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
import 'package:smart_automotive_service_app/core/realtime/socket_service.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';
import 'package:smart_automotive_service_app/features/provider/data/provider_realtime_handler.dart';
import 'package:smart_automotive_service_app/features/provider/data/provider_repository.dart';

/// Provider Mobile against a running backend and real PostgreSQL.
///
///   flutter test test/live_provider_test.dart --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:5000/api
void main() {
  const providerEmail = 'provider@smartauto.local';
  const customerEmail = 'layla@smartauto.local';
  const adminEmail = 'admin@smartfuelstation.com';
  const password = 'demo123';
  const adminPassword = 'admin123';
  const probeEmail = 'phase3.probe@smartauto.local';

  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    HttpOverrides.global = null;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(
      {},
    );
  });

  Future<
    ({
      AuthState auth,
      ApiClient api,
      QueryCache cache,
      ProviderRepository provider,
      CustomerRepository customer,
    })
  >
  session(String email, {String pass = password}) async {
    final tokens = SecureTokenStore(const FlutterSecureStorage());
    final auth = AuthState(tokens);
    final api = ApiClient(
      readToken: auth.readToken,
      onUnauthorized: auth.logout,
    );
    auth.api = AuthApi(api);
    final cache = QueryCache();
    await auth.signIn(email: email, password: pass);
    return (
      auth: auth,
      api: api,
      cache: cache,
      provider: ProviderRepository(api, cache),
      customer: CustomerRepository(api, cache),
    );
  }

  Future<void> waitFor(
    bool Function() condition, {
    required String reason,
    Duration timeout = const Duration(seconds: 8),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      if (condition()) return;
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    fail('Timed out waiting: $reason');
  }

  /// A second business, so cross-tenant reads can actually be probed
  /// rather than skipped. Registered through the real API the first time
  /// and reused afterwards — a 409 just means a previous run made it.
  Future<int> secondProviderId() async {
    try {
      final tokens = SecureTokenStore(const FlutterSecureStorage());
      final auth = AuthState(tokens);
      final api = ApiClient(
        readToken: auth.readToken,
        onUnauthorized: auth.logout,
      );
      auth.api = AuthApi(api);
      await auth.register({
        'name': 'Cross-tenant probe',
        'email': probeEmail,
        'password': password,
        'role': 'PROVIDER',
        'businessName': 'Phase 3 Probe Garage',
        'address': 'Probe Street 1',
      });
    } on ApiException catch (e) {
      if (e.statusCode != 409) rethrow;
    }
    final probe = await session(probeEmail);
    return (await probe.provider.refreshProfile()).id;
  }

  test('provider profile loads with real services and rating', () async {
    final s = await session(providerEmail);
    final profile = await s.provider.refreshProfile();

    expect(profile.businessName, isNotEmpty);
    expect(profile.contactName, isNotEmpty);
    expect(profile.email, providerEmail);
    expect(profile.services, isNotEmpty);
    expect(profile.services.first.price, isA<double>());
  });

  test('profile edit persists and survives a fresh session', () async {
    final s = await session(providerEmail);
    final original = await s.provider.refreshProfile();

    const marker = 'Phase 3 verification';
    await s.provider.updateProfile({
      'description': marker,
      'estimatedWaitMinutes': 33,
    });

    // A new session proves it is in Postgres, not just local cache.
    final fresh = await session(providerEmail);
    final reloaded = await fresh.provider.refreshProfile();
    expect(reloaded.description, marker);
    expect(reloaded.estimatedWaitMinutes, 33);

    await s.provider.updateProfile({
      'description': original.description,
      'estimatedWaitMinutes': original.estimatedWaitMinutes,
    });
  });

  test('service CRUD works and safe-delete is enforced', () async {
    final s = await session(providerEmail);
    final categories = await s.cache.refresh<List<ServiceCategory>>(
      ProviderKeys.categories,
      () async {
        final raw = await s.api.get('/categories') as List;
        return raw
            .whereType<Map>()
            .map((j) => ServiceCategory.fromJson(Map<String, dynamic>.from(j)))
            .toList();
      },
    );

    final name = 'Phase3 Service ${DateTime.now().millisecondsSinceEpoch}';
    await s.provider.createService(
      name: name,
      categoryId: categories.first.id,
      price: 33.5,
      durationMinutes: 40,
      isAvailable: true,
    );

    var profile = await s.provider.refreshProfile();
    final created = profile.services.firstWhere((x) => x.name == name);
    expect(created.price, 33.5);
    expect(created.durationMinutes, 40);

    // edit price/duration/availability
    await s.provider.updateService(created.id, {
      'price': 44.0,
      'durationMinutes': 55,
      'isAvailable': false,
    });
    profile = await s.provider.refreshProfile();
    final edited = profile.services.firstWhere((x) => x.id == created.id);
    expect(edited.price, 44.0);
    expect(edited.durationMinutes, 55);
    expect(edited.isAvailable, isFalse);

    // an unused service deletes
    await s.provider.deleteService(created.id);
    profile = await s.provider.refreshProfile();
    expect(profile.services.any((x) => x.id == created.id), isFalse);

    // a service with history is refused, with a message that says why
    final withHistory = profile.services.first;
    await expectLater(
      s.provider.deleteService(withHistory.id),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message.toLowerCase(),
          'explains the alternative',
          contains('unavailable'),
        ),
      ),
    );
  });

  test(
    'full booking workflow PENDING → COMPLETED drives both records',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      final providers = await customer.customer.refreshProviders();
      final business = providers.firstWhere(
        (p) => p.bookableServices.isNotEmpty,
      );
      final service = business.bookableServices.first;

      final booking = await customer.customer.createBooking(
        providerServiceId: service.id,
        scheduledAt: DateTime.now().add(const Duration(days: 1000)),
      );

      Future<Booking> providerSees() async {
        final list = await provider.provider.refreshBookings();
        return list.firstWhere((b) => b.id == booking.id);
      }

      expect((await providerSees()).status, BookingStatus.pending);

      await provider.provider.setBookingStatus(booking.id, 'CONFIRMED');
      expect((await providerSees()).status, BookingStatus.confirmed);

      await provider.provider.setBookingStatus(booking.id, 'ARRIVED');
      expect((await providerSees()).status, BookingStatus.arrived);

      await provider.provider.addBookingToQueue(booking.id);
      expect((await providerSees()).status, BookingStatus.inQueue);

      final queue = await provider.provider.refreshQueue();
      final entry = queue.firstWhere((e) => e.bookingId == booking.id);
      expect(entry.customerName, isNotEmpty);
      expect(entry.queuePosition, isNotNull);

      await provider.provider.setQueueStatus(
        entry.id,
        'IN_SERVICE',
        bookingId: booking.id,
      );
      expect((await providerSees()).status, BookingStatus.inService);

      await provider.provider.setQueueStatus(
        entry.id,
        'COMPLETED',
        bookingId: booking.id,
      );
      expect((await providerSees()).status, BookingStatus.completed);
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'walk-in and reorder work against the real queue',
    () async {
      final provider = await session(providerEmail);
      final profile = await provider.provider.refreshProfile();
      final service = profile.services.firstWhere((s) => s.isAvailable);

      final before = await provider.provider.refreshQueue();
      final beforeWaiting = before
          .where((e) => e.status == QueueStatus.waiting)
          .length;

      await provider.provider.addWalkIn(
        providerServiceId: service.id,
        customerName: 'Phase3 WalkIn A',
      );
      await provider.provider.addWalkIn(
        providerServiceId: service.id,
        customerName: 'Phase3 WalkIn B',
      );

      var queue = await provider.provider.refreshQueue();
      var waiting = queue.where((e) => e.status == QueueStatus.waiting).toList()
        ..sort(
          (a, b) => (a.queuePosition ?? 0).compareTo(b.queuePosition ?? 0),
        );
      expect(waiting.length, beforeWaiting + 2);

      // Reverse the whole waiting set — the backend requires the complete set.
      final reversed = waiting.reversed.map((e) => e.id).toList();
      await provider.provider.reorderQueue(reversed);

      queue = await provider.provider.refreshQueue();
      waiting = queue.where((e) => e.status == QueueStatus.waiting).toList()
        ..sort(
          (a, b) => (a.queuePosition ?? 0).compareTo(b.queuePosition ?? 0),
        );
      expect(
        waiting.map((e) => e.id).toList(),
        reversed,
        reason: 'stored positions must reflect the new order',
      );

      // A partial set is ambiguous and must be refused.
      await expectLater(
        provider.provider.reorderQueue([reversed.first]),
        throwsA(isA<ApiException>()),
      );

      // clean up the walk-ins this test created
      for (final entry in waiting.where(
        (e) => (e.customerName ?? '').startsWith('Phase3 WalkIn'),
      )) {
        await provider.provider.removeQueueEntry(entry.id);
      }
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'queue changes reach the provider over the socket',
    () async {
      final provider = await session(providerEmail);
      final handler = ProviderRealtimeHandler(provider.cache);
      final socket = SocketService(
        readToken: provider.auth.readToken,
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(
        () => socket.isConnected,
        reason: 'provider socket never connected',
      );

      final profile = await provider.provider.refreshProfile();
      final service = profile.services.firstWhere((s) => s.isAvailable);
      await provider.provider.refreshQueue();

      final before = handler.appliedEvents;
      await provider.provider.addWalkIn(
        providerServiceId: service.id,
        customerName: 'Phase3 Socket',
      );

      await waitFor(
        () => handler.appliedEvents > before,
        reason: 'no queue:provider_updated after a walk-in',
      );

      final entries = provider.cache
          .read<List<QueueEntry>>(ProviderKeys.queue)
          .valueOrNull!;
      final added = entries.firstWhere(
        (e) => e.customerName == 'Phase3 Socket',
      );
      expect(added.status, QueueStatus.waiting);

      await provider.provider.removeQueueEntry(added.id);
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'a customer cancellation reaches the provider live',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      // A second, unrelated business — it must receive nothing at all.
      await secondProviderId();
      final other = await session(probeEmail);

      final providerHandler = ProviderRealtimeHandler(provider.cache);
      final providerSocket = SocketService(
        readToken: provider.auth.readToken,
        handler: providerHandler,
      );
      addTearDown(providerSocket.dispose);

      final otherHandler = ProviderRealtimeHandler(other.cache);
      final otherSocket = SocketService(
        readToken: other.auth.readToken,
        handler: otherHandler,
      );
      addTearDown(otherSocket.dispose);

      // The customer stays on their own socket, to prove the original
      // customer-targeted event was not replaced by the provider one.
      final customerHandler = CustomerRealtimeHandler(customer.cache);
      final customerSocket = SocketService(
        readToken: customer.auth.readToken,
        handler: customerHandler,
      );
      addTearDown(customerSocket.dispose);

      providerSocket.connect();
      otherSocket.connect();
      customerSocket.connect();
      await waitFor(
        () =>
            providerSocket.isConnected &&
            otherSocket.isConnected &&
            customerSocket.isConnected,
        reason: 'all three sockets never connected',
      );

      final providers = await customer.customer.refreshProviders();
      final business = providers.firstWhere(
        (p) => p.bookableServices.isNotEmpty,
      );
      final booking = await customer.customer.createBooking(
        providerServiceId: business.bookableServices.first.id,
        scheduledAt: DateTime.now().add(const Duration(days: 1001)),
      );
      await provider.provider.setBookingStatus(booking.id, 'CONFIRMED');

      // Warm the provider's list so the refetch below is observable, and
      // let the confirm's own push settle before counting.
      await provider.provider.refreshBookings();
      await Future<void>.delayed(const Duration(milliseconds: 500));
      final providerBefore = providerHandler.appliedEvents;
      final otherBefore = otherHandler.appliedEvents;
      final customerBefore = customerHandler.appliedEvents;

      // The customer cancels — REST only, no provider action at all.
      final cancelled = await customer.customer.cancelBooking(booking.id);
      expect(cancelled.status, BookingStatus.cancelled);

      await waitFor(
        () => providerHandler.appliedEvents > providerBefore,
        reason: 'the provider never received the cancellation live',
      );

      // Exactly one event: no duplicate frame from being in two rooms.
      expect(
        providerHandler.appliedEvents,
        providerBefore + 1,
        reason: 'the provider must receive the cancellation once, not twice',
      );

      // The customer's own event still arrives.
      await waitFor(
        () => customerHandler.appliedEvents > customerBefore,
        reason: 'the customer stopped receiving their own booking event',
      );

      // The cache was invalidated, so reading it refetches CANCELLED from
      // the database — the provider UI updates with no manual refresh.
      final list = await provider.provider.refreshBookings();
      expect(
        list.firstWhere((b) => b.id == booking.id).status,
        BookingStatus.cancelled,
      );

      // And the row really is cancelled, not just locally patched.
      final fromDb = await provider.api.get('/bookings/${booking.id}') as Map;
      expect(fromDb['status'], 'CANCELLED');

      // The unrelated business heard nothing on any of its keys.
      expect(
        otherHandler.appliedEvents,
        otherBefore,
        reason: 'another provider must not receive this booking event',
      );
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test('open/closed toggle is visible to a customer', () async {
    final provider = await session(providerEmail);
    final customer = await session(customerEmail);

    final profile = await provider.provider.refreshProfile();
    final original = profile.isOpen;

    await provider.provider.setOpen(!original);
    final seen = await customer.customer.refreshProviders();
    expect(
      seen.firstWhere((p) => p.id == profile.id).isOpen,
      !original,
      reason: 'a customer must see the new public status',
    );

    await provider.provider.setOpen(original);
  });

  test('analytics returns real metrics and no revenue', () async {
    final s = await session(providerEmail);
    final analytics = await s.provider.refreshAnalytics('90d');

    expect(analytics.range, '90d');
    expect(analytics.totalBookings, greaterThanOrEqualTo(0));
    expect(
      analytics.completedBookings,
      lessThanOrEqualTo(analytics.totalBookings),
    );
    // Nothing in the payload claims a revenue figure.
    expect(analytics.toString().toLowerCase(), isNot(contains('revenue')));
  });

  test('reviews are readable for the provider\'s own business only', () async {
    final s = await session(providerEmail);
    final profile = await s.provider.refreshProfile();

    final mine = await s.cache.refresh<List<Review>>(
      ProviderKeys.reviews(profile.id),
      () async {
        final raw = await s.api.get('/providers/${profile.id}/reviews') as List;
        return raw
            .whereType<Map>()
            .map((j) => Review.fromJson(Map<String, dynamic>.from(j)))
            .toList();
      },
    );
    for (final review in mine) {
      expect(review.rating, inInclusiveRange(1, 5));
    }

    // Another business's reviews must be refused with 403. A made-up id
    // would only prove 404-on-missing, so a genuine second business is
    // used — registered through the real API if the seed has only one.
    final otherId = await secondProviderId();
    await expectLater(
      s.api.get('/providers/$otherId/reviews'),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
      reason: "a provider must not read another business's reviews",
    );

    // Nor may it reach that business through any /providers/me route: those
    // resolve the business from the JWT and never accept an id at all.
    final otherProfile = await (await session(
      probeEmail,
    )).provider.refreshProfile();
    expect(
      otherProfile.id,
      isNot(profile.id),
      reason: 'the probe account must be a different business',
    );
  });

  test('a customer cannot reach provider endpoints', () async {
    final customer = await session(customerEmail);

    // Only routes that actually exist are probed. An invented path 404s for
    // everyone, which would pass an "is it closed?" check for the wrong
    // reason — there is no GET on /providers/me/services.
    for (final path in ['/providers/me', '/providers/me/analytics']) {
      await expectLater(
        customer.api.get(path),
        throwsA(
          isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
        ),
        reason: '$path must be closed to a customer',
      );
    }

    // Services are PROVIDER-only writes, so each is probed with the verb it
    // is really registered under. authorize('PROVIDER') runs ahead of the
    // controller, so the refusal does not depend on the id existing.
    await expectLater(
      customer.api.post(
        '/providers/me/services',
        body: {
          'name': 'intrusion',
          'categoryId': 1,
          'price': 1,
          'durationMinutes': 15,
        },
      ),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
      reason: 'POST /providers/me/services must be closed to a customer',
    );
    await expectLater(
      customer.api.patch('/providers/me/services/1', body: {'price': 1}),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
      reason: 'PATCH /providers/me/services/:id must be closed to a customer',
    );
    await expectLater(
      customer.api.delete('/providers/me/services/1'),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
      reason: 'DELETE /providers/me/services/:id must be closed to a customer',
    );

    // And a customer cannot mutate a provider's queue.
    final queue = await customer.api.get('/queue') as List;
    if (queue.isNotEmpty) {
      final id = (queue.first as Map)['id'];
      await expectLater(
        customer.api.patch('/queue/$id', body: {'status': 'COMPLETED'}),
        throwsA(isA<ApiException>()),
      );
    }
  });

  test('an admin is not treated as the provider', () async {
    final admin = await session(adminEmail, pass: adminPassword);
    // /providers/me is PROVIDER-only; an admin has no linked business.
    await expectLater(
      admin.api.get('/providers/me'),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
    );
  });

  test('session persists across a restart', () async {
    final tokens = SecureTokenStore(const FlutterSecureStorage());
    final first = AuthState(tokens);
    final firstApi = ApiClient(
      readToken: first.readToken,
      onUnauthorized: first.logout,
    );
    first.api = AuthApi(firstApi);
    await first.signIn(email: providerEmail, password: password);

    // A new AuthState over the same secure storage is a relaunch.
    final second = AuthState(tokens);
    final secondApi = ApiClient(
      readToken: second.readToken,
      onUnauthorized: second.logout,
    );
    second.api = AuthApi(secondApi);
    await second.restoreSession();

    expect(second.isAuthenticated, isTrue);
    expect(second.role, UserRole.provider);

    final repo = ProviderRepository(secondApi, QueryCache());
    final profile = await repo.refreshProfile();
    expect(profile.businessName, isNotEmpty);
  });
}
