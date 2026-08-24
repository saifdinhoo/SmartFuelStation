import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/customer_repository.dart';
import '../widgets/rating_stars.dart';

/// Review form for a completed booking.
///
/// The backend enforces the real rules — the booking must be COMPLETED, owned
/// by the caller, and not already reviewed (unique index on bookingId). This
/// only pre-validates the rating so an obviously invalid submit is caught
/// without a round trip.
Future<void> showWriteReviewSheet(BuildContext context, Booking booking) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _WriteReviewSheet(booking: booking),
  );
}

class _WriteReviewSheet extends StatefulWidget {
  const _WriteReviewSheet({required this.booking});

  final Booking booking;

  @override
  State<_WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<_WriteReviewSheet> {
  final _comment = TextEditingController();
  int _rating = 0;
  String? _ratingError;
  String? _submitError;
  bool _submitting = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    if (_rating < 1 || _rating > 5) {
      setState(() => _ratingError = l10n.reviewErrorRating);
      return;
    }

    setState(() {
      _ratingError = null;
      _submitError = null;
      _submitting = true;
    });

    try {
      await context.read<CustomerRepository>().submitReview(
        bookingId: widget.booking.id,
        rating: _rating,
        comment: _comment.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.reviewSubmitted)));
    } on ApiException catch (e) {
      if (!mounted) return;
      // 409 "already reviewed" and 400 "only completed bookings" both come
      // back with a server message worth showing as-is.
      setState(() => _submitError = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

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
            Text(l10n.reviewWriteTitle, style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              '${widget.booking.providerName} · ${widget.booking.serviceName}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            const SizedBox(height: 20),

            Text(l10n.reviewYourRating, style: theme.textTheme.titleSmall),
            const SizedBox(height: 4),
            Center(
              child: RatingInput(
                value: _rating,
                onChanged: (value) => setState(() {
                  _rating = value;
                  _ratingError = null;
                }),
              ),
            ),
            if (_ratingError != null)
              Text(
                _ratingError!,
                textAlign: TextAlign.center,
                style: TextStyle(color: theme.colorScheme.error),
              ),

            const SizedBox(height: 16),
            TextField(
              controller: _comment,
              enabled: !_submitting,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                labelText: l10n.reviewComment,
                hintText: l10n.reviewCommentHint,
              ),
            ),

            if (_submitError != null) ...[
              const SizedBox(height: 8),
              Text(
                _submitError!,
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ],

            const SizedBox(height: 12),
            PrimaryButton(
              label: l10n.reviewSubmit,
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
