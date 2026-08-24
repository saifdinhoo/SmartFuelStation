import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Complaint triage.
///
/// Status and severity are filtered server-side by GET /admin/complaints,
/// which also orders open items first. Triage goes through
/// PATCH /admin/complaints/:id — the only complaint mutation the backend
/// exposes; there is no assignee, note or reply field in the schema, so
/// none is offered here.
class AdminComplaintsScreen extends StatefulWidget {
  const AdminComplaintsScreen({super.key});

  @override
  State<AdminComplaintsScreen> createState() => _AdminComplaintsScreenState();
}

class _AdminComplaintsScreenState extends State<AdminComplaintsScreen> {
  String _status = 'ALL';
  String _severity = 'ALL';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    final statuses = ['ALL', ...ComplaintStatus.values.map((s) => s.api)];
    final severities = ['ALL', ...ComplaintSeverity.values.map((s) => s.api)];

    String statusLabel(String value) => value == 'ALL'
        ? l10n.aComplaintsAllStatuses
        : complaintStatusLabel(l10n, ComplaintStatus.fromApi(value));

    String severityLabel(String value) => value == 'ALL'
        ? l10n.aComplaintsAllSeverities
        : complaintSeverityLabel(l10n, ComplaintSeverity.fromApi(value));

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () =>
            repo.refreshComplaints(status: _status, severity: _severity),
        child: AsyncView<List<Complaint>>(
          value: repo.watchComplaints(status: _status, severity: _severity),
          errorTitle: l10n.aNavComplaints,
          onRetry: () =>
              repo.refreshComplaints(status: _status, severity: _severity),
          builder: (context, complaints) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AdminFilterBar<String>(
                        options: statuses,
                        selected: _status,
                        labelOf: statusLabel,
                        onSelected: (v) => setState(() => _status = v),
                      ),
                      const SizedBox(height: 8),
                      AdminFilterBar<String>(
                        options: severities,
                        selected: _severity,
                        labelOf: severityLabel,
                        onSelected: (v) => setState(() => _severity = v),
                      ),
                    ],
                  ),
                ),
              ),
              if (complaints.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyView(title: l10n.aComplaintsNoResults),
                )
              else
                SliverList.builder(
                  itemCount: complaints.length,
                  itemBuilder: (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      0,
                      16,
                      i == complaints.length - 1 ? 28 : 10,
                    ),
                    child: _ComplaintCard(complaint: complaints[i]),
                  ),
                ),
            ],
          ),
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
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => showComplaintSheet(context, complaint),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      complaint.subject,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  StatusChip(
                    label: complaintSeverityLabel(l10n, complaint.severity),
                    tone: complaintSeverityTone(complaint.severity),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${l10n.aComplaintAbout}: ${complaint.providerName}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
              if (complaint.submittedByName != null)
                Text(
                  '${l10n.aComplaintSubmittedBy}: ${complaint.submittedByName}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  StatusChip(
                    label: complaintStatusLabel(l10n, complaint.status),
                    tone: complaintStatusTone(complaint.status),
                  ),
                  const Spacer(),
                  Text(
                    adminDate(complaint.createdAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Details plus triage, in a bottom sheet — the mobile equivalent of the
/// web's row-expanding detail panel.
Future<void> showComplaintSheet(BuildContext context, Complaint complaint) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _ComplaintSheet(complaint: complaint),
    );

class _ComplaintSheet extends StatefulWidget {
  const _ComplaintSheet({required this.complaint});

  final Complaint complaint;

  @override
  State<_ComplaintSheet> createState() => _ComplaintSheetState();
}

class _ComplaintSheetState extends State<_ComplaintSheet> {
  late ComplaintStatus _status = widget.complaint.status;
  bool _saving = false;

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final repo = context.read<AdminRepository>();

    setState(() => _saving = true);
    try {
      await repo.setComplaintStatus(widget.complaint.id, _status);
      messenger.showSnackBar(SnackBar(content: Text(l10n.pActionDone)));
      navigator.pop();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final complaint = widget.complaint;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(complaint.subject, style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                StatusChip(
                  label: complaintStatusLabel(l10n, complaint.status),
                  tone: complaintStatusTone(complaint.status),
                ),
                StatusChip(
                  label: complaintSeverityLabel(l10n, complaint.severity),
                  tone: complaintSeverityTone(complaint.severity),
                ),
              ],
            ),

            const SizedBox(height: 16),
            Text(
              complaint.details?.trim().isNotEmpty == true
                  ? complaint.details!
                  : l10n.aComplaintNoDetails,
              style: theme.textTheme.bodyMedium,
            ),

            const SizedBox(height: 16),
            AdminInfoRow(
              label: l10n.aComplaintAbout,
              value: complaint.providerName,
            ),
            AdminInfoRow(
              label: l10n.aComplaintSubmittedBy,
              value: complaint.submittedByName ?? '—',
            ),
            if (complaint.submittedByEmail != null)
              AdminInfoRow(
                label: l10n.fieldEmail,
                value: complaint.submittedByEmail!,
              ),
            AdminInfoRow(
              label: l10n.aComplaintFiled,
              value: adminDate(complaint.createdAt),
            ),
            // Only meaningful once the complaint is closed; the backend
            // clears it again if the complaint is reopened.
            if (complaint.resolvedAt != null)
              AdminInfoRow(
                label: l10n.aComplaintClosedAt,
                value: adminDate(complaint.resolvedAt!),
              ),

            const SizedBox(height: 20),
            Text(
              l10n.aComplaintUpdateStatus,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final s in ComplaintStatus.values)
                  ChoiceChip(
                    label: Text(complaintStatusLabel(l10n, s)),
                    selected: _status == s,
                    onSelected: _saving
                        ? null
                        : (_) => setState(() => _status = s),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            AdminGapNote(
              icon: Icons.info_outline,
              text: l10n.aComplaintReopenNote,
            ),

            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving || _status == complaint.status
                    ? null
                    : _save,
                child: Text(l10n.actionSave),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
