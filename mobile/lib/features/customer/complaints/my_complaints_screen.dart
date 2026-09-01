import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../../admin/widgets/admin_widgets.dart'
    show complaintSeverityLabel, complaintSeverityTone, complaintStatusLabel, complaintStatusTone;
import '../data/customer_repository.dart';

/// The customer's own filed complaints — GET /complaints/me — plus the
/// entry point to file a new one. Reuses the same [Complaint] model and
/// severity/status label helpers admin's triage screen already has; there
/// is deliberately no reply/resolve UI here, that stays admin-only.
class MyComplaintsScreen extends StatelessWidget {
  const MyComplaintsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.myComplaintsTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showFileComplaintSheet(context, repo),
        icon: const Icon(Icons.add),
        label: Text(l10n.complaintFile),
      ),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshMyComplaints(),
        child: AsyncView<List<Complaint>>(
          value: repo.watchMyComplaints(),
          errorTitle: l10n.myComplaintsTitle,
          onRetry: () => repo.refreshMyComplaints(),
          builder: (context, complaints) {
            if (complaints.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.report_gmailerrorred_outlined,
                      title: l10n.myComplaintsEmpty,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: complaints.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) => _ComplaintCard(complaint: complaints[index]),
            );
          },
        ),
      ),
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard({required this.complaint});

  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
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
                      Text(complaint.subject, style: theme.textTheme.titleSmall),
                      Text(
                        complaint.providerName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    StatusChip(
                      label: complaintStatusLabel(l10n, complaint.status),
                      tone: complaintStatusTone(complaint.status),
                    ),
                    const SizedBox(height: 4),
                    StatusChip(
                      label: complaintSeverityLabel(l10n, complaint.severity),
                      tone: complaintSeverityTone(complaint.severity),
                    ),
                  ],
                ),
              ],
            ),
            if (complaint.details != null && complaint.details!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(complaint.details!, style: theme.textTheme.bodyMedium),
            ],
          ],
        ),
      ),
    );
  }
}

Future<void> _showFileComplaintSheet(BuildContext context, CustomerRepository repo) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _FileComplaintSheet(repo: repo),
  );
}

class _FileComplaintSheet extends StatefulWidget {
  const _FileComplaintSheet({required this.repo});

  final CustomerRepository repo;

  @override
  State<_FileComplaintSheet> createState() => _FileComplaintSheetState();
}

class _FileComplaintSheetState extends State<_FileComplaintSheet> {
  final _subject = TextEditingController();
  final _details = TextEditingController();
  int? _providerId;
  ComplaintSeverity _severity = ComplaintSeverity.medium;
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _subject.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    if (_providerId == null) {
      setState(() => _error = l10n.complaintErrorProvider);
      return;
    }
    if (_subject.text.trim().isEmpty) {
      setState(() => _error = l10n.complaintErrorSubject);
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });

    try {
      await widget.repo.submitComplaint(
        providerId: _providerId!,
        subject: _subject.text,
        details: _details.text,
        severity: _severity,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.complaintSubmitted)));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final providers = context.watch<CustomerRepository>().watchProviders().valueOrNull ?? const [];
    context.watchQueries();

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.complaintFileTitle, style: theme.textTheme.titleLarge),
            const SizedBox(height: 16),

            DropdownButtonFormField<int>(
              initialValue: _providerId,
              decoration: InputDecoration(labelText: l10n.complaintBusiness),
              items: providers
                  .map(
                    (p) => DropdownMenuItem(value: p.id, child: Text(p.businessName)),
                  )
                  .toList(),
              onChanged: _submitting
                  ? null
                  : (value) => setState(() {
                      _providerId = value;
                      _error = null;
                    }),
            ),
            const SizedBox(height: 12),
            AppTextField(
              label: l10n.complaintSubject,
              controller: _subject,
              enabled: !_submitting,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<ComplaintSeverity>(
              initialValue: _severity,
              decoration: InputDecoration(labelText: l10n.complaintSeverity),
              items: ComplaintSeverity.values
                  .map(
                    (s) => DropdownMenuItem(
                      value: s,
                      child: Text(complaintSeverityLabel(l10n, s)),
                    ),
                  )
                  .toList(),
              onChanged: _submitting
                  ? null
                  : (value) => setState(() => _severity = value ?? ComplaintSeverity.medium),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _details,
              enabled: !_submitting,
              maxLines: 4,
              maxLength: 2000,
              decoration: InputDecoration(labelText: l10n.complaintDetails),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],

            const SizedBox(height: 8),
            PrimaryButton(
              label: l10n.complaintSubmit,
              isLoading: _submitting,
              onPressed: _submit,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _submitting ? null : () => Navigator.of(context).pop(),
              child: Text(l10n.actionCancel),
            ),
          ],
        ),
      ),
    );
  }
}
