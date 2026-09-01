import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../config/env.dart';
import '../l10n/generated/app_localizations.dart';
import '../theme/app_colors.dart';

/// Minimal, muted, autoplaying viewer for the backend's proxied live-camera
/// stream (Phase F proof of concept). Deliberately dumb: no user controls,
/// no Chewie or other player-UI wrapper, no recording or screenshot
/// capability, no frame analysis of any kind — the customer only ever
/// watches, exactly like an embedded video.
///
/// [playbackUrl] is the server-relative path returned by
/// `GET /providers/:id/live-camera` (already including `/api`, e.g.
/// "/api/providers/5/live-camera/stream"). It is resolved against
/// [Env.socketUrl] — the bare origin, without the `/api` suffix
/// [Env.apiBaseUrl] already carries — never hardcoded or guessed here. The
/// JWT is attached as an `Authorization` header, never a `?token=` query
/// parameter, so it can never end up in a logged URL.
///
/// A caller must never construct this widget without a real, already-LIVE
/// [playbackUrl] — when the fetched status is not LIVE, render
/// [CameraUnavailableView] instead of this widget entirely, rather than
/// passing a null/empty URL in.
class LiveVideoPlayer extends StatefulWidget {
  const LiveVideoPlayer({super.key, required this.playbackUrl, this.token});

  final String playbackUrl;

  /// The signed-in customer's JWT, read the same way the app's Dio
  /// interceptor does (`AuthState.token`) — passed in explicitly rather than
  /// read from Provider here, so this widget stays a plain, testable leaf.
  final String? token;

  @override
  State<LiveVideoPlayer> createState() => _LiveVideoPlayerState();
}

class _LiveVideoPlayerState extends State<LiveVideoPlayer> {
  VideoPlayerController? _controller;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      final uri = Uri.parse('${Env.socketUrl}${widget.playbackUrl}');
      final token = widget.token;
      final controller = VideoPlayerController.networkUrl(
        uri,
        httpHeaders: token != null && token.isNotEmpty
            ? {'Authorization': 'Bearer $token'}
            : const {},
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      await controller.setLooping(true);
      await controller.setVolume(0);
      await controller.play();
      setState(() => _controller = controller);
    } catch (_) {
      // No real upstream is configured yet (this proof of concept has none
      // wired up), or the platform simply cannot play whatever came back —
      // either way this degrades honestly instead of showing a broken
      // player or crashing the screen.
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return const CameraUnavailableView();

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const Center(child: CircularProgressIndicator());
    }

    final ratio = controller.value.aspectRatio;
    return ColoredBox(
      color: Colors.black,
      child: AspectRatio(
        aspectRatio: ratio > 0 ? ratio : 16 / 9,
        child: VideoPlayer(controller),
      ),
    );
  }
}

/// Shared "no picture" placeholder: used both when [LiveVideoPlayer] itself
/// fails to initialize, and by a caller that never constructs it at all
/// because the status it already fetched says the camera isn't LIVE.
class CameraUnavailableView extends StatelessWidget {
  const CameraUnavailableView({super.key, this.message});

  /// Defaults to the standard "Live view is currently unavailable" copy;
  /// overridable for a caller that wants a more specific reason.
  final String? message;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.videocam_off_outlined,
              size: 36,
              color: status.mutedForeground,
            ),
            const SizedBox(height: 8),
            Text(
              message ?? l10n.liveCameraUnavailableMessage,
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
