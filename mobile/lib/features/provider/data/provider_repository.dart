import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/state/async_value.dart';
import '../../../core/state/query_cache.dart';

/// Cache keys for the provider area.
///
/// Separate from the customer keys, except where the endpoint is genuinely
/// the same one scoped differently by the backend — `bookings` and `queue`
/// return the provider's own business data for a PROVIDER token, so they
/// reuse those keys and inherit the invalidation the socket layer already
/// performs on them.
class ProviderKeys {
  const ProviderKeys._();

  static const profile = 'provider/me';
  static const analytics = 'provider/me/analytics';
  static const categories = 'categories';

  /// Same endpoint as the customer's, scoped server-side by role.
  static const bookings = 'bookings';
  static const queue = 'queue/mine';

  static String reviews(int providerId) => 'provider/$providerId/reviews';
  static String analyticsFor(String range) => 'provider/me/analytics/$range';
}

/// Everything the provider area reads and writes.
///
/// Reuses the shared [ApiClient] and [QueryCache] rather than introducing a
/// parallel stack — the same object graph the customer area uses, wired in
/// the same composition root.
class ProviderRepository {
  ProviderRepository(this._api, this._cache);

  final ApiClient _api;
  final QueryCache _cache;

  // --- profile -------------------------------------------------------------

  Future<OwnProviderProfile> _loadProfile() async {
    final json = await _api.get('/providers/me') as Map;
    return OwnProviderProfile.fromJson(Map<String, dynamic>.from(json));
  }

  AsyncValue<OwnProviderProfile> watchProfile() =>
      _cache.watch(ProviderKeys.profile, _loadProfile);

  Future<OwnProviderProfile> refreshProfile() =>
      _cache.refresh(ProviderKeys.profile, _loadProfile);

  /// PATCH /providers/me. Only the keys present are sent, so a form that
  /// edits one field cannot blank out the rest.
  ///
  /// The response is the freshly-read profile, so it is written straight
  /// into the cache rather than guessed at optimistically.
  Future<OwnProviderProfile> updateProfile(Map<String, dynamic> changes) async {
    final json = await _api.patch('/providers/me', body: changes) as Map;
    final profile = OwnProviderProfile.fromJson(
      Map<String, dynamic>.from(json),
    );
    _cache.setData(ProviderKeys.profile, profile);
    // Availability changes what customers can see and book.
    _cache.invalidate('providers');
    return profile;
  }

  Future<OwnProviderProfile> setOpen(bool isOpen) =>
      updateProfile({'isOpen': isOpen});

  Future<OwnProviderProfile> setAdvertisedWait(int minutes) =>
      updateProfile({'estimatedWaitMinutes': minutes});

  // --- services ------------------------------------------------------------

  AsyncValue<List<ServiceCategory>> watchCategories() =>
      _cache.watch(ProviderKeys.categories, () async {
        final raw = await _api.get('/categories') as List<dynamic>;
        return raw
            .whereType<Map>()
            .map((j) => ServiceCategory.fromJson(Map<String, dynamic>.from(j)))
            .toList();
      });

  Future<void> createService({
    required String name,
    required int categoryId,
    required double price,
    required int durationMinutes,
    required bool isAvailable,
  }) async {
    await _api.post(
      '/providers/me/services',
      body: {
        'name': name,
        'categoryId': categoryId,
        'price': price,
        'durationMinutes': durationMinutes,
        'isAvailable': isAvailable,
      },
    );
    await refreshProfile();
    _cache.invalidate('providers');
  }

  Future<void> updateService(
    int serviceId,
    Map<String, dynamic> changes,
  ) async {
    await _api.patch('/providers/me/services/$serviceId', body: changes);
    await refreshProfile();
    _cache.invalidate('providers');
  }

  /// The backend refuses to delete a service with booking or queue history
  /// and explains why in the message — that 409 is surfaced verbatim rather
  /// than swallowed, because "mark it unavailable instead" is the actual
  /// answer the provider needs.
  Future<void> deleteService(int serviceId) async {
    await _api.delete('/providers/me/services/$serviceId');
    await refreshProfile();
    _cache.invalidate('providers');
  }

  // --- bookings ------------------------------------------------------------

  /// GET /bookings returns this business's bookings for a PROVIDER token,
  /// scoped server-side by the linked providerId.
  Future<List<Booking>> _loadBookings() async {
    final raw = await _api.get('/bookings') as List<dynamic>;
    final bookings = raw
        .whereType<Map>()
        .map((j) => Booking.fromJson(Map<String, dynamic>.from(j)))
        .toList();
    bookings.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
    return bookings;
  }

  AsyncValue<List<Booking>> watchBookings() =>
      _cache.watch(ProviderKeys.bookings, _loadBookings);

  Future<List<Booking>> refreshBookings() =>
      _cache.refresh(ProviderKeys.bookings, _loadBookings);

  AsyncValue<Booking> watchBooking(int id) =>
      _cache.watch('booking/$id', () async {
        final json = await _api.get('/bookings/$id') as Map;
        return Booking.fromJson(Map<String, dynamic>.from(json));
      });

  /// Booking-only transitions: PENDING→CONFIRMED/REJECTED,
  /// CONFIRMED→ARRIVED, and cancellation. The backend's shared state
  /// machine validates every edge, so an illegal one returns 400 rather
  /// than being pre-filtered into silence here.
  Future<Booking> setBookingStatus(int id, String status) async {
    final json =
        await _api.patch('/bookings/$id', body: {'status': status}) as Map;
    final booking = Booking.fromJson(Map<String, dynamic>.from(json));
    _invalidateWorkflow(id);
    return booking;
  }

  // --- queue ---------------------------------------------------------------

  /// GET /queue for a PROVIDER returns their entire line, including
  /// customer names and stored positions.
  Future<List<QueueEntry>> _loadQueue() async {
    final raw = await _api.get('/queue') as List<dynamic>;
    final entries = raw
        .whereType<Map>()
        .map((j) => QueueEntry.fromJson(Map<String, dynamic>.from(j)))
        .toList();
    entries.sort(
      (a, b) => (a.queuePosition ?? 0).compareTo(b.queuePosition ?? 0),
    );
    return entries;
  }

  AsyncValue<List<QueueEntry>> watchQueue() =>
      _cache.watch(ProviderKeys.queue, _loadQueue);

  Future<List<QueueEntry>> refreshQueue() =>
      _cache.refresh(ProviderKeys.queue, _loadQueue);

  /// Moves an ARRIVED booking into the line. The backend rejects any other
  /// status, and flips the booking to IN_QUEUE in the same transaction.
  Future<void> addBookingToQueue(int bookingId) async {
    await _api.post('/queue', body: {'bookingId': bookingId});
    _invalidateWorkflow(bookingId);
  }

  Future<void> addWalkIn({
    required int providerServiceId,
    required String customerName,
  }) async {
    await _api.post(
      '/queue',
      body: {
        'providerServiceId': providerServiceId,
        'customerName': customerName,
      },
    );
    _invalidateWorkflow(null);
  }

  /// Start or complete service. Mirrored onto the linked booking by the
  /// backend inside one transaction, so both records move together.
  Future<void> setQueueStatus(
    int entryId,
    String status, {
    int? bookingId,
  }) async {
    await _api.patch('/queue/$entryId', body: {'status': status});
    _invalidateWorkflow(bookingId);
  }

  /// Drops an entry. A booking-linked WAITING entry also cancels its
  /// booking; an IN_SERVICE one is refused by the backend, and that 400 is
  /// surfaced rather than hidden.
  Future<void> removeQueueEntry(int entryId, {int? bookingId}) async {
    await _api.delete('/queue/$entryId');
    _invalidateWorkflow(bookingId);
  }

  /// PATCH /queue/reorder expects the complete current WAITING set — a
  /// subset is ambiguous about where the omitted entries land, so the
  /// backend refuses it.
  Future<void> reorderQueue(List<int> orderedIds) async {
    await _api.patch('/queue/reorder', body: {'orderedIds': orderedIds});
    _invalidateWorkflow(null);
  }

  /// Queue and booking state move together often enough that keeping the
  /// invalidation in one place stops the two from drifting apart.
  void _invalidateWorkflow(int? bookingId) {
    _cache.invalidate(ProviderKeys.queue);
    _cache.invalidate(ProviderKeys.bookings);
    _cache.invalidatePrefix(ProviderKeys.analytics);
    if (bookingId != null) _cache.invalidate('booking/$bookingId');
  }

  // --- reviews -------------------------------------------------------------

  /// The backend refuses any provider asking for another business's
  /// reviews, and the id here comes from /providers/me rather than input.
  AsyncValue<List<Review>> watchReviews(int providerId) =>
      _cache.watch(ProviderKeys.reviews(providerId), () async {
        final raw =
            await _api.get('/providers/$providerId/reviews') as List<dynamic>;
        return raw
            .whereType<Map>()
            .map((j) => Review.fromJson(Map<String, dynamic>.from(j)))
            .toList();
      });

  // --- analytics -----------------------------------------------------------

  AsyncValue<ProviderAnalytics> watchAnalytics(String range) =>
      _cache.watch(ProviderKeys.analyticsFor(range), () async {
        final json =
            await _api.get('/providers/me/analytics', query: {'range': range})
                as Map;
        return ProviderAnalytics.fromJson(Map<String, dynamic>.from(json));
      });

  Future<ProviderAnalytics> refreshAnalytics(String range) =>
      _cache.refresh(ProviderKeys.analyticsFor(range), () async {
        final json =
            await _api.get('/providers/me/analytics', query: {'range': range})
                as Map;
        return ProviderAnalytics.fromJson(Map<String, dynamic>.from(json));
      });
}
