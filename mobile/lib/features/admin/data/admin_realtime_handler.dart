import '../../../core/models/admin_models.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/state/query_cache.dart';
import 'admin_repository.dart';

/// Maps socket events onto the admin area's cache keys.
///
/// The admin's live surface is deliberately narrow, because the backend
/// emits exactly one event an admin socket actually receives:
/// `provider:status_changed`, which is broadcast to every authenticated
/// socket. Everything else is addressed to a room an admin is not in —
/// `booking:status_changed` goes to the booking's customer and its owning
/// provider, and `queue:provider_updated` goes to one provider's
/// management room.
///
/// No admin-specific event was invented to close that. Users, bookings,
/// complaints, reviews and the overview counters therefore still need a
/// manual refresh (pull-to-refresh on every list), and that is reported as
/// a known gap rather than papered over with a polling timer pretending to
/// be real-time.
class AdminRealtimeHandler implements RealtimeEventHandler {
  AdminRealtimeHandler(this._cache);

  final QueryCache _cache;

  /// Counts events applied, so a test can prove a reconnect neither
  /// replays nor double-applies.
  int appliedEvents = 0;

  @override
  void onReconnected() {
    // Missed events are never replayed, and an admin receives almost none
    // to begin with, so the whole area is resynchronised from REST.
    _cache.invalidate(AdminKeys.overview);
    _cache.invalidate(AdminKeys.providers);
    _cache.invalidate(AdminKeys.bookings);
    _cache.invalidatePrefix(AdminKeys.users);
    _cache.invalidatePrefix(AdminKeys.complaints);
    _cache.invalidatePrefix(AdminKeys.reviews);
    _cache.invalidatePrefix(AdminKeys.analytics);
  }

  /// A business opened or closed. Broadcast to everyone, so the admin's
  /// list gets it too.
  ///
  /// The row is patched in place rather than refetched — the payload
  /// carries the field it changes. The overview is invalidated instead,
  /// because its `openNow` counter is an aggregate this push cannot
  /// recompute locally.
  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {
    final providerId = asIntOrNull(payload['providerId']);
    if (providerId == null) return;

    final isOpen = payload['isOpen'];
    if (isOpen is! bool) return;

    final patched = _cache.update<List<AdminProviderRow>>(
      AdminKeys.providers,
      (rows) => rows
          .map((r) => r.id == providerId ? r.copyWithStatus(isOpen: isOpen) : r)
          .toList(),
    );
    // Nothing cached to patch means no admin list is on screen; the next
    // watch will fetch it fresh anyway.
    if (!patched) return;

    _cache.invalidate(AdminKeys.overview);
    appliedEvents++;
  }

  /// Addressed to the booking's customer and its owning provider. An admin
  /// socket is in neither room, so this never arrives — the platform-wide
  /// booking list is refreshed manually.
  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {}

  /// Addressed to one provider's management room, which an admin joins
  /// only by explicitly asking to watch that queue. The admin area has no
  /// per-provider queue screen, so it never opts in.
  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {}

  /// Sent to a customer's own room.
  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {}

  /// Handled by NotificationRealtimeHandler, shared by every role.
  @override
  void onNotificationNew(Map<String, dynamic> payload) {}

  /// The admin area has no per-provider availability screen.
  @override
  void onProviderAvailabilityChanged(Map<String, dynamic> payload) {}

  /// The admin fuel management screen re-reads on demand (it already
  /// invalidates its own cache right after a successful write); no other
  /// admin session's edit needs a live push here yet.
  @override
  void onProviderFuelUpdated(Map<String, dynamic> payload) {}
}
