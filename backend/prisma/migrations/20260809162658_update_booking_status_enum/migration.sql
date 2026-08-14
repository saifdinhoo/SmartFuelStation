-- Migrate existing NO_SHOW rows to CANCELLED before changing the enum —
-- NO_SHOW is being removed, and Postgres won't let an enum value be
-- dropped while rows still reference it. CANCELLED is the closest
-- semantic match for "the booking did not result in a completed visit."
UPDATE "Booking" SET "status" = 'CANCELLED' WHERE "status" = 'NO_SHOW';

-- Postgres has no direct "DROP VALUE" for enums, so swap the column onto
-- a newly-created enum type with the target value set, then replace the
-- old type. This is the standard pattern Prisma itself generates for
-- enum-value-removal migrations.
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'REJECTED');

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "BookingStatus";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
