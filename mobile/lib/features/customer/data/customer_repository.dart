import '../../../core/models/admin_models.dart' show Complaint, ComplaintSeverity;
import '../../../core/models/live_camera_models.dart';
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
  static const myReviews = 'reviews/mine';
  static const myComplaints = 'complaints/mine';
  static const myFavorites = 'favorites/mine';
  static const myVehicles = 'vehicles/mine';

  static String providerReviews(int id) => 'provider/$id/reviews';
  static String providerRating(int id) => 'provider/$id/rating';
  static String queueSummary(int id) => 'provider/$id/queue-summary';
  static String booking(int id) => 'booking/$id';
  static String providerHours(int providerId) => 'provider/$providerId/hours';
  static String availability(int providerId, int serviceId, String date) =>
      'availability/$providerId/$serviceId/$date';
  static String fuel(int providerId) => 'provider/$providerId/fuel';
  static String fuelHistory(int providerId, String fuelType, String range) =>
      'provider/$providerId/fuel/history/$fuelType/$range';
  static String liveCamera(int providerId) =>
      'provider/$providerId/live-camera';

  /// Everything scoped to a single provider, for bulk invalidation.
  static const providerPrefix = 'provider/';

  /// Every cached availability query for one provider, regardless of which
  /// service/date combination was requested.
  static String availabilityPrefix(int providerId) => 'availability/$providerId/';

  /// Every cached fuel history query for one provider, regardless of
  /// fuelType/range.
  static String fuelHistoryPrefix(int providerId) => 'provider/$providerId/fuel/history/';
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

  /// GET /providers/:id/live-camera. Only meaningful for a provider whose
  /// [ServiceProvider.liveCameraEnabled] is true — callers should not fetch
  /// this otherwise. Never fabricates LIVE: the backend itself only ever
  /// reports it when a real upstream is currently configured.
  AsyncValue<LiveCameraStatus> watchLiveCameraStatus(int providerId) =>
      _cache.watch(CacheKeys.liveCamera(providerId), () async {
        final json = await _api.get('/providers/$providerId/live-camera') as Map;
        return LiveCameraStatus.fromJson(Map<String, dynamic>.from(json));
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

  /// Public read — only shown when the list is non-empty; a provider that
  /// doesn't sell fuel simply has no rows, never a fabricated empty-tank
  /// row.
  AsyncValue<List<FuelInventoryItem>> watchProviderFuel(int providerId) =>
      _cache.watch(CacheKeys.fuel(providerId), () async {
        final raw = await _api.get('/providers/$providerId/fuel') as List<dynamic>;
        return raw
            .whereType<Map>()
            .map((json) => FuelInventoryItem.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      });

  /// Real recorded points only — one per Admin update, including the
  /// initial creation. [range] is "7d" or "30d".
  AsyncValue<List<FuelHistoryPoint>> watchFuelHistory(
    int providerId,
    FuelTypeModel fuelType,
    String range,
  ) => _cache.watch(
    CacheKeys.fuelHistory(providerId, fuelType.api, range),
    () async {
      final raw =
          await _api.get(
                '/providers/$providerId/fuel/history',
                query: {'fuelType': fuelType.api, 'range': range},
              )
              as List<dynamic>;
      return raw
          .whereType<Map>()
          .map((json) => FuelHistoryPoint.fromJson(Map<String, dynamic>.from(json)))
          .toList();
    },
  );

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
    _cache.invalidate(CacheKeys.myReviews);
    return Review.fromJson(Map<String, dynamic>.from(json));
  }

  /// A customer may delete their own review; the backend rejects anyone
  /// else's with a 403.
  Future<void> deleteReview(int reviewId) async {
    await _api.delete('/reviews/$reviewId');
    _cache.invalidate(CacheKeys.bookings);
    _cache.invalidatePrefix(CacheKeys.providerPrefix);
    _cache.invalidate(CacheKeys.providers);
    _cache.invalidate(CacheKeys.myReviews);
  }

  /// GET /reviews/me — this customer's own reviews, across every provider.
  Future<List<MyReview>> _loadMyReviews() async {
    final raw = await _api.get('/reviews/me') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((json) => MyReview.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  AsyncValue<List<MyReview>> watchMyReviews() =>
      _cache.watch(CacheKeys.myReviews, _loadMyReviews);

  Future<List<MyReview>> refreshMyReviews() =>
      _cache.refresh(CacheKeys.myReviews, _loadMyReviews);

  // --- complaints ------------------------------------------------------------

  /// GET /complaints/me — this customer's own filed complaints. The same
  /// [Complaint] model admin's triage screen already uses; the
  /// `submittedBy*` fields are simply absent from this response (the
  /// customer already knows who filed it), which [Complaint.fromJson]
  /// already handles as optional.
  Future<List<Complaint>> _loadMyComplaints() async {
    final raw = await _api.get('/complaints/me') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((json) => Complaint.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  AsyncValue<List<Complaint>> watchMyComplaints() =>
      _cache.watch(CacheKeys.myComplaints, _loadMyComplaints);

  Future<List<Complaint>> refreshMyComplaints() =>
      _cache.refresh(CacheKeys.myComplaints, _loadMyComplaints);

  /// POST /complaints requires a real provider; customerId always comes
  /// from the verified JWT server-side, never sent from here.
  Future<Complaint> submitComplaint({
    required int providerId,
    required String subject,
    String? details,
    ComplaintSeverity severity = ComplaintSeverity.medium,
  }) async {
    final json =
        await _api.post(
              '/complaints',
              body: {
                'providerId': providerId,
                'subject': subject,
                'severity': severity.api,
                if (details != null && details.trim().isNotEmpty)
                  'details': details.trim(),
              },
            )
            as Map;
    _cache.invalidate(CacheKeys.myComplaints);
    return Complaint.fromJson(Map<String, dynamic>.from(json));
  }

  // --- favorites -------------------------------------------------------------

  /// GET /favorites/me — this customer's own saved businesses, persisted on
  /// the backend so the same state appears on web and mobile after refetch.
  Future<List<Favorite>> _loadMyFavorites() async {
    final raw = await _api.get('/favorites/me') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((json) => Favorite.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  AsyncValue<List<Favorite>> watchMyFavorites() =>
      _cache.watch(CacheKeys.myFavorites, _loadMyFavorites);

  Future<List<Favorite>> refreshMyFavorites() =>
      _cache.refresh(CacheKeys.myFavorites, _loadMyFavorites);

  /// Idempotent server-side: favoriting an already-favorited provider just
  /// returns the existing row.
  Future<Favorite> addFavorite(int providerId) async {
    final json =
        await _api.post('/favorites', body: {'providerId': providerId}) as Map;
    _cache.invalidate(CacheKeys.myFavorites);
    return Favorite.fromJson(Map<String, dynamic>.from(json));
  }

  /// Idempotent server-side: removing an already-absent favorite is a
  /// silent no-op success.
  Future<void> removeFavorite(int providerId) async {
    await _api.delete('/favorites/$providerId');
    _cache.invalidate(CacheKeys.myFavorites);
  }

  // --- vehicles --------------------------------------------------------------

  /// GET /vehicles — this customer's own vehicles. Not a government/VIN-
  /// verified record; there is deliberately no VIN decoding.
  Future<List<Vehicle>> _loadMyVehicles() async {
    final raw = await _api.get('/vehicles') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((json) => Vehicle.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  AsyncValue<List<Vehicle>> watchMyVehicles() =>
      _cache.watch(CacheKeys.myVehicles, _loadMyVehicles);

  Future<List<Vehicle>> refreshMyVehicles() =>
      _cache.refresh(CacheKeys.myVehicles, _loadMyVehicles);

  Future<Vehicle> createVehicle({
    required String make,
    required String model,
    required int year,
    String? plate,
    String? color,
    FuelTypeModel? fuelType,
  }) async {
    final json =
        await _api.post(
              '/vehicles',
              body: {
                'make': make,
                'model': model,
                'year': year,
                'plate': plate,
                'color': color,
                'fuelType': fuelType?.api,
              },
            )
            as Map;
    _cache.invalidate(CacheKeys.myVehicles);
    return Vehicle.fromJson(Map<String, dynamic>.from(json));
  }

  // plate/color/fuelType are always sent — as a value or explicit null,
  // never omitted — so the backend can tell "leave unchanged" (an absent
  // key) apart from "the customer cleared this field" (an explicit null).
  Future<Vehicle> updateVehicle(
    int id, {
    required String make,
    required String model,
    required int year,
    String? plate,
    String? color,
    FuelTypeModel? fuelType,
  }) async {
    final json =
        await _api.patch(
              '/vehicles/$id',
              body: {
                'make': make,
                'model': model,
                'year': year,
                'plate': plate,
                'color': color,
                'fuelType': fuelType?.api,
              },
            )
            as Map;
    _cache.invalidate(CacheKeys.myVehicles);
    return Vehicle.fromJson(Map<String, dynamic>.from(json));
  }

  Future<void> deleteVehicle(int id) async {
    await _api.delete('/vehicles/$id');
    _cache.invalidate(CacheKeys.myVehicles);
  }
}
