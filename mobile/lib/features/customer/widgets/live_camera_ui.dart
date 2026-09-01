import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/live_camera_models.dart';
import '../../../core/widgets/status_chip.dart';

/// Localized badge label for a fetched camera status.
///
/// [status] is nullable to also cover "not fetched yet" (still loading) —
/// which must render the same as OFFLINE/UNAVAILABLE, never as LIVE. This
/// is what makes "never show a LIVE badge unless the real status is LIVE" a
/// property of the type rather than something each call site has to get
/// right on its own.
String liveCameraStatusLabel(
  AppLocalizations l10n,
  LiveCameraStatusValue? status,
) => status == LiveCameraStatusValue.live
    ? l10n.liveCameraLive
    : l10n.liveCameraOffline;

StatusTone liveCameraStatusTone(LiveCameraStatusValue? status) =>
    status == LiveCameraStatusValue.live ? StatusTone.success : StatusTone.neutral;
