import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/admin_repository.dart';

/// Downloads a real JSON snapshot of the platform's application data (see
/// backup.service.js) and hands it to the device's native share sheet —
/// the mobile equivalent of the web app's browser download, since a Flutter
/// app has no "save to Downloads" primitive of its own without a share/save
/// dialog.
class AdminBackupCard extends StatefulWidget {
  const AdminBackupCard({super.key});

  @override
  State<AdminBackupCard> createState() => _AdminBackupCardState();
}

class _AdminBackupCardState extends State<AdminBackupCard> {
  bool _exporting = false;

  Future<void> _export() async {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    final messenger = ScaffoldMessenger.of(context);

    setState(() => _exporting = true);
    try {
      final json = await repo.exportBackupJson();
      final now = DateTime.now();
      final stamp =
          '${now.year}-${_two(now.month)}-${_two(now.day)}-${_two(now.hour)}${_two(now.minute)}';
      final filename = 'smart-automotive-backup-$stamp.json';

      final file = File('${Directory.systemTemp.path}/$filename');
      await file.writeAsString(json);

      await SharePlus.instance.share(
        ShareParams(files: [XFile(file.path, mimeType: 'application/json')]),
      );
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(l10n.aMoreBackupSaved)));
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  static String _two(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.backup_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.aMoreBackupTitle,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              l10n.aMoreBackupDescription,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: PrimaryButton(
                label: l10n.actionDownloadBackup,
                isLoading: _exporting,
                onPressed: _export,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
