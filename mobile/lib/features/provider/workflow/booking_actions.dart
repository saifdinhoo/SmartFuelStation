import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';

/// Which endpoint an action goes through. Not interchangeable:
///
/// * [booking]     → PATCH /bookings/:id            (booking-only edge)
/// * [queueAdd]    → POST  /queue { bookingId }     (creates the entry AND
///                                                   moves booking to IN_QUEUE)
/// * [queueStatus] → PATCH /queue/:id               (moves the entry AND
///                                                   syncs the booking)
/// * [queueRemove] → DELETE /queue/:id              (drops the entry AND
///                                                   cancels the booking)
///
/// Everything from ARRIVED onward deliberately goes through the Queue
/// endpoints. The booking-side edges exist in the backend transition table,
/// but driving them directly would advance the Booking while leaving its
/// QueueEntry behind — the backend only keeps the two in step when the
/// *queue* side is mutated. This mirrors the web provider dashboard.
enum ProviderActionKind { booking, queueAdd, queueStatus, queueRemove }

class ProviderBookingAction {
  const ProviderBookingAction({
    required this.id,
    required this.kind,
    required this.label,
    this.targetStatus,
    this.isDestructive = false,
    this.confirmTitle,
    this.confirmBody,
  });

  final String id;
  final ProviderActionKind kind;
  final String label;

  /// The API status string for [ProviderActionKind.booking] and
  /// [ProviderActionKind.queueStatus].
  final String? targetStatus;

  final bool isDestructive;
  final String? confirmTitle;
  final String? confirmBody;

  bool get needsConfirmation => confirmTitle != null;

  /// True when the action addresses a queue entry, which means the screen
  /// must know the entry id before it can be fired.
  bool get needsQueueEntry =>
      kind == ProviderActionKind.queueStatus ||
      kind == ProviderActionKind.queueRemove;
}

/// The actions a provider may take on a booking in a given state.
///
/// Mirrors the backend state machine (shared/bookingTransitions.js plus
/// QUEUE_TRANSITIONS) for the PROVIDER role. The server re-validates every
/// one of these — this exists so the UI never offers a button the backend
/// would reject, not as the authority.
List<ProviderBookingAction> providerActionsFor(
  AppLocalizations l10n,
  BookingStatus status,
) {
  switch (status) {
    case BookingStatus.pending:
      return [
        ProviderBookingAction(
          id: 'confirm',
          kind: ProviderActionKind.booking,
          label: l10n.pBookingConfirm,
          targetStatus: 'CONFIRMED',
        ),
        ProviderBookingAction(
          id: 'reject',
          kind: ProviderActionKind.booking,
          label: l10n.pBookingReject,
          targetStatus: 'REJECTED',
          isDestructive: true,
          confirmTitle: l10n.pConfirmRejectTitle,
          confirmBody: l10n.pConfirmRejectBody,
        ),
      ];

    case BookingStatus.confirmed:
      return [
        ProviderBookingAction(
          id: 'arrive',
          kind: ProviderActionKind.booking,
          label: l10n.pBookingMarkArrived,
          targetStatus: 'ARRIVED',
        ),
        ProviderBookingAction(
          id: 'cancel',
          kind: ProviderActionKind.booking,
          label: l10n.pBookingCancelBooking,
          targetStatus: 'CANCELLED',
          isDestructive: true,
          confirmTitle: l10n.pConfirmCancelTitle,
          confirmBody: l10n.pConfirmCancelBody,
        ),
      ];

    case BookingStatus.arrived:
      return [
        ProviderBookingAction(
          id: 'queue',
          kind: ProviderActionKind.queueAdd,
          label: l10n.pBookingAddToQueue,
        ),
        ProviderBookingAction(
          id: 'cancel',
          kind: ProviderActionKind.booking,
          label: l10n.pBookingCancelBooking,
          targetStatus: 'CANCELLED',
          isDestructive: true,
          confirmTitle: l10n.pConfirmCancelTitle,
          confirmBody: l10n.pConfirmCancelBody,
        ),
      ];

    case BookingStatus.inQueue:
      return [
        ProviderBookingAction(
          id: 'start',
          kind: ProviderActionKind.queueStatus,
          label: l10n.pBookingStartService,
          targetStatus: 'IN_SERVICE',
        ),
        // Removal, not a booking cancel: dropping the entry is what keeps
        // the queue row and the booking consistent.
        ProviderBookingAction(
          id: 'remove',
          kind: ProviderActionKind.queueRemove,
          label: l10n.pBookingRemoveFromQueue,
          isDestructive: true,
          confirmTitle: l10n.pConfirmRemoveQueueTitle,
          confirmBody: l10n.pConfirmRemoveQueueBody,
        ),
      ];

    case BookingStatus.inService:
      return [
        ProviderBookingAction(
          id: 'complete',
          kind: ProviderActionKind.queueStatus,
          label: l10n.pBookingCompleteService,
          targetStatus: 'COMPLETED',
          confirmTitle: l10n.pConfirmCompleteTitle,
          confirmBody: l10n.pConfirmCompleteBody,
        ),
      ];

    // COMPLETED / CANCELLED / REJECTED are terminal.
    case BookingStatus.completed:
    case BookingStatus.cancelled:
    case BookingStatus.rejected:
      return const [];
  }
}

/// Bookings the provider still has to act on — what the Overview counts and
/// the "Needs action" filter shows.
bool bookingNeedsProviderAction(BookingStatus status) =>
    status == BookingStatus.pending ||
    status == BookingStatus.arrived ||
    status == BookingStatus.inQueue ||
    status == BookingStatus.inService;
