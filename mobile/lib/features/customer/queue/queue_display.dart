import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';

/// What a customer should be told, given their queue entry (or absence of
/// one) and the booking's status.
///
/// Mirrors the web's `deriveQueueDisplay` so both clients say the same
/// thing in the same situation. Returns null when queueing simply isn't
/// relevant yet — before arrival there is nothing meaningful to show.
class QueueDisplay {
  const QueueDisplay({
    required this.headline,
    required this.tone,
    this.detail,
    this.nextAction,
  });

  final String headline;
  final QueueTone tone;
  final String? detail;
  final String? nextAction;
}

enum QueueTone { waiting, active, done, neutral }

QueueDisplay? deriveQueueDisplay(
  AppLocalizations l10n,
  QueueEntry? entry,
  BookingStatus bookingStatus,
) {
  if (entry == null) {
    // Arrived but not yet added to the line: worth explaining, because the
    // customer is standing there waiting for something to happen.
    if (bookingStatus == BookingStatus.arrived) {
      return QueueDisplay(
        headline: l10n.queueWaitingToJoin,
        detail: l10n.queueWaitingToJoinBody,
        tone: QueueTone.neutral,
      );
    }
    return null;
  }

  switch (entry.status) {
    case QueueStatus.waiting:
      final ahead = entry.customersAhead ?? 0;
      final wait = entry.estimatedWaitMinutes ?? 0;
      return QueueDisplay(
        headline: ahead == 0
            ? l10n.queueYoureNext
            : l10n.queuePosition(entry.position ?? ahead + 1),
        detail: '${l10n.queueAhead(ahead)} · ${l10n.queueEstimatedWait(wait)}',
        nextAction: l10n.queueStayNearby,
        tone: QueueTone.waiting,
      );
    case QueueStatus.inService:
      return QueueDisplay(
        headline: l10n.queueBeingServed,
        detail: l10n.queueServedBody,
        tone: QueueTone.active,
      );
    case QueueStatus.completed:
      return QueueDisplay(headline: l10n.queueDone, tone: QueueTone.done);
    case QueueStatus.cancelled:
      return QueueDisplay(headline: l10n.queueRemoved, tone: QueueTone.neutral);
  }
}
