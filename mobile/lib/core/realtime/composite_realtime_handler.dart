import 'realtime_events.dart';

/// Fans one socket out to several handlers.
///
/// A session has exactly one role, but the app is built before the role is
/// known, so both the customer and provider handlers are wired up and each
/// simply no-ops on events its role never receives. Rooms are assigned
/// server-side from the JWT, so a customer's socket is never even sent a
/// provider event — this is about keeping the composition root simple, not
/// about filtering for safety.
///
/// The alternative — rebuilding the socket when the role resolves — would
/// mean tearing down and re-handshaking a working connection for no gain.
class CompositeRealtimeHandler implements RealtimeEventHandler {
  const CompositeRealtimeHandler(this._handlers);

  final List<RealtimeEventHandler> _handlers;

  @override
  void onReconnected() {
    for (final handler in _handlers) {
      handler.onReconnected();
    }
  }

  @override
  void onBookingStatusChanged(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onBookingStatusChanged(payload);
    }
  }

  @override
  void onMyQueueUpdate(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onMyQueueUpdate(payload);
    }
  }

  @override
  void onProviderQueueUpdated(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onProviderQueueUpdated(payload);
    }
  }

  @override
  void onProviderStatusChanged(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onProviderStatusChanged(payload);
    }
  }

  @override
  void onNotificationNew(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onNotificationNew(payload);
    }
  }

  @override
  void onProviderAvailabilityChanged(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onProviderAvailabilityChanged(payload);
    }
  }

  @override
  void onProviderFuelUpdated(Map<String, dynamic> payload) {
    for (final handler in _handlers) {
      handler.onProviderFuelUpdated(payload);
    }
  }
}
