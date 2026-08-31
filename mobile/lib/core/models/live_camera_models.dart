import 'models.dart';

export 'models.dart';

/// GET /providers/:id/live-camera's `status` field.
///
/// Mirrors the backend's own `CAMERA_STATUS` enum
/// (backend/src/services/liveCamera.service.js) exactly:
///   - [unavailable]: this provider has no camera hardware at all.
///   - [offline]: the provider has a camera, but no upstream source is
///     configured server-side right now — the real state of every demo
///     provider until an actual gas station's feed is wired up.
///   - [live]: a real upstream is configured and `playbackUrl` is a real,
///     watchable path.
///
/// An unrecognized string defaults to [unavailable] rather than throwing —
/// the same "never crash on an unknown enum string" convention as
/// [BookingStatus.fromApi]/[ComplaintStatus.fromApi] elsewhere in this app —
/// and, critically, never defaults to [live]: an unrecognized value must
/// never be read as "the camera is on".
enum LiveCameraStatusValue {
  live,
  offline,
  unavailable;

  static LiveCameraStatusValue fromApi(String? value) => switch (value) {
    'LIVE' => live,
    'OFFLINE' => offline,
    'UNAVAILABLE' => unavailable,
    _ => unavailable,
  };
}

/// GET /providers/:id/live-camera. [playbackUrl], when present, is a
/// server-relative path (already including `/api`) that must be resolved
/// against `Env.socketUrl` — never constructed, guessed, or hardcoded by
/// the client — and is only ever non-null when [status] is
/// [LiveCameraStatusValue.live].
class LiveCameraStatus {
  const LiveCameraStatus({
    required this.providerId,
    required this.available,
    required this.status,
    this.playbackUrl,
  });

  final int providerId;
  final bool available;
  final LiveCameraStatusValue status;
  final String? playbackUrl;

  factory LiveCameraStatus.fromJson(Map<String, dynamic> json) =>
      LiveCameraStatus(
        providerId: asInt(json['providerId']),
        available: asBool(json['available']),
        status: LiveCameraStatusValue.fromApi(
          asStringOrNull(json['status']),
        ),
        playbackUrl: asStringOrNull(json['playbackUrl']),
      );
}
