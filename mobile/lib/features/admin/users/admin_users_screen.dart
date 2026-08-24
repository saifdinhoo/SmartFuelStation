import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Platform user list.
///
/// Search and the role filter are sent to the backend rather than applied
/// to a downloaded list, so results stay correct as the table grows. The
/// screen is read-only: there is no account status column in the schema and
/// a provider account is structurally tied to its business row, so neither
/// deactivation nor a role change has an endpoint — that is stated on the
/// screen rather than shown as a disabled switch.
class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  static const _roles = ['ALL', 'CUSTOMER', 'PROVIDER', 'ADMIN'];

  final _search = TextEditingController();
  String _role = 'ALL';
  String _query = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  /// Typing hits the server, so the query is debounced rather than fired
  /// per keystroke.
  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    String roleFilterLabel(String role) => switch (role) {
      'CUSTOMER' => l10n.roleCustomer,
      'PROVIDER' => l10n.roleProvider,
      'ADMIN' => l10n.roleAdmin,
      _ => l10n.aUsersAllRoles,
    };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aUsersTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshUsers(role: _role, search: _query),
        child: AsyncView<List<AdminUserRow>>(
          value: repo.watchUsers(role: _role, search: _query),
          errorTitle: l10n.aUsersTitle,
          onRetry: () => repo.refreshUsers(role: _role, search: _query),
          builder: (context, users) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _search,
                        onChanged: _onSearchChanged,
                        decoration: InputDecoration(
                          hintText: l10n.aUsersSearchHint,
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _search.text.isEmpty
                              ? null
                              : IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _search.clear();
                                    _onSearchChanged('');
                                  },
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      AdminFilterBar<String>(
                        options: _roles,
                        selected: _role,
                        labelOf: roleFilterLabel,
                        onSelected: (r) => setState(() => _role = r),
                      ),
                    ],
                  ),
                ),
              ),
              if (users.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyView(title: l10n.aUsersNoResults),
                )
              else
                SliverList.builder(
                  itemCount: users.length,
                  itemBuilder: (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: _UserCard(user: users[i]),
                  ),
                ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  child: AdminGapNote(
                    icon: Icons.lock_outline,
                    text: l10n.aUsersReadOnly,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({required this.user});

  final AdminUserRow user;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: () => context.push(Routes.adminUserDetails(user.id)),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
          child: Text(
            user.name.isEmpty ? '?' : user.name.characters.first.toUpperCase(),
            style: TextStyle(color: theme.colorScheme.primary),
          ),
        ),
        title: Text(user.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user.email,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${user.bookingCount} ${l10n.aUsersBookings} · '
              '${user.reviewCount} ${l10n.aUsersReviews}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
          ],
        ),
        isThreeLine: true,
        trailing: StatusChip(
          label: roleLabel(l10n, user.role),
          tone: switch (user.role) {
            UserRoleModel.admin => StatusTone.danger,
            UserRoleModel.provider => StatusTone.primary,
            _ => StatusTone.neutral,
          },
        ),
      ),
    );
  }
}
