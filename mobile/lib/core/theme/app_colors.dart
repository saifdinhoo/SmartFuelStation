import 'package:flutter/material.dart';

/// The web app's design tokens, converted to sRGB.
///
/// Source of truth is `web/src/styles/tokens.css`, which defines these in
/// OKLCH. Each value here is the exact sRGB conversion of its counterpart,
/// so the two clients render the same brand rather than two approximations
/// of it. The old `Colors.deepPurple` seed was Flutter template boilerplate
/// and matched nothing in the product.
///
/// If a token changes in tokens.css, convert and update it here too.
class AppColors {
  const AppColors._();

  // --- light: :root in tokens.css ---
  static const lightBackground = Color(0xFFF9FAFB); // oklch(98.5% 0.001 247)
  static const lightForeground = Color(0xFF0F171F); // oklch(20% 0.02 250)
  static const lightCard = Color(0xFFFFFFFF);
  static const lightMuted = Color(0xFFEDEFF0);
  static const lightMutedForeground = Color(0xFF525960);
  static const lightBorder = Color(0xFFDBDEE2);
  static const lightPrimary = Color(0xFF0061A7); // oklch(48% 0.14 246)
  static const lightPrimaryForeground = Color(0xFFF6F9FC);
  static const lightSecondary = Color(0xFFE8EBEF);
  static const lightSecondaryForeground = Color(0xFF1A222B);
  static const lightDestructive = Color(0xFFD40924);
  static const lightDestructiveForeground = Color(0xFFF8F8F8);
  static const lightSuccess = Color(0xFF1C8742);
  static const lightSuccessForeground = Color(0xFFF8F8F8);
  static const lightWarning = Color(0xFFD59800);
  static const lightWarningForeground = Color(0xFF1D1406);

  // --- dark: .dark in tokens.css ---
  static const darkBackground = Color(0xFF0A0E11); // oklch(16% 0.01 250)
  static const darkForeground = Color(0xFFECEFF2);
  static const darkCard = Color(0xFF12171B);
  static const darkMuted = Color(0xFF1B2025);
  static const darkMutedForeground = Color(0xFF8A9096);
  static const darkBorder = Color(0xFF292E34);
  static const darkPrimary = Color(0xFF5AA5E4); // oklch(70% 0.12 246)
  static const darkPrimaryForeground = Color(0xFF050C13);
  static const darkSecondary = Color(0xFF25292F);
  static const darkSecondaryForeground = Color(0xFFE2E5E8);
  static const darkDestructive = Color(0xFFF75D59);
  static const darkDestructiveForeground = Color(0xFF0B0B0B);
  static const darkSuccess = Color(0xFF4EB068);
  static const darkSuccessForeground = Color(0xFF0B0B0B);
  static const darkWarning = Color(0xFFE6AC3D);
  static const darkWarningForeground = Color(0xFF181003);
}

/// Status colours have no slot in Material's [ColorScheme], so they ride
/// along as a theme extension. Widgets read them via
/// `Theme.of(context).extension<AppStatusColors>()!`.
@immutable
class AppStatusColors extends ThemeExtension<AppStatusColors> {
  const AppStatusColors({
    required this.success,
    required this.onSuccess,
    required this.warning,
    required this.onWarning,
    required this.muted,
    required this.mutedForeground,
  });

  final Color success;
  final Color onSuccess;
  final Color warning;
  final Color onWarning;
  final Color muted;
  final Color mutedForeground;

  static const light = AppStatusColors(
    success: AppColors.lightSuccess,
    onSuccess: AppColors.lightSuccessForeground,
    warning: AppColors.lightWarning,
    onWarning: AppColors.lightWarningForeground,
    muted: AppColors.lightMuted,
    mutedForeground: AppColors.lightMutedForeground,
  );

  static const dark = AppStatusColors(
    success: AppColors.darkSuccess,
    onSuccess: AppColors.darkSuccessForeground,
    warning: AppColors.darkWarning,
    onWarning: AppColors.darkWarningForeground,
    muted: AppColors.darkMuted,
    mutedForeground: AppColors.darkMutedForeground,
  );

  @override
  AppStatusColors copyWith({
    Color? success,
    Color? onSuccess,
    Color? warning,
    Color? onWarning,
    Color? muted,
    Color? mutedForeground,
  }) => AppStatusColors(
    success: success ?? this.success,
    onSuccess: onSuccess ?? this.onSuccess,
    warning: warning ?? this.warning,
    onWarning: onWarning ?? this.onWarning,
    muted: muted ?? this.muted,
    mutedForeground: mutedForeground ?? this.mutedForeground,
  );

  @override
  AppStatusColors lerp(ThemeExtension<AppStatusColors>? other, double t) {
    if (other is! AppStatusColors) return this;
    return AppStatusColors(
      success: Color.lerp(success, other.success, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      onWarning: Color.lerp(onWarning, other.onWarning, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
    );
  }
}
