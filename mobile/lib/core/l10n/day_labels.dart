import '../models/models.dart';
import 'generated/app_localizations.dart';

/// Localized weekday name for a [DayOfWeekModel] — shared by the provider
/// hours editor and the customer-facing hours display so the two never
/// drift out of sync.
String dayLabel(AppLocalizations l10n, DayOfWeekModel day) => switch (day) {
  DayOfWeekModel.monday => l10n.dayMonday,
  DayOfWeekModel.tuesday => l10n.dayTuesday,
  DayOfWeekModel.wednesday => l10n.dayWednesday,
  DayOfWeekModel.thursday => l10n.dayThursday,
  DayOfWeekModel.friday => l10n.dayFriday,
  DayOfWeekModel.saturday => l10n.daySaturday,
  DayOfWeekModel.sunday => l10n.daySunday,
};
