import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/env.dart';
import 'realtime_events.dart';

/// The app's single Socket.IO connection.
///
/// Mirrors the web's SocketProvider: connect once the user is
/// authenticated, disconnect on logout, re-handshake if the account
/// changes, and route every event through one place instead of letting
/// screens subscribe individually.
///
/// Deliberately owns no domain state. Sockets are a notification channel;
/// PostgreSQL reached over REST stays the source of truth, so every handler
/// either writes what the server just pushed or invalidates a cache key so
/// it is refetched.
class SocketService extends ChangeNotifier {
  SocketService({required this.readToken, required this.handler});

  /// Read at connect time rather than captured, so a re-connect after a
  /// login picks up the new token.
  final String? Function() readToken;

  /// Where events are turned into cache writes. Injected so the socket
  /// layer stays testable without a cache, and so this file never imports
  /// a feature repository.
  final RealtimeEventHandler handler;

  io.Socket? _socket;
  bool _connected = false;

  /// The token the live socket was opened with. Used to detect a session
  /// change: the handshake only sends `auth` once, so a new token needs a
  /// fresh connection rather than a mutated field.
  String? _connectedWith;

  bool get isConnected => _connected;

  /// Opens a connection for the current token, or replaces an existing one
  /// if the token changed. Safe to call repeatedly — it is a no-op when a
  /// socket is already open for the same token, which is what keeps
  /// duplicate connections and duplicate listeners from piling up.
  void connect() {
    final token = readToken();
    if (token == null || token.isEmpty) {
      disconnect();
      return;
    }
    if (_socket != null && _connectedWith == token) return;

    // A different account (or a refreshed token) means the old socket is
    // authenticated as someone else — tear it down completely.
    disconnect();

    final socket = io.io(
      Env.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          // Reconnection is handled by the client library; the important
          // part is what happens *after* it succeeds — see _onConnect.
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(10000)
          .enableForceNew()
          .build(),
    );

    _connectedWith = token;
    _socket = socket;
    _bind(socket);
    socket.connect();
  }

  void disconnect() {
    final socket = _socket;
    if (socket == null) return;

    // clearListeners before dispose so nothing fires during teardown.
    socket.clearListeners();
    socket.dispose();
    _socket = null;
    _connectedWith = null;
    if (_connected) {
      _connected = false;
      notifyListeners();
    }
  }

  /// Registers handlers exactly once per socket instance.
  ///
  /// `off` before `on` is belt-and-braces: [connect] already guarantees a
  /// fresh socket, but a stray double-bind would otherwise mean every event
  /// applied twice.
  void _bind(io.Socket socket) {
    socket
      ..off('connect')
      ..off('disconnect')
      ..off('connect_error')
      ..off(RealtimeEvents.bookingStatusChanged)
      ..off(RealtimeEvents.queueMyUpdate)
      ..off(RealtimeEvents.queueProviderUpdated)
      ..off(RealtimeEvents.providerStatusChanged)
      ..off(RealtimeEvents.notificationNew)
      ..off(RealtimeEvents.providerAvailabilityChanged)
      ..on('connect', _onConnect)
      ..on('disconnect', _onDisconnect)
      ..on('connect_error', _onConnectError)
      ..on(RealtimeEvents.bookingStatusChanged, _onBookingStatusChanged)
      ..on(RealtimeEvents.queueMyUpdate, _onQueueMyUpdate)
      ..on(RealtimeEvents.queueProviderUpdated, _onProviderQueueUpdated)
      ..on(RealtimeEvents.providerStatusChanged, _onProviderStatusChanged)
      ..on(RealtimeEvents.notificationNew, _onNotificationNew)
      ..on(
        RealtimeEvents.providerAvailabilityChanged,
        _onProviderAvailabilityChanged,
      );
  }

  void _onConnect(dynamic _) {
    _connected = true;
    notifyListeners();
    // First connect or a recovery after a drop: anything could have changed
    // while disconnected, and missed events are not replayed. Refetching is
    // what guarantees the screen matches the database rather than trusting
    // whatever was cached before the gap.
    handler.onReconnected();
  }

  void _onDisconnect(dynamic _) {
    if (!_connected) return;
    _connected = false;
    // Cached data stays on screen; only the live indicator changes.
    notifyListeners();
  }

  void _onConnectError(dynamic error) {
    if (_connected) {
      _connected = false;
      notifyListeners();
    }
    // A rejected handshake (bad/expired token) surfaces here. The REST 401
    // interceptor is what actually ends the session, so this only logs —
    // tearing down auth from two places would race.
    debugPrint('Socket connect error: $error');
  }

  void _onBookingStatusChanged(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onBookingStatusChanged(map);
  }

  void _onQueueMyUpdate(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onMyQueueUpdate(map);
  }

  /// Only providers and admins are ever in a `provider:` room, so a
  /// customer will never receive this. Handled anyway so a provider signed
  /// in on mobile later gets the same treatment without a second socket.
  void _onProviderQueueUpdated(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onProviderQueueUpdated(map);
  }

  void _onProviderStatusChanged(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onProviderStatusChanged(map);
  }

  void _onNotificationNew(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onNotificationNew(map);
  }

  void _onProviderAvailabilityChanged(dynamic payload) {
    final map = _asMap(payload);
    if (map == null) return;
    handler.onProviderAvailabilityChanged(map);
  }

  Map<String, dynamic>? _asMap(dynamic payload) =>
      payload is Map ? Map<String, dynamic>.from(payload) : null;

  /// Emits [event] and waits for the server's acknowledgement.
  ///
  /// The backend answers `queue:watch_provider` with
  /// `{ ok: bool, error?: String }` and validates the request against the
  /// socket's JWT — so a refusal here is the server's decision, not a
  /// client-side check. Returns null if no socket is open or the server
  /// does not answer within [timeout].
  Future<Map<String, dynamic>?> rawEmitWithAck(
    String event,
    Map<String, dynamic> payload, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final socket = _socket;
    if (socket == null) return null;

    final completer = Completer<Map<String, dynamic>?>();
    socket.emitWithAck(
      event,
      payload,
      ack: (dynamic response) {
        if (!completer.isCompleted) completer.complete(_asMap(response));
      },
    );

    return completer.future.timeout(timeout, onTimeout: () => null);
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
