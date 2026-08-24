/// Event names emitted by `backend/src/sockets/queueEvents.js`.
///
/// Kept as constants so a typo is a compile error rather than a listener
/// that silently never fires — the failure mode that is hardest to notice,
/// because the app still works, just without live updates.
class RealtimeEvents {
  const RealtimeEvents._();

  /// `{ bookingId, status }` → the booking's own customer.
  static const bookingStatusChanged = 'booking:status_changed';

  /// A full queue entry, or `{ id, removed: true }` when the row is gone →
  /// the entry's own customer.
  static const queueMyUpdate = 'queue:my_update';

  /// `{ providerId, entries, summary }` → a provider's management room.
  /// Customers are never in that room, so they never receive this.
  static const queueProviderUpdated = 'queue:provider_updated';

  /// `{ providerId, isOpen, estimatedWaitMinutes, isApproved }` → broadcast
  /// to every authenticated socket. Public availability only; it carries
  /// nothing that GET /providers does not already return.
  static const providerStatusChanged = 'provider:status_changed';
}

/// What the socket layer does with an event, without knowing how.
///
/// Lets [SocketService] stay a pure transport — it parses the frame and
/// delegates — while the cache-writing logic lives with the feature that
/// owns those keys, and can be unit-tested with no socket at all.
abstract class RealtimeEventHandler {
  /// Fired on every successful connect, including reconnects after a drop.
  /// Missed events are not replayed, so this must resynchronise from REST.
  void onReconnected();

  void onBookingStatusChanged(Map<String, dynamic> payload);

  void onMyQueueUpdate(Map<String, dynamic> payload);

  void onProviderQueueUpdated(Map<String, dynamic> payload);

  /// A provider's public availability changed. Received by every signed-in
  /// client, including customers browsing discovery.
  void onProviderStatusChanged(Map<String, dynamic> payload);
}
