import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/state/async_value.dart';
import '../../../core/state/query_cache.dart';

/// Cache keys in one place so a mutation and a read can never disagree
/// about the string that links them.
class CacheKeys {
  const CacheKeys._();

  static const providers = 'providers';
  static const categories = 'categories';
  static const bookings = 'bookings';
  static const myQueue = 'queue/mine';

  static String providerReviews(int id) => 'provider/$id/reviews';
  static String providerRating(int id) => 'provider/$id/rating';
  static String queueSummary(int id) => 'provider/$id/queue-summary';
  static String booking(int id) => 'booking/$id';
  static String providerHours(int providerId) => 'provider/$providerId/hours';
  static String availability(int providerId, int serviceId, String date) =>
      'availability/$providerId/$serviceId/$date';

  /// Everything scoped to a single provider, for bulk invalidation.
  static const providerPrefix = 'provider/';

  /// Every cached availability query for one provider, regardless of which
  /// service/date combination was requested.
  static String availabilityPrefix(int providerId) => 'availability/$providerId/';
}

/// Customer-facing reads and mutations.
///
/// Reads go through [QueryCache] so several screens showing the same data
/// share one request and one loading/error state. Mutations call the API
/// directly and then invalidate whatever they could have changed — the
/// server's response is always the source of truth, never a local guess.
class CustomerRepository {
  CustomerRepository(this._api, this._cache);

  final ApiClient _api;
  final QueryCache _cache;

  // --- discovery -----------------------------------------------------------

  /// GET /providers returns only approved providers for a customer (the
  /// backend filters server-side), with services and a review count nested.
  /// There is no single-provider endpoint, so details reads reuse this list.
  Future<List<ServiceProvider>> _loadProviders() async {
    final raw = await _api.get('/providers') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map(
          (json) => ServiceProvider.fromJson(Map<String, dynamic>.from(json)),
        )
        .toList();
  }

  AsyncValue<List<ServiceProvider>> watchProviders() =>
      _cache.watch(CacheKeys.providers, _loadProviders);

  Future<List<ServiceProvider>> refreshProviders() =>
      _cache.refresh(CacheKeys.providers, _loadProviders);

  Future<List<ServiceCategory>> _loadCategories() async {
    final raw = await _api.get('/categories') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map(
          (json) => ServiceCategory.fromJson(Map<String, dynamic>.from(json)),
        )
        .toList();
  }

  AsyncValue<List<ServiceCategory>> watchCategories() =>
      _cache.watch(CacheKeys.categories, _loadCategories);

  // --- provider details ----------------------------------------------------

  AsyncValue<RatingSummary> watchRating(int providerId) =>
      _cache.watch(CacheKeys.providerRating(providerId), () async {
        final json =
            await _api.get('/providers/$providerId/rating-summary') as Map;
        return RatingSummary.fromJson(Map<String, dynamic>.from(json));
      });

  AsyncValue<List<Review>> watchProviderReviews(int providerId) =>
      _cache.watch(CacheKeys.providerReviews(providerId), () async {
        final raw =
            await _api.get('/providers/$providerId/reviews') as List<dynamic>;
        return raw
            .whereType<Map>()
            .map((json) => Review.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      });

  /// Aggregate only — queue length and a wait estimate. Contains no
  /// entry-level detail, which is why any authenticated role may read it.
  AsyncValue<QueueSummary> watchQueueSummary(int providerId) =>
      _cache.watch(CacheKeys.queueSummary(providerId), () async {
        final json = await _api.get('/queue/summary/$providerId') as Map;
        return QueueSummary.fromJson(Map<String, dynamic>.from(json));
      });

  // --- operating hours & availability ---------------------------------------

  /// Read-only weekly schedule, shown on Provider Details. Kept separate
  /// from `isOpen`/`isOpen`'s live status — this is what the provider has
  /// scheduled, not whether they are open at this exact instant.
  AsyncValue<List<OperatingHour>> watchProviderHours(int providerId) =>
      _cache.watch(CacheKeys.providerHours(providerId), () async {
        final raw = await _api.get('/providers/$providerId/hours') as List<dynamic>;
        return raw
            .whereType<Map>()
            .map((json) => OperatingHour.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      });

  /// Backend-authoritative slot list for one service on one local calendar
  /// date. [date] must already be "YYYY-MM-DD" in the device's local
  /// timezone — never derived via `toIso8601String()` on a DateTime, which
  /// reports UTC and can land on the wrong day near midnight.
  AsyncValue<Availability> watchAvailability({
    required int providerId,
    required int serviceId,
    required String date,
  }) => _cache.watch(CacheKeys.availability(providerId, serviceId, date), () async {
    final json = await _api.get(
      '/providers/$providerId/availability',
      query: {'serviceId': serviceId, 'date': date},
    ) as Map;
    return Availability.fromJson(Map<String, dynamic>.from(json));
  });

  /// Forces a fresh read — used after a 409 conflict on booking creation, so
  /// the slot that was just taken by someone else disappears immediately
  /// rather than waiting for the 30-second staleness window.
  Future<Availability> refreshAvailability({
    required int providerId,
    required int serviceId,
    required String date,
  }) => _cache.refresh(CacheKeys.availability(providerId, serviceId, date), () async {
    final json = await _api.get(
      '/providers/$providerId/availability',
      query: {'serviceId': serviceId, 'date': date},
    ) as Map;
    return Availability.fromJson(Map<String, dynamic>.from(json));
  });

  // --- bookings ------------------------------------------------------------

  /// GET /bookings is scoped server-side to the caller: a customer receives
  /// only their own bookings, never anyone else's.
  Future<List<Booking>> _loadBookings() async {
    final raw = await _api.get('/bookings') as List<dynamic>;
    final bookings = raw
        .whereType<Map>()
        .map((json) => Booking.fromJson(Map<String, dynamic>.from(json)))
        .toList();
    bookings.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
    return bookings;
  }

  AsyncValue<List<Booking>> watchBookings() =>
      _cache.watch(CacheKeys.bookings, _loadBookings);

  Future<List<Booking>> refreshBookings() =>
      _cache.refresh(CacheKeys.bookings, _loadBookings);

  AsyncValue<Booking> watchBooking(int id) =>
      _cache.watch(CacheKeys.booking(id), () async {
        final json = await _api.get('/bookings/$id') as Map;
        return Booking.fromJson(Map<String, dynamic>.from(json));
      });

  Future<Booking> createBooking({
    required int providerServiceId,
    required DateTime scheduledAt,
    String? notes,
  }) async {
    final json =
        await _api.post(
              '/bookings',
              body: {
                'providerServiceId': providerServiceId,
                'scheduledAt': scheduledAt.toUtc().toIso8601String(),
                if (notes != null && notes.trim().isNotEmpty)
                  'notes': notes.trim(),
              },
            )
            as Map;
    final booking = Booking.fromJson(Map<String, dynamic>.from(json));
    _cache.invalidate(CacheKeys.bookings);
    // A new booking occupies a slot, which changes that provider's
    // availability picture for everyone browsing.
    _cache.invalidate(CacheKeys.queueSummary(booking.providerId));
    _cache.invalidatePrefix(CacheKeys.availabilityPrefix(booking.providerId));
    return booking;
  }

  /// The only status change a customer may drive. The backend enforces that
  /// it is legal from the booking's current state.
  Future<Booking> cancelBooking(int id) async {
    final json =
        await _api.patch('/bookings/$id', body: {'status': 'CANCELLED'}) as Map;
    final booking = Booking.fromJson(Map<String, dynamic>.from(json));
    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidate(CacheKeys.booking(id));
    _cache.invalidate(CacheKeys.myQueue);
    _cache.invalidate(CacheKeys.queueSummary(booking.providerId));
    return booking;
  }

  // --- queue ---------------------------------------------------------------

  /// GET /queue for a CUSTOMER returns only that customer's own entries.
  /// Position and wait are computed server-side across the whole line, so
  /// the numbers are correct without ever exposing the other people in it.
  Future<List<QueueEntry>> _loadMyQueue() async {
    final raw = await _api.get('/queue') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((json) => QueueEntry.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  AsyncValue<List<QueueEntry>> watchMyQueue() =>
      _cache.watch(CacheKeys.myQueue, _loadMyQueue);

  Future<List<QueueEntry>> refreshMyQueue() =>
      _cache.refresh(CacheKeys.myQueue, _loadMyQueue);

  // --- reviews -------------------------------------------------------------

  /// POST /reviews requires a completed booking the caller owns, and the
  /// unique index on bookingId means one review per booking. Both rules are
  /// enforced server-side; a 409 here means "already reviewed".
  Future<Review> submitReview({
    required int bookingId,
    required int rating,
    String? comment,
  }) async {
    final json =
        await _api.post(
              '/reviews',
              body: {
                'bookingId': bookingId,
                'rating': rating,
                if (comment != null && comment.trim().isNotEmpty)
                  'comment': comment.trim(),
              },
            )
            as Map;
    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidate(CacheKeys.booking(bookingId));
    // The provider's rating and review list both change.
    _cache.invalidatePrefix(CacheKeys.providerPrefix);
    _cache.invalidate(CacheKeys.providers);
    return Review.fromJson(Map<String, dynamic>.from(json));
  }

  /// A customer may delete their own review; the backend rejects anyone
  /// else's with a 403.
  Future<void> deleteReview(int reviewId) async {
    await _api.delete('/reviews/$reviewId');
    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidatePrefix(CacheKeys.providerPrefix);
    _cache.invalidate(CacheKeys.providers);
  }
}
