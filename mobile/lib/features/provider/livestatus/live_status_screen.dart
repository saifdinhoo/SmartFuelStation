import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/provider_repository.dart';

/// Open/closed and advertised wait.
///
/// Saving either one makes the backend broadcast `provider:status_changed`,
/// which customers on web and mobile apply without refreshing — so this
/// screen needs no extra plumbing of its own.
class LiveStatusScreen extends StatefulWidget {
  const LiveStatusScreen({super.key});

  @override
  State<LiveStatusScreen> createState() => _LiveStatusScreenState();
}

class _LiveStatusScreenState extends State<LiveStatusScreen> {
  final _wait = TextEditingController();

  /// Seeded once from the server value. A controller rebuilt every frame
  /// would reset the cursor on every keystroke.
  bool _seeded = false;
  bool _saving = false;

  @override
  void dispose() {
    _wait.dispose();
    super.dispose();
  }

  Future<void> _run(
    Future<void> Function() action,
    String successMessage,
  ) async {
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      messenger.showSnackBar(SnackBar(content: Text(successMessage)));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final queue = repo.watchQueue().valueOrNull ?? const <QueueEntry>[];
    final waiting = queue.where((e) => e.status == QueueStatus.waiting).length;
    final serving = queue
        .where((e) => e.status == QueueStatus.inService)
        .length;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.pLiveTitle)),
      body: AsyncView<OwnProviderProfile>(
        value: repo.watchProfile(),
        onRetry: repo.refreshProfile,
        builder: (context, profile) {
          if (!_seeded) {
            _seeded = true;
            _wait.text = '${profile.estimatedWaitMinutes}';
          }
          final parsedWait = int.tryParse(_wait.text.trim());
          final canSaveWait =
              parsedWait != null &&
              parsedWait >= 0 &&
              parsedWait != profile.estimatedWaitMinutes;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.podcasts,
                            color: profile.isOpen
                                ? status.success
                                : status.mutedForeground,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              profile.isOpen
                                  ? l10n.pLiveOpenForBusiness
                                  : l10n.pOverviewClosed,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Switch(
                            value: profile.isOpen,
                            onChanged: _saving
                                ? null
                                : (value) => _run(
                                    () => repo.setOpen(value),
                                    value
                                        ? l10n.pLiveNowOpen
                                        : l10n.pLiveNowClosed,
                                  ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        profile.isOpen
                            ? l10n.pLiveOpenBody
                            : l10n.pLiveClosedBody,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                      if (!profile.isApproved) ...[
                        const SizedBox(height: 8),
                        Text(
                          l10n.pLiveNotApproved,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: status.warning,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _Metric(
                      label: l10n.pOverviewQueueLength,
                      value: '${waiting + serving}',
                      icon: Icons.people_outline,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Metric(
                      label: l10n.pLiveBeingServed,
                      value: '$serving',
                      icon: Icons.play_circle_outline,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),
              Text(
                l10n.pLiveAdvertisedWait,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.pLiveAdvertisedWaitBody,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 120,
                    child: TextField(
                      controller: _wait,
                      enabled: !_saving,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: l10n.pLiveMinutes),
                      // Rebuild so the Save button enables/disables as the
                      // value changes.
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: PrimaryButton(
                      label: l10n.actionSave,
                      isLoading: _saving,
                      onPressed: canSaveWait
                          ? () => _run(
                              () => repo.setAdvertisedWait(parsedWait),
                              l10n.pLiveSaved,
                            )
                          : null,
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: status.mutedForeground),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    label,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
