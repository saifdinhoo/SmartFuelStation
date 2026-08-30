import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/state/async_value.dart';
import '../../../core/state/query_cache.dart';

/// One cache key for the whole feature. The unread badge is derived from
/// the same cached list rather than a second endpoint/key — one source of
/// truth, no risk of the badge and the list disagreeing.
class NotificationCacheKeys {
  const NotificationCacheKeys._();

  static const notifications = 'notifications';
}

/// Notifications are user-scoped, not role-scoped — there is exactly one
/// inbox per signed-in account, shared by customer, provider and admin.
class NotificationRepository {
  NotificationRepository(this._api, this._cache);

  final ApiClient _api;
  final QueryCache _cache;

  Future<List<AppNotification>> _loadNotifications() async {
    final raw = await _api.get('/notifications') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map(
          (json) => AppNotification.fromJson(Map<String, dynamic>.from(json)),
        )
        .toList();
  }

  AsyncValue<List<AppNotification>> watchNotifications() =>
      _cache.watch(NotificationCacheKeys.notifications, _loadNotifications);

  Future<List<AppNotification>> refreshNotifications() =>
      _cache.refresh(NotificationCacheKeys.notifications, _loadNotifications);

  int unreadCountOf(List<AppNotification> notifications) =>
      notifications.where((n) => !n.isRead).length;

  Future<void> markRead(int id) async {
    await _api.patch('/notifications/$id/read');
    _cache.invalidate(NotificationCacheKeys.notifications);
  }

  Future<void> markAllRead() async {
    await _api.patch('/notifications/read-all');
    _cache.invalidate(NotificationCacheKeys.notifications);
  }
}
