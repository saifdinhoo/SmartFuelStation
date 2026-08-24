import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../data/provider_repository.dart';
import 'service_form_sheet.dart';

class ProviderServicesScreen extends StatefulWidget {
  const ProviderServicesScreen({super.key});

  @override
  State<ProviderServicesScreen> createState() => _ProviderServicesScreenState();
}

class _ProviderServicesScreenState extends State<ProviderServicesScreen> {
  bool _busy = false;

  Future<void> _toggleAvailability(ProviderService service) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ProviderRepository>().updateService(service.id, {
        'isAvailable': !service.isAvailable,
      });
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(ProviderService service) async {
    final l10n = AppLocalizations.of(context)!;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.pServiceDeleteTitle),
        content: Text(l10n.pServiceDeleteBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.actionDelete),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ProviderRepository>().deleteService(service.id);
      messenger.showSnackBar(SnackBar(content: Text(l10n.pServiceDeleted)));
    } on ApiException catch (e) {
      // The backend refuses a service with booking or queue history and
      // says why — that message is the actual answer, so show it verbatim.
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final categories =
        repo.watchCategories().valueOrNull ?? const <ServiceCategory>[];

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showServiceFormSheet(context, categories: categories),
        icon: const Icon(Icons.add),
        label: Text(l10n.pServicesAdd),
      ),
      body: RefreshIndicator(
        onRefresh: repo.refreshProfile,
        child: AsyncView<OwnProviderProfile>(
          value: repo.watchProfile(),
          errorTitle: l10n.pNavServices,
          onRetry: repo.refreshProfile,
          builder: (context, profile) {
            final services = profile.services;

            if (services.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.build_outlined,
                      title: l10n.pServicesNone,
                      message: l10n.pServicesNoneBody,
                      actionLabel: l10n.pServicesAdd,
                      onAction: () =>
                          showServiceFormSheet(context, categories: categories),
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: services.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final service = services[index];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 6, 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    service.name,
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${service.categoryName} · '
                                    '${l10n.serviceDuration(service.durationMinutes)} · '
                                    '\$${service.price.toStringAsFixed(2)}',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: status.mutedForeground,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: service.isAvailable,
                              onChanged: _busy
                                  ? null
                                  : (_) => _toggleAvailability(service),
                            ),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () => showServiceFormSheet(
                                      context,
                                      categories: categories,
                                      existing: service,
                                    ),
                              icon: const Icon(Icons.edit_outlined, size: 16),
                              label: Text(l10n.actionEdit),
                            ),
                            TextButton.icon(
                              onPressed: _busy ? null : () => _delete(service),
                              style: TextButton.styleFrom(
                                foregroundColor: theme.colorScheme.error,
                              ),
                              icon: const Icon(Icons.delete_outline, size: 16),
                              label: Text(l10n.actionDelete),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
