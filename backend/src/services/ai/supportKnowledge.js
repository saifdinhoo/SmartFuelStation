// Controlled knowledge about how THIS platform actually works, injected into
// Gemini's system instruction for SUPPORT-mode replies. Every claim here is
// backed by real, current backend code (see the comment above each block for
// what to re-check if the underlying behavior ever changes) — none of it is
// Gemini's own assumption about how a generic "automotive service platform"
// might work.
//
// Keep this file the single source of truth for platform facts the
// assistant may state. If a rule changes in the real backend, update it
// here — do not let ai.service.js or GeminiAiProvider grow their own copy.

// See backend/src/routes/auth.routes.js and services/auth.service.js.
const AUTH = `
A person registers via POST /auth/register as either CUSTOMER or PROVIDER — ADMIN accounts are never self-registered, only created directly. Registering as PROVIDER also requires a business name and address, and creates a linked business profile.
A new PROVIDER account starts unapproved and is invisible to customers until an admin approves it (see PROVIDER and ADMIN).
Login returns a token used for the rest of the session. There is no email verification step, and "forgot password" is not connected to a real email/reset flow yet (see LIMITATIONS).
`.trim();

// Every user has exactly one of these, set at registration and never changed.
const ROLES = `
There are exactly three roles: CUSTOMER, PROVIDER, ADMIN. A user has exactly one role for the lifetime of the account — there is no way to switch roles or hold more than one at once.
CUSTOMER: discovers providers, books services, tracks their own bookings and queue position, and leaves reviews on completed bookings.
PROVIDER: manages their own business profile, services, open/closed status, incoming bookings, and their own walk-in queue.
ADMIN: approves or revokes providers, manages the service category catalog, and can view (but not create) users, bookings, reviews, and complaints platform-wide.
`.trim();

// See features/customer/discovery and features/customer/bookings on web/mobile.
const CUSTOMER = `
Discovery: a customer browses only approved, currently-listed providers and their bookable services, optionally narrowed by service category.
Booking: pick one of a provider's services and a future time slot; the platform refuses a slot that overlaps another active booking for that same provider (see BOOKINGS for what happens after).
Tracking: a customer's own Bookings page/screen shows only their own bookings and current status; their Queue view shows only their own place in line (see QUEUE).
Reviews: once a booking reaches COMPLETED, that customer may leave one rating and comment for it (see REVIEWS).
`.trim();

// See services/booking.service.js and services/shared/bookingTransitions.js.
const BOOKINGS = `
Booking status order: PENDING -> CONFIRMED -> ARRIVED -> IN_QUEUE -> IN_SERVICE -> COMPLETED. CANCELLED and REJECTED are terminal exits.
- PENDING -> CONFIRMED or PENDING -> REJECTED: only the PROVIDER or an ADMIN can do this — a customer cannot confirm or reject their own booking.
- CONFIRMED -> ARRIVED: only PROVIDER/ADMIN, marked when the customer physically arrives.
- ARRIVED -> IN_QUEUE: only PROVIDER/ADMIN, when the booking is added to the walk-in queue.
- IN_QUEUE -> IN_SERVICE -> COMPLETED: only PROVIDER/ADMIN.
- Cancelling: a CUSTOMER may cancel their own booking only while it is still PENDING or CONFIRMED. Once a booking reaches ARRIVED, only the PROVIDER or an ADMIN can cancel it — the customer can no longer self-cancel at that point.
- COMPLETED, CANCELLED, and REJECTED are all terminal — none of them can be changed again, cancelled again, or reopened.
- A still-PENDING booking can also be withdrawn (deleted) entirely by its own customer, or by an admin for any booking regardless of status.
`.trim();

// See services/queue.service.js.
const QUEUE = `
A queue entry is created one of two ways: (a) an ARRIVED booking is added to the line by the provider/admin, or (b) the provider/admin adds a walk-in directly with just a name, with no customer account required.
Queue entry status: WAITING -> IN_SERVICE -> COMPLETED, or WAITING/IN_SERVICE -> CANCELLED. Only PROVIDER/ADMIN can start, complete, cancel, remove, or reorder a queue entry — a customer never mutates the queue directly, they only watch their own position update live.
Position and estimated wait are computed server-side from everyone currently ahead in that provider's line; a customer only ever sees their own entry, never anyone else's.
Not every booking status can be in the queue — only a booking that is ARRIVED can be added, and it then moves to IN_QUEUE.
`.trim();

// See services/review.service.js.
const REVIEWS = `
Only a CUSTOMER can write a review, only for their own booking, and only once that booking's status is COMPLETED. A booking can be reviewed exactly once — a second review for the same booking is rejected. The customer who wrote a review, or an admin, can delete it.
Providers and admins cannot write reviews. A provider can see their own business's reviews and average rating; an admin can see every review platform-wide.
`.trim();

// See services/provider.service.js, providerProfile.service.js, providerAnalytics.service.js.
const PROVIDER = `
A provider manages their own profile (business name, address, description, coordinates), toggles open/closed, and sets an estimated wait — those are what a customer sees on that provider's card while browsing.
Services are managed under the provider's own account only: create, edit, or remove a bookable service (name, price, duration, category, available/unavailable).
A provider's account must be approved by an admin before it appears to customers or accepts bookings at all. If approval is later revoked, the business is also forced closed and immediately drops out of customer-facing listings (see AUTH, ADMIN).
A provider has their own analytics — booking counts, completion/cancellation rates, average wait, popular services, rating distribution — computed from their own real history. There is no revenue figure and no AI-generated insight, because the platform does not track revenue.
`.trim();

// See services/admin.service.js, provider.service.js's setProviderApproval, category.service.js.
const ADMIN = `
An admin approves or revokes a provider's approval — one action, both directions. There is no separate "reject": an unapproved provider and one whose approval was revoked look identical (not approved).
An admin manages the service category catalog: categories can be created and edited (name/description). A category already used by a provider service cannot be deleted, but there is currently no endpoint to deactivate/reactivate one either — only to create or edit its name and description.
An admin can view every user, booking, and review platform-wide, and can view complaints and update a complaint's status — but there is no endpoint anywhere for anyone to file a new complaint (see LIMITATIONS).
Admin analytics aggregate real booking/review/provider/user counts over a time range — again, no revenue and nothing AI-derived.
`.trim();

// See services/notification.service.js and the controllers that call it.
const NOTIFICATIONS = `
The platform has persistent, real-time in-app notifications for all three roles: a new booking (to the provider), a booking confirmed/rejected/cancelled (to whichever side did not act), joining a queue and reaching the front of it (to that customer), a service starting/completing (to the customer), a new review (to the provider), and a new provider registration or approval/rejection decision (to admins, or to that provider).
Notifications are stored in the database, so they survive a page refresh or app restart, and are pushed live over the same realtime connection the booking/queue features already use. On reconnect, the app re-fetches from the server rather than trusting only what arrived while it was offline. A user can mark one notification, or all of them, as read.
These are in-app notifications only — see LIMITATIONS for what this does not include.
`.trim();

// See services/providerHours.service.js, services/availability.service.js.
const HOURS_AVAILABILITY = `
A provider sets their own weekly operating hours: an open and close time for each day, or marked closed for that day entirely. When a customer books, the platform only offers — and only accepts — a time slot that falls inside that provider's actual operating hours for that day; a slot outside them, or on a day the provider is closed, is rejected.
`.trim();

// See services/fuelInventory.service.js.
const FUEL = `
Only providers who sell fuel have a fuel inventory. An admin — never the provider themselves — sets and updates each fuel type's tank capacity, current liters remaining, and price per liter; every change is recorded in a history log (previous amount, new amount, which admin made it, when). A customer sees the current remaining percentage per fuel type and a recent trend chart on that provider's page, never the raw admin-only change history.
`.trim();

// See services/finance.service.js.
const FINANCE = `
When a booking reaches COMPLETED, the platform records a financial transaction for it: the booking's price, the platform's commission cut, and the provider's net earning, using a commission rate an admin controls (a platform default, or a rate set specifically for that provider). A provider can see their own earnings and transaction history (read-only). An admin sees this platform-wide, can change a specific provider's commission rate, and can mark accumulated earnings as settled/paid out. There is no earning recorded for a booking before it reaches COMPLETED, and the platform does not track revenue anywhere outside this per-booking transaction record.
`.trim();

// See features/customer/discovery on web/mobile — provider coordinates + the customer's own device location.
const LOCATION = `
A provider's distance from the customer is shown when the customer allows their device's location access, along with "View Location" and "Get Directions" actions that open the provider's address in an external maps app. This distance is calculated on the customer's own device from coordinates the provider set — the server does not currently offer a "find providers within X km" search; it is the customer's device doing the math after every approved provider's basic data is already loaded.
`.trim();

// See services/liveCamera.service.js — deliberately ONE demonstration
// provider only (a graduation-project proof of concept), not a
// platform-wide feature yet.
const LIVE_CAMERA = `
Exactly one demonstration provider can have a live camera view. When that provider's feed is actually connected, a customer sees a real, view-only video of that station — no recording, no audio, and no computer-vision or AI analysis of the video at all (no vehicle counting, no automatic congestion score); the customer simply watches and judges crowding themselves, right alongside that provider's real fuel/queue/location info. Right now this may show as offline rather than live if the real camera source has not been connected on the server yet — that is not a bug, it is the platform correctly refusing to fake a live feed. No other provider has this feature today.
`.trim();

const LIMITATIONS = `
Be direct and specific about what is not implemented — never guess or imply a feature exists when it does not:
- No OS-level push notifications: nothing is delivered to a phone's lock screen or notification tray while the app is fully closed. Notifications only appear inside the app itself. There is no Firebase Cloud Messaging or Apple Push Notification integration.
- No SMS, and no real email delivery of any kind. A "forgot password" screen exists in the web app but is not wired to a real backend endpoint or an email service — password reset does not currently work end to end.
- No vehicle-management feature — there is no vehicle record in the system at all; a "Vehicles" section may appear as a placeholder in the customer app but nothing backs it yet.
- No real favorites/saved-providers feature — a customer cannot save a provider for later lookup today; any "Favorites" entry point either does not exist yet or is not connected to real saved data.
- No complaint-creation flow — a complaint can only be viewed and have its status changed by an admin; there is no customer-, provider-, or admin-facing way to file a new one today.
- No AI-driven provider recommendations and no AI-generated analytics or insights anywhere on the platform — including the live camera feature (see LIVE_CAMERA), which has zero computer-vision/AI analysis by design.
- This assistant cannot book, cancel, confirm, or change anything on the user's behalf — it can only explain how the platform works. It also has no access to the user's specific bookings, queue position, or account details in this chat, only the general rules above.
`.trim();

module.exports = {
  AUTH,
  ROLES,
  CUSTOMER,
  PROVIDER,
  ADMIN,
  BOOKINGS,
  QUEUE,
  REVIEWS,
  NOTIFICATIONS,
  HOURS_AVAILABILITY,
  FUEL,
  FINANCE,
  LOCATION,
  LIVE_CAMERA,
  LIMITATIONS,
};
