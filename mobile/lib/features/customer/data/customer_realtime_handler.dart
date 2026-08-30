import '../../../core/models/models.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/state/query_cache.dart';
import 'customer_repository.dart';

/// Turns socket events into QueryCache writes.
///
/// There is deliberately no second store: every event either patches the
/// cache the screens already read, or marks a key stale so it refetches.
/// REST over PostgreSQL stays authoritative — a pushed payload is treated
/// as a head start, never as a replacement for the server's own answer.
class CustomerRealtimeHandler implements RealtimeEventHandler {
  CustomerRealtimeHandler(this._cache);

  final QueryCache _cache;

  /// Counts events applied. Used by the integration test to prove a
  /// reconnect does not replay or double-apply anything.
  int appliedEvents = 0;

  @override
  void onReconnected() {
    // Events that fired while the socket was down are gone — Socket.IO does
    // not replay them. Anything time-sensitive is therefore refetched, which
    // is what makes a reconnect converge on the database rather than on
    // whatever was cached before the gap.
    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidate(CacheKeys.myQueue);
    _cache.invalidatePrefix(CacheKeys.providerPrefix);
    // Provider availability can have changed during the gap too.
    _cache.invalidate(CacheKeys.providers);
  }

  /// `{ bookingId, status }`.
  ///
  /// The status is invalidated rather than written straight in: the payload
  /// carries only two fields, while the screens need the full booking
  /// (service, price, timestamps). Refetching is both correct and cheap,
  /// since the list is one request.
  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {
    final bookingId = asIntOrNull(payload['bookingId']);
    if (bookingId == null) return;

    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidate(CacheKeys.booking(bookingId));

    // A booking moving to or from IN_QUEUE/IN_SERVICE is exactly when the
    // customer's place in line changes too.
    _cache.invalidate(CacheKeys.myQueue);

    appliedEvents++;
  }

  /// A full queue entry, or `{ id, removed: true }`.
  ///
  /// Position, customersAhead and estimatedWaitMinutes are all present in
  /// the payload and are computed server-side across the whole line, so
  /// this one is patched in place — the numbers on screen change the
  /// instant the push lands, with no round trip.
  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {
    final entryId = asIntOrNull(payload['id']);
    if (entryId == null) return;

    final removed = payload['removed'] == true;

    final patched = _cache.update<List<QueueEntry>>(CacheKeys.myQueue, (
      current,
    ) {
      if (removed) {
        return current.where((e) => e.id != entryId).toList();
      }

      final entry = QueueEntry.fromJson(payload);
      final index = current.indexWhere((e) => e.id == entryId);
      if (index < 0) return [...current, entry];

      // Replace in place so ordering stays stable and the list does not
      // visibly reshuffle on every push.
      final next = [...current];
      next[index] = entry;
      return next;
    });

    // Nothing cached yet (the queue screen was never opened): fall back to
    // invalidation so the data is fetched rather than silently dropped.
    if (!patched) _cache.invalidate(CacheKeys.myQueue);

    // A terminal queue transition also moves the linked booking.
    final bookingId = asIntOrNull(payload['bookingId']);
    if (bookingId != null) {
      _cache.invalidate(CacheKeys.bookings);
      _cache.invalidate(CacheKeys.booking(bookingId));
    }

    appliedEvents++;
  }

  /// Only reaches provider/admin sockets — a customer is never in a
  /// `provider:` room. Handled so provider mobile inherits it later.
  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {
    final providerId = asIntOrNull(payload['providerId']);
    if (providerId == null) return;

    _cache.invalidate(CacheKeys.queueSummary(providerId));
    appliedEvents++;
  }

  /// `{ providerId, isOpen, estimatedWaitMinutes, isApproved }`.
  ///
  /// Patched in place: the payload carries every field it changes, so
  /// refetching the whole provider list to learn one boolean would be a
  /// wasted round trip. Discovery, Home and provider details all read the
  /// same `providers` key, so one write updates every screen at once.
  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {
    final providerId = asIntOrNull(payload['providerId']);
    if (providerId == null) return;

    final isOpen = payload['isOpen'];
    final wait = asIntOrNull(payload['estimatedWaitMinutes']);
    // isApproved is absent from older payloads; treat unknown as approved
    // so a missing field never hides a business that is actually listed.
    final isApproved = payload['isApproved'] is bool
        ? payload['isApproved'] as bool
        : true;

    final patched = _cache.update<List<ServiceProvider>>(CacheKeys.providers, (
      current,
    ) {
      // Losing approval removes a business from customer listings entirely
      // — that is what GET /providers would return next, so the cache has
      // to match rather than keep showing a now-hidden provider.
      if (!isApproved) {
        return current.where((p) => p.id != providerId).toList();
      }

      return current
          .map(
            (p) => p.id == providerId
                ? p.copyWithStatus(
                    isOpen: isOpen is bool ? isOpen : p.isOpen,
                    estimatedWaitMinutes: wait ?? p.estimatedWaitMinutes,
                  )
                : p,
          )
          .toList();
    });

    // A provider gaining approval is not in the cached list at all, so
    // there is nothing to patch — fetch instead.
    if (!patched || !isApproved) _cache.invalidate(CacheKeys.providers);

    // The advertised wait feeds the details screen's queue card too.
    _cache.invalidate(CacheKeys.queueSummary(providerId));

    appliedEvents++;
  }

  /// Notifications are handled by NotificationRealtimeHandler, shared by
  /// every role — nothing customer-specific to do here.
  @override
  void onNotificationNew(Map<String, dynamic> payload) {}
}
