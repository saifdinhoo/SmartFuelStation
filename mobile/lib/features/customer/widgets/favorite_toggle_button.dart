import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';

/// Real, shared, persisted state — GET /favorites/me is the single source
/// of truth every instance of this button reads from, so favoriting a
/// provider on the discovery list and viewing it on Provider Details (or
/// the Favorites screen) always agree, and the same state survives a
/// refresh and shows up on another device after refetch.
class FavoriteToggleButton extends StatefulWidget {
  const FavoriteToggleButton({
    super.key,
    required this.providerId,
    this.compact = false,
  });

  final int providerId;

  /// Compact renders a bare icon button (for list cards); the default
  /// renders a labelled outlined button (for the details screen).
  final bool compact;

  @override
  State<FavoriteToggleButton> createState() => _FavoriteToggleButtonState();
}

class _FavoriteToggleButtonState extends State<FavoriteToggleButton> {
  bool _busy = false;

  Future<void> _toggle(bool isFavorite) async {
    setState(() => _busy = true);
    try {
      if (isFavorite) {
        await context.read<CustomerRepository>().removeFavorite(widget.providerId);
      } else {
        await context.read<CustomerRepository>().addFavorite(widget.providerId);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.watch<CustomerRepository>();
    context.watchQueries();
    final favorites = repo.watchMyFavorites().valueOrNull ?? const <Favorite>[];
    final isFavorite = favorites.any((f) => f.providerId == widget.providerId);
    final label = isFavorite ? l10n.providerUnfavorite : l10n.providerFavorite;

    if (widget.compact) {
      return IconButton(
        tooltip: label,
        onPressed: _busy ? null : () => _toggle(isFavorite),
        icon: Icon(
          isFavorite ? Icons.favorite : Icons.favorite_border,
          color: isFavorite ? theme.colorScheme.error : null,
        ),
      );
    }

    return OutlinedButton.icon(
      onPressed: _busy ? null : () => _toggle(isFavorite),
      icon: Icon(
        isFavorite ? Icons.favorite : Icons.favorite_border,
        size: 18,
        color: isFavorite ? theme.colorScheme.error : null,
      ),
      label: Text(label),
    );
  }
}
