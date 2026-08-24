/// Shared JSON coercion helpers.
///
/// Prisma serializes `Decimal` columns (price, latitude, longitude) as
/// JSON *strings*, while `Int` columns arrive as numbers. Every model needs
/// the same tolerant reading, so it lives here once instead of being
/// reinvented — and getting it subtly wrong — per model.
library;

double? asDoubleOrNull(Object? value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

double asDouble(Object? value, {double fallback = 0}) =>
    asDoubleOrNull(value) ?? fallback;

int? asIntOrNull(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

int asInt(Object? value, {int fallback = 0}) => asIntOrNull(value) ?? fallback;

bool asBool(Object? value, {bool fallback = false}) =>
    value is bool ? value : fallback;

String asString(Object? value, {String fallback = ''}) =>
    value is String ? value : (value?.toString() ?? fallback);

String? asStringOrNull(Object? value) => value is String ? value : null;

DateTime? asDateOrNull(Object? value) {
  if (value is String) return DateTime.tryParse(value)?.toLocal();
  return null;
}

DateTime asDate(Object? value) => asDateOrNull(value) ?? DateTime.now();

Map<String, dynamic>? asMapOrNull(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

List<Map<String, dynamic>> asMapList(Object? value) => value is List
    ? value.whereType<Map>().map(Map<String, dynamic>.from).toList()
    : const [];
