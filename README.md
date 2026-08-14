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