import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/location/location_service.dart';
import '../../../core/models/live_camera_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/live_video_player.dart';
import '../../../core/widgets/location_action_buttons.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';
import '../data/customer_repository.dart';
import '../widgets/fuel_status_list.dart';
import '../widgets/live_camera_ui.dart';

/// Dedicated "watch live" screen for the one provider currently wired up
/// for Phase F. Reached from the Home screen's Live Station card.
///
/// Deliberately reuses every existing customer data hook rather than
/// inventing a second way to read a provider's fuel/queue/location: the
/// provider list, fuel, queue-summary and distance computation are exactly
/// what `ProviderDetailsScreen` already uses.
class LiveStationScreen extends StatelessWidget {
  const LiveStationScreen({super.key, required this.providerId});

  final int providerId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();
    final location = context.watch<LocationService>();
    final token = context.watch<AuthState>().token;

    // There is no GET /providers/:id endpoint; the list is the source, and
    // it is already cached, so this costs nothing extra — same as
    // ProviderDetailsScreen.
    final providersState = repo.watchProviders();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.liveStationAppBarTitle)),
      body: AsyncView<List<ServiceProvider>>(
        value: providersState,
        onRetry: repo.refreshProviders,
        builder: (context, providers) {
          final provider = providers
              .where((p) => p.id == providerId)
              .firstOrNull;

          // Covers both a bad id and a provider that simply has no camera —
          // a clean message rather than a crash if someone navigates here
          // directly.
          if (provider == null || !provider.liveCameraEnabled) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  l10n.liveStationNotAvailable,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            );
          }

          final camera = repo.watchLiveCameraStatus(provider.id).valueOrNull;
          final isLive = camera?.status == LiveCameraStatusValue.live;
          final queue = repo.watchQueueSummary(provider.id).valueOrNull;
          final fuelState = repo.watchProviderFuel(provider.id);
          final distanceKm =
              location.position != null &&
                  provider.latitude != null &&
                  provider.longitude != null
              ? distanceKmBetween(
                  location.position!,
                  provider.latitude!,
                  provider.longitude!,
                )
              : null;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      provider.businessName,
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusChip(
                    label: liveCameraStatusLabel(l10n, camera?.status),
                    tone: liveCameraStatusTone(camera?.status),
                    icon: isLive ? Icons.videocam : Icons.videocam_off_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  color: theme.colorScheme.surfaceContainerHighest,
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    // Never even constructed unless the fetched status is
                    // genuinely LIVE with a real playback path — a clean
                    // placeholder otherwise, never a fabricated player.
                    child: (isLive && camera?.playbackUrl != null)
                        ? LiveVideoPlayer(
                            playbackUrl: camera!.playbackUrl!,
                            token: token,
                          )
                        : const CameraUnavailableView(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                l10n.liveCameraPrivacyNote,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),

              const SizedBox(height: 20),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusChip(
                    label: provider.isOpen ? l10n.providerOpen : l10n.providerClosed,
                    tone: provider.isOpen ? StatusTone.success : StatusTone.neutral,
                  ),
                  if (queue != null)
                    Text(
                      '${l10n.providerInLine(queue.queueLength)} · '
                      '${l10n.providerWaitMinutes(queue.estimatedWaitMinutes)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(
                    Icons.place_outlined,
                    size: 16,
                    color: status.mutedForeground,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      distanceKm != null
                          ? '${l10n.providerDistanceKm(distanceKm.toStringAsFixed(1))} · ${provider.address}'
                          : provider.address,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LocationActionButtons(
                latitude: provider.latitude,
                longitude: provider.longitude,
                address: provider.address,
                origin: location.position,
              ),

              // Only shown once real fuel inventory rows exist — never a
              // fabricated card, same rule as ProviderDetailsScreen.
              ...fuelState.map(
                onData: (items) => items.isEmpty
                    ? const []
                    : _fuelSection(l10n, theme, items),
                onLoading: (previous) => (previous == null || previous.isEmpty)
                    ? const []
                    : _fuelSection(l10n, theme, previous),
                onError: (error, previous) => (previous == null || previous.isEmpty)
                    ? const []
                    : _fuelSection(l10n, theme, previous),
              ),
            ],
          );
        },
      ),
    );
  }
}

List<Widget> _fuelSection(
  AppLocalizations l10n,
  ThemeData theme,
  List<FuelInventoryItem> items,
) => [
  const SizedBox(height: 20),
  Text(
    l10n.fuelAvailabilityTitle,
    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  ),
  const SizedBox(height: 6),
  Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: FuelStatusList(items: items),
    ),
  ),
];
