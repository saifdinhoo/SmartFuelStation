# Smart Automotive Service Platform

A PostgreSQL-backed automotive service platform with a Node/Express API, React web dashboard, and Flutter mobile client.

## Database

The local development database is already configured and migrated:

- PostgreSQL server: `localhost`
- Port: `5432`
- Database: `smart_automotive_db`
- Schema: `public`
- User: `postgres`
- ORM/migrations: Prisma

### View it in pgAdmin 4

1. Open pgAdmin 4 and connect to the local PostgreSQL server.
2. Expand **Servers > PostgreSQL 18 > Databases > smart_automotive_db > Schemas > public**.
3. Expand **Tables** to browse the relational tables and seeded records.
4. If pgAdmin was already open while migrations ran, right-click **Databases** or **Tables** and choose **Refresh**.

The PostgreSQL password is intentionally not documented in source control. It is the password already configured in `backend/.env` and used for the pgAdmin server connection.

### Database commands

Run these from `backend`:

```powershell
npm run db:validate
npm run db:migrate -- --name migration_name
npm run db:deploy
npm run seed
npm run seed:realistic
npm run db:studio
```

`npm run seed` creates the base demo records. `npm run seed:realistic` adds a larger realistic synthetic dataset; both commands are idempotent.

### Main tables

- `User` and `Provider`: accounts, roles, provider approval, location, and live status
- `ServiceCategory` and `ProviderService`: admin-managed categories and provider-specific services/pricing
- `Booking`: appointments with a price snapshot and lifecycle status
- `QueueEntry`: walk-ins and booked customers in each provider's live queue
- `Review`: one verified review per booking
- `Complaint`: customer moderation reports
- `Favorite`: a customer's saved businesses, shared and persisted across Web and Flutter
- `Vehicle`: a customer's own vehicles, kept for reference when booking
- `PasswordResetToken`: hashed, expiring password-reset records

Foreign keys, unique indexes, query indexes, enums, and PostgreSQL `CHECK` constraints protect relational integrity.

### Demo accounts

After `npm run seed`:

- Provider: `provider@smartauto.local` / `demo123`
- Customer: `layla@smartauto.local` / `demo123`
- Admin email: `admin@smartfuelstation.com`; an existing admin password is preserved

These credentials are for local development only.

## Backend

```powershell
cd backend
npm install
npm run db:deploy
npm run seed
npm run dev
```

Check both the API and database connection at `http://localhost:5000/health`.

Copy `backend/.env.example` to `backend/.env` and fill in real values before running. `DATABASE_URL` and `JWT_SECRET` are required; everything else is optional and the affected feature degrades honestly (never fakes success) when left unset:

- `GEMINI_API_KEY` — the AI Assistant. Without it, AI requests fail with a real error instead of a canned reply.
- `GOOGLE_TRANSLATE_API_KEY` — the translate-this-review/description feature.
- `LIVE_CAMERA_STREAM_URL` — the one demo gas station's live camera. Without it, every camera-enabled provider reports OFFLINE rather than a fabricated LIVE.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `WEB_APP_URL` — real password-reset email delivery (Gmail SMTP). Without `GMAIL_USER`/`GMAIL_APP_PASSWORD`, forgot-password still works end-to-end (the token is created and consumable), but no email actually goes out. To enable real delivery:
  1. Enable 2-Step Verification on the sending Google Account.
  2. Create a Google [App Password](https://myaccount.google.com/apppasswords).
  3. Set `GMAIL_USER` to that Gmail address.
  4. Set `GMAIL_APP_PASSWORD` to the App Password.
  5. Set `WEB_APP_URL` to the real web app origin (default `http://localhost:5173` is already correct for local development).
  6. Restart the backend.

## Web

```powershell
cd web
npm install
npm run dev
```

Runs on `http://localhost:5173` by default. Copy `web/.env.example` to `web/.env` first — `VITE_API_URL` should point at the backend's `/api` base (`http://localhost:5000/api` for local development).

Other scripts: `npm run build` (type-check + production build), `npm run lint`, `npm test` (Vitest).

## Mobile (Flutter)

```powershell
cd mobile
flutter pub get
flutter run
```

The backend host is resolved automatically per platform (`10.0.2.2` for the Android emulator, `localhost` for iOS simulator/desktop/web) — no configuration needed for local development. For a physical device, or a backend that isn't on `localhost:5000`, pass the real address explicitly:

```powershell
flutter run --dart-define=API_BASE_URL=http://<your-machine-ip>:5000/api
```

Other commands: `flutter analyze`, `flutter test`.