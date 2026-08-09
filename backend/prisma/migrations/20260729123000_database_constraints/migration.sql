-- Database-level protections for values that Prisma cannot express as CHECK constraints.
ALTER TABLE "Provider"
  ADD CONSTRAINT "Provider_latitude_check" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "Provider_longitude_check" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "Provider_wait_check" CHECK ("estimatedWaitMinutes" >= 0);

ALTER TABLE "ProviderService"
  ADD CONSTRAINT "ProviderService_price_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "ProviderService_duration_check" CHECK ("durationMinutes" > 0);

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_price_check" CHECK ("priceAtBooking" >= 0),
  ADD CONSTRAINT "Booking_terminal_dates_check" CHECK (NOT ("completedAt" IS NOT NULL AND "cancelledAt" IS NOT NULL));

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "QueueEntry"
  ADD CONSTRAINT "QueueEntry_position_check" CHECK ("position" > 0);

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_expiry_check" CHECK ("expiresAt" > "createdAt");