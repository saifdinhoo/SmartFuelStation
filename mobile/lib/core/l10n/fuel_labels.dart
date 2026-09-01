import '../models/models.dart';
import 'generated/app_localizations.dart';

/// Localized fuel-type name — shared by the customer fuel display, the
/// provider's own read-only view, and the admin fuel-management screen so
/// the three never drift out of sync. Mirrors day_labels.dart's pattern.
String fuelTypeLabel(AppLocalizations l10n, FuelTypeModel type) => switch (type) {
  FuelTypeModel.gasoline95 => l10n.fuelGasoline95,
  FuelTypeModel.gasoline98 => l10n.fuelGasoline98,
  FuelTypeModel.diesel => l10n.fuelDiesel,
};
