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

/// Two-client real-time verification against a running backend.
///
/// A real provider drives the booking through its lifecycle over REST while
/// a real customer sits on a live Socket.IO connection, and we assert the
/// customer's cache changes with no manual refresh.
///
///   flutter test test/live_socket_test.dart --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:5000/api
void main() {
  const customerEmail = 'layla@smartauto.local';
  const providerEmail = 'provider@smartauto.local';
  const password = 'demo123';

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
  });

  /// A signed-in session with its own token store, so the customer and the
  /// provider never share credentials.
  Future<
    ({AuthState auth, ApiClient api, QueryCache cache, CustomerRepository repo})
  >
  session(String email) async {
    final tokens = SecureTokenStore(const FlutterSecureStorage());
    final auth = AuthState(tokens);
    final api = ApiClient(
      readToken: auth.readToken,
      onUnauthorized: auth.logout,
    );
    auth.api = AuthApi(api);
    final cache = QueryCache();
    await auth.signIn(email: email, password: password);
    return (
      auth: auth,
      api: api,
      cache: cache,
      repo: CustomerRepository(api, cache),
    );
  }

  /// Polls until [condition] holds, so assertions do not depend on a fixed
  /// sleep. Fails with [reason] if the push never arrives.
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

  test(
    'provider drives the lifecycle; customer updates over the socket',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      final handler = CustomerRealtimeHandler(customer.cache);
      final socket = SocketService(
        readToken: customer.auth.readToken,
        handler: handler,
      );

      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'socket never connected');

      // --- the customer makes a real booking -------------------------------
      final providers = await customer.repo.refreshProviders();
      final business = providers.firstWhere(
        (p) => p.bookableServices.isNotEmpty,
      );
      final service = business.bookableServices.first;

      final booking = await customer.repo.createBooking(
        providerServiceId: service.id,
        scheduledAt: DateTime.now().add(const Duration(days: 950)),
        notes: 'Phase 2 realtime verification',
      );
      expect(booking.status, BookingStatus.pending);

      // Prime the caches the screens would have open.
      await customer.repo.refreshBookings();
      await customer.repo.refreshMyQueue();

      Future<void> providerSets(String status) => provider.api.patch(
        '/bookings/${booking.id}',
        body: {'status': status},
      );

      /// The customer's own view of this booking, refetched the way a
      /// watching screen would after the socket invalidated it.
      Future<BookingStatus> customerSeesStatus() async {
        final list = await customer.repo.refreshBookings();
        return list.firstWhere((b) => b.id == booking.id).status;
      }

      // --- 3. provider confirms --------------------------------------------
      var eventsBefore = handler.appliedEvents;
      await providerSets('CONFIRMED');
      await waitFor(
        () => handler.appliedEvents > eventsBefore,
        reason: 'no booking:status_changed for CONFIRMED',
      );
      expect(await customerSeesStatus(), BookingStatus.confirmed);

      // --- 5. provider marks arrived ---------------------------------------
      eventsBefore = handler.appliedEvents;
      await providerSets('ARRIVED');
      await waitFor(
        () => handler.appliedEvents > eventsBefore,
        reason: 'no booking:status_changed for ARRIVED',
      );
      expect(await customerSeesStatus(), BookingStatus.arrived);

      // --- 6/7. provider queues the customer -------------------------------
      eventsBefore = handler.appliedEvents;
      final entryJson =
          await provider.api.post('/queue', body: {'bookingId': booking.id})
              as Map;
      final entryId = entryJson['id'] as int;

      await waitFor(
        () => handler.appliedEvents > eventsBefore,
        reason: 'no queue push after being added to the line',
      );

      // Position and wait arrive in the push itself — patched straight into
      // the cache with no REST call.
      await waitFor(
        () =>
            customer.cache
                .read<List<QueueEntry>>(CacheKeys.myQueue)
                .valueOrNull
                ?.any((e) => e.id == entryId) ??
            false,
        reason: 'queue entry never appeared in the customer cache',
      );

      final queued = customer.cache
          .read<List<QueueEntry>>(CacheKeys.myQueue)
          .valueOrNull!
          .firstWhere((e) => e.id == entryId);
      expect(queued.status, QueueStatus.waiting);
      expect(queued.position, isNotNull);
      expect(queued.customersAhead, isNotNull);
      expect(await customerSeesStatus(), BookingStatus.inQueue);

      // --- 8/9. provider starts service ------------------------------------
      eventsBefore = handler.appliedEvents;
      await provider.api.patch(
        '/queue/$entryId',
        body: {'status': 'IN_SERVICE'},
      );

      await waitFor(
        () =>
            customer.cache
                .read<List<QueueEntry>>(CacheKeys.myQueue)
                .valueOrNull
                ?.firstWhere((e) => e.id == entryId)
                .status ==
            QueueStatus.inService,
        reason: 'queue entry never flipped to IN_SERVICE over the socket',
      );
      expect(handler.appliedEvents, greaterThan(eventsBefore));
      expect(await customerSeesStatus(), BookingStatus.inService);

      // --- 10/11. provider completes ---------------------------------------
      await provider.api.patch(
        '/queue/$entryId',
        body: {'status': 'COMPLETED'},
      );

      await waitFor(
        () =>
            customer.cache
                .read<List<QueueEntry>>(CacheKeys.myQueue)
                .valueOrNull
                ?.firstWhere((e) => e.id == entryId)
                .status ==
            QueueStatus.completed,
        reason: 'queue entry never flipped to COMPLETED over the socket',
      );
      expect(await customerSeesStatus(), BookingStatus.completed);
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'reconnect resyncs from REST and does not duplicate listeners',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      final handler = CustomerRealtimeHandler(customer.cache);
      final socket = SocketService(
        readToken: customer.auth.readToken,
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'initial connect failed');

      // connect() again with the same token must be a no-op, not a second
      // socket with a second set of listeners.
      socket.connect();
      socket.connect();
      expect(socket.isConnected, isTrue);

      final providers = await customer.repo.refreshProviders();
      final service = providers
          .firstWhere((p) => p.bookableServices.isNotEmpty)
          .bookableServices
          .first;
      final booking = await customer.repo.createBooking(
        providerServiceId: service.id,
        scheduledAt: DateTime.now().add(const Duration(days: 960)),
      );
      await customer.repo.refreshBookings();

      // One provider action must produce exactly one applied event. More than
      // one would mean a duplicated listener.
      final before = handler.appliedEvents;
      await provider.api.patch(
        '/bookings/${booking.id}',
        body: {'status': 'CONFIRMED'},
      );
      await waitFor(
        () => handler.appliedEvents > before,
        reason: 'no event after confirm',
      );
      await Future<void>.delayed(const Duration(milliseconds: 600));
      expect(
        handler.appliedEvents - before,
        1,
        reason: 'one server action must apply exactly one event',
      );

      // --- 12. drop the socket and change state while it is down -----------
      socket.disconnect();
      expect(socket.isConnected, isFalse);

      // Cached data is still there while offline.
      expect(
        customer.cache.read<List<Booking>>(CacheKeys.bookings).valueOrNull,
        isNotNull,
      );

      final missedEvents = handler.appliedEvents;
      await provider.api.patch(
        '/bookings/${booking.id}',
        body: {'status': 'ARRIVED'},
      );
      await Future<void>.delayed(const Duration(milliseconds: 500));
      expect(
        handler.appliedEvents,
        missedEvents,
        reason: 'a disconnected client must not receive events',
      );

      // Reconnect: the missed change is recovered from REST, not replayed.
      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'reconnect failed');

      final resynced = await customer.repo.refreshBookings();
      expect(
        resynced.firstWhere((b) => b.id == booking.id).status,
        BookingStatus.arrived,
        reason: 'reconnect must converge on the database state',
      );

      // cleanup: leave the booking in a terminal state
      await provider.api.patch(
        '/bookings/${booking.id}',
        body: {'status': 'CANCELLED'},
      );
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'provider toggles open/closed and wait; customer updates live',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      final handler = CustomerRealtimeHandler(customer.cache);
      final socket = SocketService(
        readToken: customer.auth.readToken,
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'socket never connected');

      // Customer opens discovery.
      final initial = await customer.repo.refreshProviders();
      final me = await provider.api.get('/providers/me') as Map;
      final providerId = me['id'] as int;
      final originalOpen = me['isOpen'] as bool;
      final originalWait = me['estimatedWaitMinutes'] as int;

      expect(initial.any((p) => p.id == providerId), isTrue);

      ServiceProvider cached() => customer.cache
          .read<List<ServiceProvider>>(CacheKeys.providers)
          .valueOrNull!
          .firstWhere((p) => p.id == providerId);

      // --- provider toggles Open -> Closed ---------------------------------
      final targetOpen = !originalOpen;
      await provider.api.patch('/providers/me', body: {'isOpen': targetOpen});

      await waitFor(
        () => cached().isOpen == targetOpen,
        reason: 'open/closed never propagated to the customer',
      );

      // --- provider changes the advertised wait ----------------------------
      const targetWait = 37;
      await provider.api.patch(
        '/providers/me',
        body: {'estimatedWaitMinutes': targetWait},
      );

      await waitFor(
        () => cached().estimatedWaitMinutes == targetWait,
        reason: 'advertised wait never propagated to the customer',
      );

      // Unrelated fields survived the in-place patch.
      expect(cached().businessName, isNotEmpty);
      expect(cached().services, isNotEmpty);

      // --- disconnect, change state, reconnect, resync ---------------------
      socket.disconnect();
      expect(socket.isConnected, isFalse);

      const offlineWait = 52;
      await provider.api.patch(
        '/providers/me',
        body: {'estimatedWaitMinutes': offlineWait, 'isOpen': originalOpen},
      );
      await Future<void>.delayed(const Duration(milliseconds: 500));

      // Nothing arrived while disconnected — which is exactly why reconnect
      // must refetch rather than trust the cache.
      expect(cached().estimatedWaitMinutes, targetWait);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'reconnect failed');

      final resynced = await customer.repo.refreshProviders();
      final after = resynced.firstWhere((p) => p.id == providerId);
      expect(after.estimatedWaitMinutes, offlineWait);
      expect(after.isOpen, originalOpen);

      // restore original state
      await provider.api.patch(
        '/providers/me',
        body: {'isOpen': originalOpen, 'estimatedWaitMinutes': originalWait},
      );
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test(
    'provider status payload carries no private data',
    () async {
      final customer = await session(customerEmail);
      final provider = await session(providerEmail);

      Map<String, dynamic>? received;
      final handler = _CapturingHandler(
        customer.cache,
        onProviderStatus: (payload) => received = payload,
      );
      final socket = SocketService(
        readToken: customer.auth.readToken,
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'socket never connected');

      final me = await provider.api.get('/providers/me') as Map;
      await provider.api.patch(
        '/providers/me',
        body: {'isOpen': !(me['isOpen'] as bool)},
      );

      await waitFor(() => received != null, reason: 'no provider status event');

      // Exactly the four public fields — nothing identifying the owner or
      // exposing the business's private record.
      expect(received!.keys.toSet(), {
        'providerId',
        'isOpen',
        'estimatedWaitMinutes',
        'isApproved',
      });
      final serialized = received.toString();
      for (final private in ['address', 'phone', 'email', 'approvedById']) {
        expect(
          serialized.contains(private),
          isFalse,
          reason: '$private leaked',
        );
      }

      await provider.api.patch('/providers/me', body: {'isOpen': me['isOpen']});
    },
    timeout: const Timeout(Duration(minutes: 1)),
  );

  test(
    'a customer cannot subscribe to a provider queue stream',
    () async {
      final customer = await session(customerEmail);
      final handler = CustomerRealtimeHandler(customer.cache);
      final socket = SocketService(
        readToken: customer.auth.readToken,
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await waitFor(() => socket.isConnected, reason: 'socket never connected');

      // The backend refuses queue:watch_provider for a CUSTOMER outright.
      final result = await socket.rawEmitWithAck('queue:watch_provider', {
        'providerId': 1,
      });

      expect(result?['ok'], isFalse, reason: 'customers must be refused');
      expect(result?['error'], isNotNull);
    },
    timeout: const Timeout(Duration(minutes: 1)),
  );

  test(
    'an invalid token is refused at the handshake',
    () async {
      final handler = CustomerRealtimeHandler(QueryCache());
      final socket = SocketService(
        readToken: () => 'not-a-real-jwt',
        handler: handler,
      );
      addTearDown(socket.dispose);

      socket.connect();
      await Future<void>.delayed(const Duration(seconds: 2));

      expect(
        socket.isConnected,
        isFalse,
        reason: 'the server rejects an unverifiable token before connection',
      );
    },
    timeout: const Timeout(Duration(minutes: 1)),
  );

  test('signing out closes the socket', () async {
    final customer = await session(customerEmail);
    final handler = CustomerRealtimeHandler(customer.cache);
    final socket = SocketService(
      readToken: customer.auth.readToken,
      handler: handler,
    );
    addTearDown(socket.dispose);

    socket.connect();
    await waitFor(() => socket.isConnected, reason: 'socket never connected');

    await customer.auth.logout();
    socket.connect(); // what AppProviders' auth listener would do

    expect(socket.isConnected, isFalse);
    await expectLater(
      customer.api.get('/bookings'),
      throwsA(isA<ApiException>()),
    );
  }, timeout: const Timeout(Duration(minutes: 1)));
}

/// Wraps the real handler so a test can inspect the raw payload while the
/// normal cache behaviour still runs.
class _CapturingHandler extends CustomerRealtimeHandler {
  _CapturingHandler(super.cache, {required this.onProviderStatus});

  final void Function(Map<String, dynamic>) onProviderStatus;

  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {
    onProviderStatus(payload);
    super.onProviderStatusChanged(payload);
  }
}
