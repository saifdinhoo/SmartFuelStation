import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/widgets/location_action_buttons.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

Widget wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  locale: locale,
  theme: AppTheme.light,
  supportedLocales: LocaleController.supported,
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  home: Scaffold(body: child),
);

void main() {
  group('LocationActionButtons', () {
    testWidgets('both actions are enabled with valid coordinates', (tester) async {
      await tester.pumpWidget(
        wrap(
          const LocationActionButtons(latitude: 33.8938, longitude: 35.5018),
        ),
      );
      final view = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'View location'),
      );
      final directions = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Get directions'),
      );
      expect(view.onPressed, isNotNull);
      expect(directions.onPressed, isNotNull);
    });

    testWidgets('both actions are disabled with no coordinates and no address', (tester) async {
      await tester.pumpWidget(
        wrap(const LocationActionButtons(latitude: null, longitude: null)),
      );
      final view = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'View location'),
      );
      final directions = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Get directions'),
      );
      expect(view.onPressed, isNull);
      expect(directions.onPressed, isNull);
    });

    testWidgets('View location stays enabled via an address fallback; directions does not', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrap(
          const LocationActionButtons(
            latitude: null,
            longitude: null,
            address: 'Hamra Street, Beirut',
          ),
        ),
      );
      final view = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'View location'),
      );
      final directions = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Get directions'),
      );
      expect(view.onPressed, isNotNull);
      expect(directions.onPressed, isNull);
    });

    testWidgets('rejects out-of-range coordinates the same as missing ones', (tester) async {
      await tester.pumpWidget(
        wrap(const LocationActionButtons(latitude: 999, longitude: 35.5018)),
      );
      final view = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'View location'),
      );
      expect(view.onPressed, isNull);
    });

    testWidgets('showDirections:false renders only View location', (tester) async {
      await tester.pumpWidget(
        wrap(
          const LocationActionButtons(
            latitude: 33.8938,
            longitude: 35.5018,
            showDirections: false,
          ),
        ),
      );
      expect(find.widgetWithText(OutlinedButton, 'View location'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Get directions'), findsNothing);
    });

    testWidgets('tapping an enabled action never throws, with or without a real Maps app', (
      tester,
    ) async {
      // Whatever url_launcher actually does in this sandbox (no real Maps
      // app is installed under `flutter test`), the widget must not crash —
      // see the try/catch around openMapUri in LocationActionButtons._open.
      await tester.pumpWidget(
        wrap(
          const LocationActionButtons(latitude: 33.8938, longitude: 35.5018),
        ),
      );
      await tester.tap(find.widgetWithText(OutlinedButton, 'View location'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('renders in Arabic with RTL direction', (tester) async {
      final ar = await loadL10n('ar');
      await tester.pumpWidget(
        wrap(
          const LocationActionButtons(latitude: 33.8938, longitude: 35.5018),
          locale: const Locale('ar'),
        ),
      );
      final text = find.text(ar.locationViewLocation);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });
}
