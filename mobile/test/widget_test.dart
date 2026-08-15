import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/storage/prefs_store.dart';
import 'package:smart_automotive_service_app/core/theme/app_colors.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/theme/theme_controller.dart';
import 'package:smart_automotive_service_app/core/widgets/empty_view.dart';
import 'package:smart_automotive_service_app/core/widgets/error_view.dart';
import 'package:smart_automotive_service_app/core/widgets/primary_button.dart';
import 'package:smart_automotive_service_app/core/widgets/status_chip.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';

/// Wraps a widget in the same localization/theme setup the real app uses,
/// so these tests exercise the actual configuration rather than a stand-in.
Widget harness({
  required Widget child,
  Locale locale = const Locale('en'),
  ThemeMode themeMode = ThemeMode.light,
}) {
  return MaterialApp(
    locale: locale,
    theme: AppTheme.light,
    darkTheme: AppTheme.dark,
    themeMode: themeMode,
    supportedLocales: LocaleController.supported,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: child),
  );
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('UserRole', () {
    test('maps the API role strings the backend actually sends', () {
      expect(UserRole.fromApi('CUSTOMER'), UserRole.customer);
      expect(UserRole.fromApi('PROVIDER'), UserRole.provider);
      expect(UserRole.fromApi('ADMIN'), UserRole.admin);
    });

    test('returns null for anything unrecognized rather than guessing', () {
      expect(UserRole.fromApi(null), isNull);
      expect(UserRole.fromApi('SUPERUSER'), isNull);
      expect(UserRole.fromApi('customer'), isNull);
    });

    test('round-trips back to the API value', () {
      for (final role in UserRole.values) {
        expect(UserRole.fromApi(role.apiValue), role);
      }
    });
  });

  group('theme matches the web design tokens', () {
    test('light primary is the web --primary, not the old template purple', () {
      expect(AppTheme.light.colorScheme.primary, AppColors.lightPrimary);
      expect(AppColors.lightPrimary, const Color(0xFF0061A7));
      expect(AppTheme.light.colorScheme.primary, isNot(Colors.deepPurple));
    });

    test('dark theme uses the dark token set', () {
      expect(AppTheme.dark.colorScheme.primary, AppColors.darkPrimary);
      expect(AppTheme.dark.scaffoldBackgroundColor, AppColors.darkBackground);
      expect(AppTheme.dark.brightness, Brightness.dark);
    });

    test('status colours are exposed to widgets via the theme extension', () {
      expect(AppTheme.light.extension<AppStatusColors>(), isNotNull);
      expect(AppTheme.dark.extension<AppStatusColors>(), isNotNull);
      expect(
        AppTheme.light.extension<AppStatusColors>()!.success,
        AppColors.lightSuccess,
      );
    });
  });

  group('localization and direction', () {
    testWidgets('English renders left-to-right', (tester) async {
      await tester.pumpWidget(harness(child: const Text('x')));
      expect(
        Directionality.of(tester.element(find.text('x'))),
        TextDirection.ltr,
      );
    });

    testWidgets('Arabic flips the whole app right-to-left', (tester) async {
      await tester.pumpWidget(
        harness(child: const Text('x'), locale: const Locale('ar')),
      );
      expect(
        Directionality.of(tester.element(find.text('x'))),
        TextDirection.rtl,
      );
    });

    testWidgets('Arabic strings are used, not English fallbacks', (
      tester,
    ) async {
      await tester.pumpWidget(
        harness(child: const ErrorView(), locale: const Locale('ar')),
      );
      expect(find.text('حدث خطأ ما'), findsOneWidget);
    });

    testWidgets('English strings are used for the same widget', (tester) async {
      await tester.pumpWidget(harness(child: const ErrorView()));
      expect(find.text('Something went wrong'), findsOneWidget);
    });

    test('LocaleController reports the direction for each language', () async {
      final controller = LocaleController(const PrefsStore());
      expect(controller.direction, TextDirection.ltr);
      await controller.setLocale(const Locale('ar'));
      expect(controller.isArabic, isTrue);
      expect(controller.direction, TextDirection.rtl);
    });

    test('language choice is persisted to preferences', () async {
      await LocaleController(const PrefsStore()).setLocale(const Locale('ar'));
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('language'), 'ar');
    });
  });

  group('ThemeController', () {
    test('defaults to following the system', () {
      expect(ThemeController(const PrefsStore()).mode, ThemeMode.system);
    });

    test('persists an explicit choice', () async {
      final controller = ThemeController(const PrefsStore());
      await controller.setMode(ThemeMode.dark);
      expect(controller.mode, ThemeMode.dark);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('theme_mode'), 'dark');
    });
  });

  group('shared widgets', () {
    testWidgets('PrimaryButton shows a spinner and blocks taps while loading', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        harness(
          child: PrimaryButton(
            label: 'Save',
            isLoading: true,
            onPressed: () => taps++,
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Save'), findsNothing);
      await tester.tap(find.byType(PrimaryButton));
      expect(taps, 0, reason: 'a loading button must not be re-submittable');
    });

    testWidgets('PrimaryButton is tappable when idle', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        harness(
          child: PrimaryButton(label: 'Save', onPressed: () => taps++),
        ),
      );
      await tester.tap(find.byType(PrimaryButton));
      expect(taps, 1);
    });

    testWidgets('ErrorView only offers retry when it can retry', (
      tester,
    ) async {
      await tester.pumpWidget(harness(child: const ErrorView()));
      expect(find.text('Retry'), findsNothing);

      await tester.pumpWidget(harness(child: ErrorView(onRetry: () {})));
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('EmptyView renders its title and action', (tester) async {
      await tester.pumpWidget(
        harness(
          child: EmptyView(
            title: 'No categories yet.',
            actionLabel: 'Add',
            onAction: () {},
          ),
        ),
      );
      expect(find.text('No categories yet.'), findsOneWidget);
      expect(find.text('Add'), findsOneWidget);
    });

    testWidgets('StatusChip renders each tone without throwing', (
      tester,
    ) async {
      for (final tone in StatusTone.values) {
        await tester.pumpWidget(
          harness(
            child: StatusChip(label: tone.name, tone: tone),
          ),
        );
        expect(find.text(tone.name), findsOneWidget);
      }
    });

    testWidgets('StatusChip resolves colours in dark mode too', (tester) async {
      await tester.pumpWidget(
        harness(
          child: const StatusChip(label: 'Approved', tone: StatusTone.success),
          themeMode: ThemeMode.dark,
        ),
      );
      expect(find.text('Approved'), findsOneWidget);
    });
  });
}
