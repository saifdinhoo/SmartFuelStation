# Smart Automotive Service Platform — Mobile

Flutter app for the Customer, Provider, and Admin roles, talking to the same backend/database as the web dashboard. See the [root README](../README.md) for the full-project setup.

## Setup

```powershell
flutter pub get
flutter run
```

The backend host is resolved automatically per platform (`10.0.2.2` for the Android emulator, `localhost` for iOS simulator/desktop/web) — no configuration needed for local development against a backend running on `localhost:5000`.

For a physical device, or a backend on a different host, pass the real address explicitly:

```powershell
flutter run --dart-define=API_BASE_URL=http://<your-machine-ip>:5000/api
```

## Commands

- `flutter analyze` — static analysis
- `flutter test` — the full test suite
- `flutter gen-l10n` — regenerate `core/l10n/generated/` after editing `core/l10n/app_en.arb` / `app_ar.arb`

## Structure

- `lib/app/` — `MaterialApp`/`GoRouter` setup, top-level providers, route table.
- `lib/core/` — cross-role infrastructure: API client, models, l10n, theming, shared widgets, the query-cache layer.
- `lib/features/<role>/<area>/` — one folder per feature area (e.g. `features/customer/vehicles`), mirroring the web app's structure.
- `test/` — one test file per feature area, mostly repository-level (real `ApiClient` + a capturing Dio adapter) plus targeted widget tests.
