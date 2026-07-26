# Requirements — Week 1

## User roles

- **Customer** — books services from providers.
- **Service Provider** — registers a business and offers services under one or more categories.
- **Admin** — approves providers and manages service categories.

## Business rules

- A provider must be approved by an admin (`isApproved`) before they can be booked. New providers start unapproved.
- Service categories (e.g. "Oil Change", "Tire Repair") are managed by admins as data, not hardcoded, so they can be added or edited without a code change.
- A provider selects which categories they offer, optionally with their own price for each. A booking is made against one of these provider-category offerings, not against a category in general — this is what ties a booking to a specific provider and price.
- A booking has a status that moves through: `PENDING` → `CONFIRMED` → `COMPLETED`, or `CANCELLED` at any point before completion.

## Entities

| Entity | Purpose |
|---|---|
| `User` | Account + credentials + role (customer/provider/admin) |
| `Provider` | Business profile for a user with role = PROVIDER |
| `ServiceCategory` | Admin-managed list of service types |
| `ProviderService` | Join: which categories a provider offers, and at what price |
| `Booking` | A customer booking a specific provider's service |

See `backend/prisma/schema.prisma` for the full field-level database design.
