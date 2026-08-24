import '../../../core/models/admin_models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/state/async_value.dart';
import '../../../core/state/query_cache.dart';

/// Cache keys for the admin area.
///
/// Filtered lists are keyed by their filter, so switching a filter is a
/// separate cached read rather than a refetch that clobbers the previous
/// one. `categories` and `bookings` are shared with the other areas on
/// purpose — they are the same endpoints, and an admin mutating a category
/// should invalidate what a provider's service form reads.
class AdminKeys {
  const AdminKeys._();

  static const overview = 'admin/overview';
  static const users = 'admin/users';
  static const complaints = 'admin/complaints';
  static const reviews = 'admin/reviews';
  static const analytics = 'admin/analytics';

  /// Shared with the customer/provider areas — same endpoint, and an admin
  /// edit must invalidate their copies too.
  static const categories = 'categories';
  static const bookings = 'bookings';
  static const providers = 'admin/providers';

  static String usersFiltered(String role, String search) =>
      'admin/users?role=$role&q=$search';
  static String complaintsFiltered(String status, String severity) =>
      'admin/complaints?status=$status&severity=$severity';
  static String reviewsFiltered(String rating, String providerId) =>
      'admin/reviews?rating=$rating&provider=$providerId';
  static String analyticsFor(String range) => 'admin/analytics/$range';
  static String user(int id) => 'admin/users/$id';
}

/// Everything the admin area reads and writes.
///
/// Reuses the shared [ApiClient] and [QueryCache] rather than introducing a
/// parallel stack — the same object graph the customer and provider areas
/// use, wired in the same composition root.
///
/// Every route here is ADMIN-only server-side (`router.use(authenticate,
/// authorize('ADMIN'))` on /admin, and per-route `authorize('ADMIN')` for
/// category writes, provider approval and review deletion). The screens
/// never re-implement that check — the backend remains the boundary.
class AdminRepository {
  AdminRepository(this._api, this._cache);

  final ApiClient _api;
  final QueryCache _cache;

  // --- overview ------------------------------------------------------------

  Future<AdminOverview> _loadOverview() async {
    final json = await _api.get('/admin/overview') as Map;
    return AdminOverview.fromJson(Map<String, dynamic>.from(json));
  }

  AsyncValue<AdminOverview> watchOverview() =>
      _cache.watch(AdminKeys.overview, _loadOverview);

  Future<AdminOverview> refreshOverview() =>
      _cache.refresh(AdminKeys.overview, _loadOverview);

  // --- users ---------------------------------------------------------------

  /// Role and search are applied server-side (Prisma `contains` with
  /// `insensitive` mode), not filtered on the client, so the list stays
  /// correct for datasets larger than one page of rows.
  AsyncValue<List<AdminUserRow>> watchUsers({
    String role = 'ALL',
    String search = '',
  }) => _cache.watch(AdminKeys.usersFiltered(role, search), () async {
    final raw =
        await _api.get(
              '/admin/users',
              query: {
                if (role != 'ALL') 'role': role,
                if (search.trim().isNotEmpty) 'search': search.trim(),
              },
            )
            as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => AdminUserRow.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  });

  Future<List<AdminUserRow>> refreshUsers({
    String role = 'ALL',
    String search = '',
  }) => _cache.refresh(AdminKeys.usersFiltered(role, search), () async {
    final raw =
        await _api.get(
              '/admin/users',
              query: {
                if (role != 'ALL') 'role': role,
                if (search.trim().isNotEmpty) 'search': search.trim(),
              },
            )
            as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => AdminUserRow.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  });

  AsyncValue<AdminUserDetail> watchUser(int id) =>
      _cache.watch(AdminKeys.user(id), () async {
        final json = await _api.get('/admin/users/$id') as Map;
        return AdminUserDetail.fromJson(Map<String, dynamic>.from(json));
      });

  // --- providers -----------------------------------------------------------

  /// GET /providers returns every business — including unapproved ones —
  /// for an ADMIN token, scoped server-side by role.
  Future<List<AdminProviderRow>> _loadProviders() async {
    final raw = await _api.get('/providers') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => AdminProviderRow.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  AsyncValue<List<AdminProviderRow>> watchProviders() =>
      _cache.watch(AdminKeys.providers, _loadProviders);

  Future<List<AdminProviderRow>> refreshProviders() =>
      _cache.refresh(AdminKeys.providers, _loadProviders);

  /// PATCH /providers/:id/approval sets approval in either direction — the
  /// same route the web admin uses. The older /approve route is left alone.
  ///
  /// Approving or revoking changes what customers can discover, so the
  /// customer-facing `providers` key is invalidated too.
  Future<void> setProviderApproval(int providerId, bool approved) async {
    await _api.patch(
      '/providers/$providerId/approval',
      body: {'isApproved': approved},
    );
    _cache.invalidate(AdminKeys.providers);
    _cache.invalidate('providers');
    _cache.invalidate(AdminKeys.overview);
    _cache.invalidatePrefix(AdminKeys.analytics);
  }

  // --- categories ----------------------------------------------------------

  Future<List<ServiceCategory>> _loadCategories() async {
    final raw = await _api.get('/categories') as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => ServiceCategory.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  AsyncValue<List<ServiceCategory>> watchCategories() =>
      _cache.watch(AdminKeys.categories, _loadCategories);

  Future<List<ServiceCategory>> refreshCategories() =>
      _cache.refresh(AdminKeys.categories, _loadCategories);

  /// Only name and description are sent, because they are the only fields
  /// the endpoint reads — `categoryService.createCategory` destructures
  /// exactly those two. `isActive` exists on the row and is shown in the
  /// UI, but no route writes it; sending it would be a silent no-op that
  /// looked like a working toggle.
  Future<void> createCategory({
    required String name,
    String? description,
  }) async {
    await _api.post(
      '/categories',
      body: {
        'name': name,
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
      },
    );
    _afterCategoryChange();
  }

  /// The backend exposes PUT (not PATCH) for a category update, so the full
  /// editable set is sent rather than a partial patch — and that set is
  /// name and description, for the reason given on [createCategory].
  Future<void> updateCategory(
    int id, {
    required String name,
    String? description,
  }) async {
    await _api.put(
      '/categories/$id',
      body: {'name': name, 'description': description?.trim()},
    );
    _afterCategoryChange();
  }

  /// The backend refuses to delete a category that still has services
  /// attached and says so in the message — that error is surfaced verbatim
  /// rather than swallowed, because "deactivate it instead" is the actual
  /// answer the admin needs.
  Future<void> deleteCategory(int id) async {
    await _api.delete('/categories/$id');
    _afterCategoryChange();
  }

  void _afterCategoryChange() {
    _cache.invalidate(AdminKeys.categories);
    _cache.invalidate(AdminKeys.overview);
    // A deactivated category hides its services from customer discovery.
    _cache.invalidate('providers');
    _cache.invalidate(AdminKeys.providers);
  }

  // --- bookings ------------------------------------------------------------

  /// GET /bookings returns every booking on the platform for an ADMIN
  /// token, scoped server-side by role.
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
      _cache.watch(AdminKeys.bookings, _loadBookings);

  Future<List<Booking>> refreshBookings() =>
      _cache.refresh(AdminKeys.bookings, _loadBookings);

  AsyncValue<Booking> watchBooking(int id) =>
      _cache.watch('booking/$id', () async {
        final json = await _api.get('/bookings/$id') as Map;
        return Booking.fromJson(Map<String, dynamic>.from(json));
      });

  // --- complaints ----------------------------------------------------------

  Future<List<Complaint>> _fetchComplaints(
    String status,
    String severity,
  ) async {
    final raw =
        await _api.get(
              '/admin/complaints',
              query: {
                if (status != 'ALL') 'status': status,
                if (severity != 'ALL') 'severity': severity,
              },
            )
            as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => Complaint.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  AsyncValue<List<Complaint>> watchComplaints({
    String status = 'ALL',
    String severity = 'ALL',
  }) => _cache.watch(
    AdminKeys.complaintsFiltered(status, severity),
    () => _fetchComplaints(status, severity),
  );

  Future<List<Complaint>> refreshComplaints({
    String status = 'ALL',
    String severity = 'ALL',
  }) => _cache.refresh(
    AdminKeys.complaintsFiltered(status, severity),
    () => _fetchComplaints(status, severity),
  );

  /// Triage. `resolvedAt` is derived server-side from the status, so it is
  /// never sent from here — a RESOLVED/DISMISSED complaint gets stamped and
  /// a reopened one gets cleared, without the client having a say.
  ///
  /// Every filtered list is invalidated because a status change can move a
  /// complaint between them.
  Future<Complaint> setComplaintStatus(int id, ComplaintStatus status) async {
    final json =
        await _api.patch('/admin/complaints/$id', body: {'status': status.api})
            as Map;
    _cache.invalidatePrefix(AdminKeys.complaints);
    _cache.invalidate(AdminKeys.overview);
    return Complaint.fromJson(Map<String, dynamic>.from(json));
  }

  // --- reviews -------------------------------------------------------------

  Future<List<AdminReview>> _fetchReviews(
    String rating,
    String providerId,
  ) async {
    final raw =
        await _api.get(
              '/admin/reviews',
              query: {
                if (rating != 'ALL') 'rating': rating,
                if (providerId != 'ALL') 'providerId': providerId,
              },
            )
            as List<dynamic>;
    return raw
        .whereType<Map>()
        .map((j) => AdminReview.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  AsyncValue<List<AdminReview>> watchReviews({
    String rating = 'ALL',
    String providerId = 'ALL',
  }) => _cache.watch(
    AdminKeys.reviewsFiltered(rating, providerId),
    () => _fetchReviews(rating, providerId),
  );

  Future<List<AdminReview>> refreshReviews({
    String rating = 'ALL',
    String providerId = 'ALL',
  }) => _cache.refresh(
    AdminKeys.reviewsFiltered(rating, providerId),
    () => _fetchReviews(rating, providerId),
  );

  /// DELETE /reviews/:id. The route allows CUSTOMER or ADMIN and the
  /// service decides: a customer may remove only their own, an admin any.
  /// Removing one changes the provider's rating, so their pages are
  /// invalidated too.
  Future<void> deleteReview(int reviewId, {int? providerId}) async {
    await _api.delete('/reviews/$reviewId');
    _cache.invalidatePrefix(AdminKeys.reviews);
    _cache.invalidate(AdminKeys.overview);
    _cache.invalidate('providers');
    if (providerId != null) {
      _cache.invalidate('provider/$providerId/reviews');
      _cache.invalidate('provider/$providerId');
    }
  }

  // --- analytics -----------------------------------------------------------

  Future<AdminAnalytics> _fetchAnalytics(String range) async {
    final json =
        await _api.get('/admin/analytics', query: {'range': range}) as Map;
    return AdminAnalytics.fromJson(Map<String, dynamic>.from(json));
  }

  AsyncValue<AdminAnalytics> watchAnalytics(String range) =>
      _cache.watch(AdminKeys.analyticsFor(range), () => _fetchAnalytics(range));

  Future<AdminAnalytics> refreshAnalytics(String range) => _cache.refresh(
    AdminKeys.analyticsFor(range),
    () => _fetchAnalytics(range),
  );
}
