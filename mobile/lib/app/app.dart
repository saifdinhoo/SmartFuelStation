import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/l10n/generated/app_localizations.dart';
import '../core/l10n/locale_controller.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/theme_controller.dart';
import '../features/auth/state/auth_state.dart';
import 'router.dart';

class SmartAutomotiveApp extends StatefulWidget {
  const SmartAutomotiveApp({super.key});

  @override
  State<SmartAutomotiveApp> createState() => _SmartAutomotiveAppState();
}

class _SmartAutomotiveAppState extends State<SmartAutomotiveApp> {
  GoRouter? _router;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final theme = context.watch<ThemeController>();
    final locale = context.watch<LocaleController>();

    // Built once and reused. Recreating the router on every rebuild would
    // reset navigation state on each theme or locale change.
    _router ??= createRouter(auth);

    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
      debugShowCheckedModeBanner: false,

      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: theme.mode,

      // Setting the locale is all RTL needs: MaterialApp derives text
      // direction from it, so choosing Arabic mirrors the entire layout —
      // navigation, padding, icons — without per-widget handling.
      locale: locale.locale,
      supportedLocales: LocaleController.supported,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      routerConfig: _router,
    );
  }
}
