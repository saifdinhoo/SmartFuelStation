import '../../../core/models/models.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/state/query_cache.dart';
import 'provider_repository.dart';

/// Maps socket events onto the provider area's cache keys.
///
/// The provider's live surface is the queue: `queue:provider_updated`
/// carries the whole line after any mutation — add, reorder, start,
/// complete, remove — so one push covers every queue action, including
/// ones performed by a colleague on another device.
class ProviderRealtimeHandler implements RealtimeEventHandler {
  ProviderRealtimeHandler(this._cache);

  final QueryCache _cache;

  /// Counts events applied, so a test can prove a reconnect neither
  /// replays nor double-applies.
  int appliedEvents = 0;

  @override
  void onReconnected() {
    // Missed events are never replayed, so anything time-sensitive is
    // refetched rather than trusted from before the gap.
    _cache.invalidate(ProviderKeys.queue);
    _cache.invalidate(ProviderKeys.bookings);
    _cache.invalidate(ProviderKeys.profile);
    _cache.invalidatePrefix(ProviderKeys.analytics);
  }

  /// The snapshot holds only WAITING and IN_SERVICE rows — it is "what the
  /// line looks like now", not history. Completed and cancelled entries
  /// drop out of it by design, so the list is replaced rather than merged;
  /// merging would leave finished customers on screen forever.
  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {
    final entries =
        asMapList(payload['entries']).map(QueueEntry.fromJson).toList()..sort(
          (a, b) => (a.queuePosition ?? 0).compareTo(b.queuePosition ?? 0),
        );

    _cache.setData<List<QueueEntry>>(ProviderKeys.queue, entries);

    // A queue transition mirrors onto the linked booking, and both feed
    // the overview counters.
    _cache.invalidate(ProviderKeys.bookings);
    _cache.invalidatePrefix(ProviderKeys.analytics);

    appliedEvents++;
  }

  /// Broadcast to everyone; only this provider's own row matters here.
  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {
    final providerId = asIntOrNull(payload['providerId']);
    if (providerId == null) return;

    final cached = _cache
        .read<OwnProviderProfile>(ProviderKeys.profile)
        .valueOrNull;
    // Ignore other businesses' status entirely — this cache holds exactly
    // one provider, and that is the signed-in one.
    if (cached == null || cached.id != providerId) return;

    _cache.invalidate(ProviderKeys.profile);
    appliedEvents++;
  }

  /// Sent to the booking's own customer and, when the booking belongs to a
  /// business, to that provider's room as well — so a customer cancelling
  /// a PENDING or CONFIRMED booking now reaches the provider live instead
  /// of waiting for the next refetch.
  ///
  /// Only the booking keys are touched. The queue is deliberately left
  /// alone: the customer-cancellable states are exactly the ones with no
  /// queue entry, and every queue-driven transition already arrives as a
  /// `queue:provider_updated` snapshot.
  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {
    final bookingId = asIntOrNull(payload['bookingId']);
    if (bookingId == null) return;

    _cache.invalidate(ProviderKeys.bookings);
    _cache.invalidate('booking/$bookingId');
    // A cancellation changes the cancelled/total split the overview reads.
    _cache.invalidatePrefix(ProviderKeys.analytics);

    appliedEvents++;
  }

  /// Sent to a customer's own room, not a provider's.
  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {}

  /// Handled by NotificationRealtimeHandler, shared by every role.
  @override
  void onNotificationNew(Map<String, dynamic> payload) {}

  /// The provider area has no availability-browsing screen of its own —
  /// bookings and queue changes already reach it via the events above.
  @override
  void onProviderAvailabilityChanged(Map<String, dynamic> payload) {}

  /// `{ providerId }` is broadcast rather than room-targeted (see
  /// notifyProviderFuelUpdated's own doc comment), so there is no numeric
  /// id here to compare against this session's own provider — the own-fuel
  /// key is simply always invalidated, mirroring how onProviderStatusChanged
  /// above must re-derive relevance from the cached profile instead.
  @override
  void onProviderFuelUpdated(Map<String, dynamic> payload) {
    _cache.invalidate(ProviderKeys.fuel);
    appliedEvents++;
  }

  /// `{ providerId }` is broadcast rather than room-targeted, for the same
  /// reason [onProviderFuelUpdated] above documents: there is no numeric id
  /// here that can be locally matched against "is this me" without an extra
  /// lookup, so the own finance and commission keys are simply always
  /// invalidated — cheap and harmless even on the sessions it did not
  /// actually concern.
  @override
  void onFinanceUpdated(Map<String, dynamic> payload) {
    _cache.invalidatePrefix(ProviderKeys.financeSummary);
    _cache.invalidate(ProviderKeys.financeTransactions);
    _cache.invalidate(ProviderKeys.commission);
    appliedEvents++;
  }
}
