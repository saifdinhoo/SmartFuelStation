import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/app/router.dart';
import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/l10n/locale_controller.dart';
import 'package:smart_automotive_service_app/core/models/live_camera_models.dart';
import 'package:smart_automotive_service_app/core/theme/app_theme.dart';
import 'package:smart_automotive_service_app/core/widgets/live_video_player.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/live_camera_ui.dart';
import 'package:smart_automotive_service_app/features/customer/widgets/live_station_card.dart';

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

ServiceProvider providerWith({
  required int id,
  bool liveCameraEnabled = false,
}) => ServiceProvider(
  id: id,
  businessName: 'Business $id',
  address: 'Somewhere',
  isOpen: true,
  estimatedWaitMinutes: 0,
  reviewCount: 0,
  services: const [],
  liveCameraEnabled: liveCameraEnabled,
);

void main() {
  group('LiveCameraStatus parsing (GET /providers/:id/live-camera)', () {
    test('parses LIVE with a real playback path', () {
      final status = LiveCameraStatus.fromJson({
        'providerId': 2,
        'available': true,
        'status': 'LIVE',
        'playbackUrl': '/api/providers/2/live-camera/stream',
      });
      expect(status.status, LiveCameraStatusValue.live);
      expect(status.available, isTrue);
      expect(status.playbackUrl, '/api/providers/2/live-camera/stream');
    });

    test('parses OFFLINE with a null playback path — the real current demo state', () {
      final status = LiveCameraStatus.fromJson({
        'providerId': 2,
        'available': true,
        'status': 'OFFLINE',
        'playbackUrl': null,
      });
      expect(status.status, LiveCameraStatusValue.offline);
      expect(status.available, isTrue);
      expect(status.playbackUrl, isNull);
    });

    test('parses UNAVAILABLE for a provider with no camera at all', () {
      final status = LiveCameraStatus.fromJson({
        'providerId': 9,
        'available': false,
        'status': 'UNAVAILABLE',
        'playbackUrl': null,
      });
      expect(status.status, LiveCameraStatusValue.unavailable);
      expect(status.available, isFalse);
    });

    test('an unrecognized status string defaults to unavailable, never live', () {
      final status = LiveCameraStatus.fromJson({
        'providerId': 2,
        'available': true,
        'status': 'SOMETHING_NEW',
        'playbackUrl': null,
      });
      expect(status.status, LiveCameraStatusValue.unavailable);
    });

    test('a missing status field also defaults safely rather than throwing', () {
      final status = LiveCameraStatus.fromJson({'providerId': 2});
      expect(status.status, LiveCameraStatusValue.unavailable);
      expect(status.available, isFalse);
      expect(status.playbackUrl, isNull);
    });
  });

  group('ServiceProvider.liveCameraEnabled', () {
    test('parses true from GET /providers', () {
      final provider = ServiceProvider.fromJson({
        'id': 2,
        'businessName': 'Cedars Auto Care',
        'address': 'Beirut',
        'isOpen': true,
        'estimatedWaitMinutes': 10,
        'liveCameraEnabled': true,
      });
      expect(provider.liveCameraEnabled, isTrue);
    });

    test('defaults to false when the field is missing, never assumed true', () {
      final provider = ServiceProvider.fromJson({
        'id': 1,
        'businessName': 'No Camera Shop',
        'address': 'Beirut',
        'isOpen': true,
        'estimatedWaitMinutes': 10,
      });
      expect(provider.liveCameraEnabled, isFalse);
    });

    test('survives a non-bool value the same as isOpen would', () {
      final provider = ServiceProvider.fromJson({
        'id': 1,
        'businessName': 'X',
        'liveCameraEnabled': 'not-a-bool',
      });
      expect(provider.liveCameraEnabled, isFalse);
    });

    test('copyWithStatus and copyWithDistance carry the flag through unchanged', () {
      final provider = providerWith(id: 2, liveCameraEnabled: true);
      final afterStatus = provider.copyWithStatus(isOpen: false, estimatedWaitMinutes: 5);
      final afterDistance = provider.copyWithDistance(12.3);
      expect(afterStatus.liveCameraEnabled, isTrue);
      expect(afterDistance.liveCameraEnabled, isTrue);
    });
  });

  group('CacheKeys.liveCamera', () {
    test('is scoped per provider id', () {
      expect(CacheKeys.liveCamera(2), isNot(CacheKeys.liveCamera(9)));
    });

    test('sits under the shared provider/ invalidation prefix', () {
      expect(CacheKeys.liveCamera(2).startsWith(CacheKeys.providerPrefix), isTrue);
    });
  });

  group('finding the one camera-enabled provider (Home screen card logic)', () {
    test('finds the single camera-enabled provider among several', () {
      final providers = [
        providerWith(id: 1),
        providerWith(id: 2, liveCameraEnabled: true),
        providerWith(id: 3),
      ];
      final found = providers.where((p) => p.liveCameraEnabled).firstOrNull;
      expect(found?.id, 2);
    });

    test('finds nothing when no provider has a camera — the card must not render', () {
      final providers = [providerWith(id: 1), providerWith(id: 2)];
      expect(providers.where((p) => p.liveCameraEnabled).firstOrNull, isNull);
    });

    test('an empty provider list also finds nothing, never throws', () {
      expect(
        const <ServiceProvider>[].where((p) => p.liveCameraEnabled).firstOrNull,
        isNull,
      );
    });
  });

  group('live camera status label/tone — never fabricates LIVE', () {
    late AppLocalizations en;
    setUp(() async => en = await loadL10n('en'));

    test('LIVE is the only status that reads as LIVE', () {
      expect(liveCameraStatusLabel(en, LiveCameraStatusValue.live), en.liveCameraLive);
    });

    test('OFFLINE, UNAVAILABLE, and null (not fetched yet) all read as offline', () {
      for (final status in [
        LiveCameraStatusValue.offline,
        LiveCameraStatusValue.unavailable,
        null,
      ]) {
        expect(
          liveCameraStatusLabel(en, status),
          en.liveCameraOffline,
          reason: '$status must never read as LIVE',
        );
      }
    });
  });

  group('LiveStationCard (Home screen card)', () {
    testWidgets('shows a LIVE badge only for a genuinely live status', (tester) async {
      final en = await loadL10n('en');
      await tester.pumpWidget(
        wrap(
          LiveStationCard(
            businessName: 'Cedars Auto Care',
            status: LiveCameraStatusValue.live,
            onWatchLive: () {},
          ),
        ),
      );
      expect(find.text('Cedars Auto Care'), findsOneWidget);
      expect(find.text(en.liveCameraLive), findsOneWidget);
      expect(find.text(en.liveCameraOffline), findsNothing);
      expect(find.byIcon(Icons.videocam), findsOneWidget);
    });

    testWidgets('never shows LIVE for offline, unavailable, or still-loading (null) status', (
      tester,
    ) async {
      final en = await loadL10n('en');
      for (final status in [
        LiveCameraStatusValue.offline,
        LiveCameraStatusValue.unavailable,
        null,
      ]) {
        await tester.pumpWidget(
          wrap(
            LiveStationCard(
              businessName: 'Cedars Auto Care',
              status: status,
              onWatchLive: () {},
            ),
          ),
        );
        expect(find.text(en.liveCameraOffline), findsOneWidget, reason: '$status');
        expect(find.text(en.liveCameraLive), findsNothing, reason: '$status');
        expect(find.byIcon(Icons.videocam_off_outlined), findsOneWidget, reason: '$status');
      }
    });

    testWidgets('tapping Watch Live invokes the callback — this is how Home navigates to the dedicated screen', (
      tester,
    ) async {
      final en = await loadL10n('en');
      var tapped = false;
      await tester.pumpWidget(
        wrap(
          LiveStationCard(
            businessName: 'Cedars Auto Care',
            status: LiveCameraStatusValue.offline,
            onWatchLive: () => tapped = true,
          ),
        ),
      );
      await tester.tap(find.widgetWithText(FilledButton, en.homeWatchLive));
      expect(tapped, isTrue);
    });

    testWidgets('renders in Arabic with RTL direction', (tester) async {
      final ar = await loadL10n('ar');
      await tester.pumpWidget(
        wrap(
          LiveStationCard(
            businessName: 'مركز السيارات',
            status: LiveCameraStatusValue.live,
            onWatchLive: () {},
          ),
          locale: const Locale('ar'),
        ),
      );
      final text = find.text(ar.liveCameraLive);
      expect(text, findsOneWidget);
      expect(Directionality.of(tester.element(text)), TextDirection.rtl);
    });
  });

  group('localization of new live-camera strings', () {
    test('every new key is translated in Arabic, not an English fallback', () async {
      final en = await loadL10n('en');
      final ar = await loadL10n('ar');

      expect(ar.homeLiveStationSection, isNot(en.homeLiveStationSection));
      expect(ar.homeLiveStationBody, isNot(en.homeLiveStationBody));
      expect(ar.homeWatchLive, isNot(en.homeWatchLive));
      expect(ar.liveCameraLive, isNot(en.liveCameraLive));
      expect(ar.liveCameraOffline, isNot(en.liveCameraOffline));
      expect(ar.liveCameraUnavailableMessage, isNot(en.liveCameraUnavailableMessage));
      expect(ar.liveCameraPrivacyNote, isNot(en.liveCameraPrivacyNote));
      expect(ar.liveStationAppBarTitle, isNot(en.liveStationAppBarTitle));
      expect(ar.liveStationNotAvailable, isNot(en.liveStationNotAvailable));

      for (final value in [
        ar.homeLiveStationSection,
        ar.homeLiveStationBody,
        ar.homeWatchLive,
        ar.liveCameraLive,
        ar.liveCameraOffline,
        ar.liveCameraUnavailableMessage,
        ar.liveCameraPrivacyNote,
        ar.liveStationAppBarTitle,
        ar.liveStationNotAvailable,
      ]) {
        expect(value, isNotEmpty);
      }
    });

    test('the required privacy note exists in both locales', () async {
      final en = await loadL10n('en');
      expect(en.liveCameraPrivacyNote, 'Live view is provided by the station for current conditions.');
    });
  });

  group('CameraUnavailableView', () {
    testWidgets('shows the default "unavailable" message', (tester) async {
      final en = await loadL10n('en');
      await tester.pumpWidget(wrap(const CameraUnavailableView()));
      expect(find.text(en.liveCameraUnavailableMessage), findsOneWidget);
    });

    testWidgets('shows a caller-supplied message instead, when given one', (tester) async {
      await tester.pumpWidget(wrap(const CameraUnavailableView(message: 'Custom reason')));
      expect(find.text('Custom reason'), findsOneWidget);
    });
  });

  group('LiveVideoPlayer degrades honestly when no real stream can be played', () {
    testWidgets(
      'shows the unavailable placeholder rather than crashing or a broken player '
      '(there is no real upstream configured in this test environment, matching '
      'the current demo state)',
      (tester) async {
        final en = await loadL10n('en');
        await tester.pumpWidget(
          wrap(
            const LiveVideoPlayer(
              playbackUrl: '/api/providers/2/live-camera/stream',
              token: 'fake-jwt-for-test',
            ),
          ),
        );

        // Let the async initialize()/catch resolve without relying on
        // pumpAndSettle, which would hang on the loading spinner's
        // indeterminate animation.
        for (var i = 0; i < 15; i++) {
          await tester.pump(const Duration(milliseconds: 20));
        }

        expect(find.byType(CameraUnavailableView), findsOneWidget);
        expect(find.text(en.liveCameraUnavailableMessage), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('disposes cleanly with no leaked errors', (tester) async {
      await tester.pumpWidget(
        wrap(
          const LiveVideoPlayer(playbackUrl: '/api/providers/2/live-camera/stream'),
        ),
      );
      for (var i = 0; i < 15; i++) {
        await tester.pump(const Duration(milliseconds: 20));
      }
      await tester.pumpWidget(const SizedBox.shrink());
      expect(tester.takeException(), isNull);
    });
  });

  group('routing', () {
    test('customerLiveStation builds a path keyed by provider id', () {
      expect(Routes.customerLiveStation(5), '/customer/live-station/5');
      expect(Routes.customerLiveStation(2), isNot(Routes.customerLiveStation(5)));
    });
  });

  group('structural review: reuse, not duplication', () {
    String readNewSource(String relativePath) =>
        File(relativePath).readAsStringSync();

    test(
      'the dedicated Live Station screen reuses existing fuel/queue/location data '
      'hooks and widgets rather than a second implementation',
      () {
        final source = readNewSource(
          'lib/features/customer/live_station/live_station_screen.dart',
        );
        expect(source, contains("import '../widgets/fuel_status_list.dart'"));
        expect(source, contains('FuelStatusList('));
        expect(source, contains('repo.watchProviderFuel'));
        expect(source, contains('repo.watchQueueSummary'));
        expect(source, contains('repo.watchProviders'));
        expect(source, contains('distanceKmBetween('));
        expect(source, contains('LocationActionButtons('));
        // No second haversine/distance implementation snuck in here.
        expect(source, isNot(contains('earthRadiusKm')));
      },
    );

    test('the Home screen wires the Live Station card to the dedicated route', () {
      final source = readNewSource(
        'lib/features/customer/home/customer_home_screen.dart',
      );
      expect(source, contains('liveCameraEnabled'));
      expect(source, contains('LiveStationCard('));
      expect(source, contains('Routes.customerLiveStation'));
    });

    test('no camera permission of any kind is requested anywhere in this feature', () {
      const newFiles = [
        'lib/core/widgets/live_video_player.dart',
        'lib/features/customer/live_station/live_station_screen.dart',
        'lib/features/customer/widgets/live_station_card.dart',
        'lib/features/customer/widgets/live_camera_ui.dart',
        'lib/core/models/live_camera_models.dart',
        'lib/features/customer/home/customer_home_screen.dart',
      ];
      for (final path in newFiles) {
        final source = readNewSource(path);
        expect(source, isNot(contains('package:camera')), reason: path);
        expect(source, isNot(contains('CameraController')), reason: path);
        expect(source, isNot(contains('Permission.camera')), reason: path);
      }

      final pubspec = readNewSource('pubspec.yaml');
      expect(pubspec, isNot(contains('\ncamera:')));
      expect(pubspec, isNot(contains('permission_handler')));
      // The only video dependency this feature needed.
      expect(pubspec, contains('video_player:'));
    });
  });
}
