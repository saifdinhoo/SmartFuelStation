import '../../../core/models/models.dart';
import '../../../core/realtime/realtime_events.dart';
import '../../../core/state/query_cache.dart';
import 'notification_repository.dart';

/// Turns `notification:new` into a QueryCache write, and every other event
/// into a no-op — notifications only care about the one event that is
/// actually theirs. Mirrors CustomerRealtimeHandler/ProviderRealtimeHandler's
/// shape so the pattern stays consistent across features.
class NotificationRealtimeHandler implements RealtimeEventHandler {
  NotificationRealtimeHandler(this._cache);

  final QueryCache _cache;

  /// Counts events applied — same convention as the other realtime
  /// handlers, used by tests to prove no double-apply on reconnect.
  int appliedEvents = 0;

  @override
  void onReconnected() {
    // A notification created while this socket was down was never pushed
    // and is not replayed — resync from REST like every other feature does.
    _cache.invalidate(NotificationCacheKeys.notifications);
  }

  /// The full created Notification row.
  @override
  void onNotificationNew(Map<String, dynamic> payload) {
    final notification = AppNotification.fromJson(payload);

    final patched = _cache.update<List<AppNotification>>(
      NotificationCacheKeys.notifications,
      (current) => [notification, ...current],
    );
    // Nothing cached yet (the bell/list was never opened this session):
    // fall back to invalidation so it is fetched rather than dropped.
    if (!patched) _cache.invalidate(NotificationCacheKeys.notifications);

    appliedEvents++;
  }

  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {}

  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {}

  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {}

  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {}
}
