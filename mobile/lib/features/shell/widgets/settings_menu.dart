import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/theme/theme_controller.dart';

/// Theme and language switches, available from the app bar on every screen
/// including login — the equivalent of the web's ThemeToggle and
/// LanguageToggle sitting in the header.
class SettingsMenu extends StatelessWidget {
  const SettingsMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final themeController = context.watch<ThemeController>();
    final localeController = context.watch<LocaleController>();
    final isDark = themeController.isDark(context);

    return Row(
      children: [
        IconButton(
          tooltip: l10n.settingsTheme,
          icon: Icon(
            isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
          ),
          onPressed: () => themeController.toggle(context),
        ),
        IconButton(
          tooltip: l10n.settingsLanguage,
          // Shows the language you would switch *to*, which is the
          // convention the web toggle uses.
          icon: Text(
            localeController.isArabic ? 'EN' : 'ع',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          onPressed: localeController.toggle,
        ),
      ],
    );
  }
}
