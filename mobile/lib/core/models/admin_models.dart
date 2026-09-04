import 'models.dart';

// Re-exported so an admin screen needs one import to reach both the shared
// models (Booking, Review, ServiceCategory) and the admin-only ones.
export 'models.dart';

// ---------------------------------------------------------------------------
// Overview — GET /admin/overview
// ---------------------------------------------------------------------------

/// Every figure here is a count or aggregate the backend computed over rows
/// that exist. There is deliberately no revenue, AI, notification, stream,
/// demographic or "system health" field: none of those have a source in the
/// schema, so the admin service does not return them and this model has
/// nowhere to put them.
class AdminOverview {
  const AdminOverview({
    required this.users,
    required this.providers,
    required this.bookings,
    required this.reviews,
    required this.activeQueueEntries,
    required this.catalog,
    required this.complaints,
    required this.recentRegistrations,
    required this.pendingProviders,
    required this.recentComplaints,
  });

  final AdminUserCounts users;
  final AdminProviderCounts providers;
  final AdminBookingCounts bookings;
  final AdminReviewCounts reviews;
  final int activeQueueEntries;
  final AdminCatalogCounts catalog;
  final AdminComplaintCounts complaints;
  final List<AdminRecentRegistration> recentRegistrations;
  final List<AdminPendingProvider> pendingProviders;
  final List<Complaint> recentComplaints;

  factory AdminOverview.fromJson(Map<String, dynamic> json) {
    final queue = asMapOrNull(json['queue']) ?? const {};
    return AdminOverview(
      users: AdminUserCounts.fromJson(asMapOrNull(json['users']) ?? const {}),
      providers: AdminProviderCounts.fromJson(
        asMapOrNull(json['providers']) ?? const {},
      ),
      bookings: AdminBookingCounts.fromJson(
        asMapOrNull(json['bookings']) ?? const {},
      ),
      reviews: AdminReviewCounts.fromJson(
        asMapOrNull(json['reviews']) ?? const {},
      ),
      activeQueueEntries: asInt(queue['activeEntries']),
      catalog: AdminCatalogCounts.fromJson(
        asMapOrNull(json['catalog']) ?? const {},
      ),
      complaints: AdminComplaintCounts.fromJson(
        asMapOrNull(json['complaints']) ?? const {},
      ),
      recentRegistrations: asMapList(
        json['recentRegistrations'],
      ).map(AdminRecentRegistration.fromJson).toList(),
      pendingProviders: asMapList(
        json['pendingProviders'],
      ).map(AdminPendingProvider.fromJson).toList(),
      recentComplaints: asMapList(
        json['recentComplaints'],
      ).map(Complaint.fromJson).toList(),
    );
  }
}

class AdminUserCounts {
  const AdminUserCounts({
    required this.total,
    required this.customers,
    required this.providerAccounts,
    required this.admins,
  });

  final int total;
  final int customers;
  final int providerAccounts;
  final int admins;

  factory AdminUserCounts.fromJson(Map<String, dynamic> json) =>
      AdminUserCounts(
        total: asInt(json['total']),
        customers: asInt(json['customers']),
        providerAccounts: asInt(json['providerAccounts']),
        admins: asInt(json['admins']),
      );
}

class AdminProviderCounts {
  const AdminProviderCounts({
    required this.total,
    required this.approved,
    required this.pending,
    required this.openNow,
  });

  final int total;
  final int approved;
  final int pending;
  final int openNow;

  factory AdminProviderCounts.fromJson(Map<String, dynamic> json) =>
      AdminProviderCounts(
        total: asInt(json['total']),
        approved: asInt(json['approved']),
        pending: asInt(json['pending']),
        openNow: asInt(json['openNow']),
      );
}

class AdminBookingCounts {
  const AdminBookingCounts({
    required this.total,
    required this.active,
    required this.completed,
    required this.cancelled,
    required this.rejected,
  });

  final int total;
  final int active;
  final int completed;
  final int cancelled;
  final int rejected;

  factory AdminBookingCounts.fromJson(Map<String, dynamic> json) =>
      AdminBookingCounts(
        total: asInt(json['total']),
        active: asInt(json['active']),
        completed: asInt(json['completed']),
        cancelled: asInt(json['cancelled']),
        rejected: asInt(json['rejected']),
      );
}

/// [averageRating] is null when the platform has no reviews at all, which
/// must render as a dash rather than 0.0.
class AdminReviewCounts {
  const AdminReviewCounts({required this.total, this.averageRating});

  final int total;
  final double? averageRating;

  factory AdminReviewCounts.fromJson(Map<String, dynamic> json) =>
      AdminReviewCounts(
        total: asInt(json['total']),
        averageRating: asDoubleOrNull(json['averageRating']),
      );
}

class AdminCatalogCounts {
  const AdminCatalogCounts({
    required this.categories,
    required this.activeCategories,
    required this.services,
  });

  final int categories;
  final int activeCategories;
  final int services;

  factory AdminCatalogCounts.fromJson(Map<String, dynamic> json) =>
      AdminCatalogCounts(
        categories: asInt(json['categories']),
        activeCategories: asInt(json['activeCategories']),
        services: asInt(json['services']),
      );
}

class AdminComplaintCounts {
  const AdminComplaintCounts({required this.open, required this.total});

  final int open;
  final int total;

  factory AdminComplaintCounts.fromJson(Map<String, dynamic> json) =>
      AdminComplaintCounts(
        open: asInt(json['open']),
        total: asInt(json['total']),
      );
}

class AdminRecentRegistration {
  const AdminRecentRegistration({
    required this.id,
    required this.name,
    required this.role,
    required this.createdAt,
  });

  final int id;
  final String name;
  final UserRoleModel? role;
  final DateTime createdAt;

  factory AdminRecentRegistration.fromJson(Map<String, dynamic> json) =>
      AdminRecentRegistration(
        id: asInt(json['id']),
        name: asString(json['name']),
        role: UserRoleModel.fromApi(asStringOrNull(json['role'])),
        createdAt: asDate(json['createdAt']),
      );
}

class AdminPendingProvider {
  const AdminPendingProvider({
    required this.id,
    required this.businessName,
    required this.address,
    required this.createdAt,
    required this.ownerName,
    required this.ownerEmail,
  });

  final int id;
  final String businessName;
  final String address;
  final DateTime createdAt;
  final String ownerName;
  final String ownerEmail;

  factory AdminPendingProvider.fromJson(Map<String, dynamic> json) {
    final user = asMapOrNull(json['user']);
    return AdminPendingProvider(
      id: asInt(json['id']),
      businessName: asString(json['businessName']),
      address: asString(json['address']),
      createdAt: asDate(json['createdAt']),
      ownerName: asString(user?['name']),
      ownerEmail: asString(user?['email']),
    );
  }
}

// ---------------------------------------------------------------------------
// Complaints — GET /admin/complaints, PATCH /admin/complaints/:id
// ---------------------------------------------------------------------------

enum ComplaintSeverity {
  low('LOW'),
  medium('MEDIUM'),
  high('HIGH');

  const ComplaintSeverity(this.api);
  final String api;

  static ComplaintSeverity fromApi(String? value) =>
      ComplaintSeverity.values.firstWhere(
        (s) => s.api == value,
        orElse: () => ComplaintSeverity.medium,
      );
}

enum ComplaintStatus {
  open('OPEN'),
  inReview('IN_REVIEW'),
  resolved('RESOLVED'),
  dismissed('DISMISSED');

  const ComplaintStatus(this.api);
  final String api;

  /// RESOLVED and DISMISSED are the two the backend stamps `resolvedAt`
  /// for; reopening clears it again.
  bool get isClosed =>
      this == ComplaintStatus.resolved || this == ComplaintStatus.dismissed;

  static ComplaintStatus fromApi(String? value) => ComplaintStatus.values
      .firstWhere((s) => s.api == value, orElse: () => ComplaintStatus.open);
}

class Complaint {
  const Complaint({
    required this.id,
    required this.subject,
    required this.severity,
    required this.status,
    required this.createdAt,
    required this.providerId,
    required this.providerName,
    this.details,
    this.resolvedAt,
    this.updatedAt,
    this.submittedById,
    this.submittedByName,
    this.submittedByEmail,
    this.submittedByRole,
  });

  final int id;
  final String subject;
  final String? details;
  final ComplaintSeverity severity;
  final ComplaintStatus status;
  final DateTime? resolvedAt;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int providerId;
  final String providerName;
  final int? submittedById;
  final String? submittedByName;
  final String? submittedByEmail;
  final UserRoleModel? submittedByRole;

  factory Complaint.fromJson(Map<String, dynamic> json) {
    final by = asMapOrNull(json['submittedBy']);
    final provider = asMapOrNull(json['provider']);
    return Complaint(
      id: asInt(json['id']),
      subject: asString(json['subject']),
      details: asStringOrNull(json['details']),
      severity: ComplaintSeverity.fromApi(asStringOrNull(json['severity'])),
      status: ComplaintStatus.fromApi(asStringOrNull(json['status'])),
      resolvedAt: asDateOrNull(json['resolvedAt']),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDateOrNull(json['updatedAt']),
      providerId: asInt(provider?['id']),
      providerName: asString(provider?['businessName']),
      submittedById: asIntOrNull(by?['id']),
      submittedByName: asStringOrNull(by?['name']),
      submittedByEmail: asStringOrNull(by?['email']),
      submittedByRole: UserRoleModel.fromApi(asStringOrNull(by?['role'])),
    );
  }
}

// ---------------------------------------------------------------------------
// Users — GET /admin/users, GET /admin/users/:id
// ---------------------------------------------------------------------------

/// A row in the admin user list.
///
/// There is no activate/deactivate or role field to write here: the User
/// model has no status column, and a PROVIDER account is structurally tied
/// to its Provider row, so neither action has a backend to call. Both are
/// reported as gaps rather than faked as disabled buttons.
class AdminUserRow {
  const AdminUserRow({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.createdAt,
    required this.bookingCount,
    required this.reviewCount,
    this.phone,
    this.providerId,
    this.businessName,
    this.providerApproved,
  });

  final int id;
  final String name;
  final String email;
  final UserRoleModel? role;
  final String? phone;
  final DateTime createdAt;
  final int bookingCount;
  final int reviewCount;
  final int? providerId;
  final String? businessName;
  final bool? providerApproved;

  factory AdminUserRow.fromJson(Map<String, dynamic> json) {
    final provider = asMapOrNull(json['provider']);
    final count = asMapOrNull(json['_count']);
    return AdminUserRow(
      id: asInt(json['id']),
      name: asString(json['name']),
      email: asString(json['email']),
      role: UserRoleModel.fromApi(asStringOrNull(json['role'])),
      phone: asStringOrNull(json['phone']),
      createdAt: asDate(json['createdAt']),
      bookingCount: asInt(count?['bookings']),
      reviewCount: asInt(count?['reviews']),
      providerId: asIntOrNull(provider?['id']),
      businessName: asStringOrNull(provider?['businessName']),
      providerApproved: provider == null
          ? null
          : asBool(provider['isApproved']),
    );
  }
}

class AdminUserDetail {
  const AdminUserDetail({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.createdAt,
    required this.bookingCount,
    required this.reviewCount,
    required this.complaintCount,
    required this.recentBookings,
    required this.recentReviews,
    this.phone,
    this.business,
  });

  final int id;
  final String name;
  final String email;
  final UserRoleModel? role;
  final String? phone;
  final DateTime createdAt;
  final int bookingCount;
  final int reviewCount;
  final int complaintCount;
  final List<AdminUserBooking> recentBookings;
  final List<Review> recentReviews;
  final AdminUserBusiness? business;

  factory AdminUserDetail.fromJson(Map<String, dynamic> json) {
    final count = asMapOrNull(json['_count']);
    final provider = asMapOrNull(json['provider']);
    return AdminUserDetail(
      id: asInt(json['id']),
      name: asString(json['name']),
      email: asString(json['email']),
      role: UserRoleModel.fromApi(asStringOrNull(json['role'])),
      phone: asStringOrNull(json['phone']),
      createdAt: asDate(json['createdAt']),
      bookingCount: asInt(count?['bookings']),
      reviewCount: asInt(count?['reviews']),
      complaintCount: asInt(count?['complaints']),
      recentBookings: asMapList(
        json['bookings'],
      ).map(AdminUserBooking.fromJson).toList(),
      // The admin payload omits the nested customer object these rows
      // belong to — it is the user being viewed — so the shared Review
      // parser fills the customer fields with empty values here. Only the
      // rating, comment and date are rendered from this list.
      recentReviews: asMapList(json['reviews']).map(Review.fromJson).toList(),
      business: provider == null ? null : AdminUserBusiness.fromJson(provider),
    );
  }
}

/// A trimmed booking row — the admin user payload carries only the service
/// name, not the full nested provider/customer graph a [Booking] needs.
class AdminUserBooking {
  const AdminUserBooking({
    required this.id,
    required this.status,
    required this.scheduledAt,
    required this.serviceName,
  });

  final int id;
  final BookingStatus status;
  final DateTime scheduledAt;
  final String serviceName;

  factory AdminUserBooking.fromJson(Map<String, dynamic> json) =>
      AdminUserBooking(
        id: asInt(json['id']),
        status: BookingStatus.fromApi(asStringOrNull(json['status'])),
        scheduledAt: asDate(json['scheduledAt']),
        serviceName: asString(asMapOrNull(json['providerService'])?['name']),
      );
}

class AdminUserBusiness {
  const AdminUserBusiness({
    required this.id,
    required this.businessName,
    required this.address,
    required this.isApproved,
    required this.isOpen,
    required this.serviceCount,
    required this.reviewCount,
  });

  final int id;
  final String businessName;
  final String address;
  final bool isApproved;
  final bool isOpen;
  final int serviceCount;
  final int reviewCount;

  factory AdminUserBusiness.fromJson(Map<String, dynamic> json) {
    final count = asMapOrNull(json['_count']);
    return AdminUserBusiness(
      id: asInt(json['id']),
      businessName: asString(json['businessName']),
      address: asString(json['address']),
      isApproved: asBool(json['isApproved']),
      isOpen: asBool(json['isOpen']),
      serviceCount: asInt(count?['services']),
      reviewCount: asInt(count?['reviews']),
    );
  }
}

// ---------------------------------------------------------------------------
// Providers — GET /providers as ADMIN (unapproved rows included)
// ---------------------------------------------------------------------------

/// The admin view of a business. Distinct from [ServiceProvider], which is
/// the customer-facing shape and deliberately has no approval state: an
/// unapproved provider is never returned to a customer at all.
class AdminProviderRow {
  const AdminProviderRow({
    required this.id,
    required this.businessName,
    required this.address,
    required this.isApproved,
    required this.isOpen,
    required this.serviceCount,
    required this.reviewCount,
    required this.queueEntryCount,
    this.description,
    this.ownerName,
    this.ownerEmail,
    this.ownerPhone,
    this.latitude,
    this.longitude,
  });

  final int id;
  final String businessName;
  final String address;
  final String? description;
  final bool isApproved;
  final bool isOpen;
  final int serviceCount;
  final int reviewCount;
  final int queueEntryCount;
  final String? ownerName;
  final String? ownerEmail;
  final String? ownerPhone;
  final double? latitude;
  final double? longitude;

  factory AdminProviderRow.fromJson(Map<String, dynamic> json) {
    final user = asMapOrNull(json['user']);
    final count = asMapOrNull(json['_count']);
    return AdminProviderRow(
      id: asInt(json['id']),
      businessName: asString(json['businessName']),
      address: asString(json['address']),
      description: asStringOrNull(json['description']),
      isApproved: asBool(json['isApproved']),
      isOpen: asBool(json['isOpen']),
      serviceCount: asMapList(json['services']).length,
      reviewCount: asInt(count?['reviews']),
      queueEntryCount: asInt(count?['queueEntries']),
      ownerName: asStringOrNull(user?['name']),
      ownerEmail: asStringOrNull(user?['email']),
      ownerPhone: asStringOrNull(user?['phone']),
      latitude: asDoubleOrNull(json['latitude']),
      longitude: asDoubleOrNull(json['longitude']),
    );
  }

  /// Applies a `provider:status_changed` push. Only the two public
  /// availability fields move; approval and counts stay as fetched.
  AdminProviderRow copyWithStatus({required bool isOpen}) => AdminProviderRow(
    id: id,
    businessName: businessName,
    address: address,
    description: description,
    isApproved: isApproved,
    isOpen: isOpen,
    serviceCount: serviceCount,
    reviewCount: reviewCount,
    queueEntryCount: queueEntryCount,
    ownerName: ownerName,
    ownerEmail: ownerEmail,
    ownerPhone: ownerPhone,
  );
}

// ---------------------------------------------------------------------------
// Reviews — GET /admin/reviews (platform-wide moderation list)
// ---------------------------------------------------------------------------

class AdminReview {
  const AdminReview({
    required this.id,
    required this.rating,
    required this.createdAt,
    required this.providerId,
    required this.providerName,
    this.comment,
    this.bookingId,
    this.customerId,
    this.customerName,
    this.customerEmail,
  });

  final int id;
  final int rating;
  final String? comment;
  final DateTime createdAt;
  final int? bookingId;
  final int providerId;
  final String providerName;
  final int? customerId;
  final String? customerName;
  final String? customerEmail;

  factory AdminReview.fromJson(Map<String, dynamic> json) {
    final customer = asMapOrNull(json['customer']);
    final provider = asMapOrNull(json['provider']);
    return AdminReview(
      id: asInt(json['id']),
      rating: asInt(json['rating']),
      comment: asStringOrNull(json['comment']),
      createdAt: asDate(json['createdAt']),
      bookingId: asIntOrNull(json['bookingId']),
      providerId: asInt(provider?['id']),
      providerName: asString(provider?['businessName']),
      customerId: asIntOrNull(customer?['id']),
      customerName: asStringOrNull(customer?['name']),
      customerEmail: asStringOrNull(customer?['email']),
    );
  }
}

// ---------------------------------------------------------------------------
// Analytics — GET /admin/analytics
// ---------------------------------------------------------------------------

/// Mirrors exactly what `adminService.getAnalytics` returns. There is no
/// revenue, AI, stream, demographic or system-health field because the
/// endpoint has none to give.
class AdminAnalytics {
  const AdminAnalytics({
    required this.range,
    required this.bookings,
    required this.completed,
    required this.cancelled,
    required this.cancellationRate,
    required this.newCustomers,
    required this.newProviders,
    required this.reviewCount,
    required this.bookingTrend,
    required this.userGrowth,
    required this.statusBreakdown,
    required this.popularServices,
    required this.topProviders,
    required this.providerCategories,
    this.since,
    this.averageRating,
  });

  final String range;
  final DateTime? since;
  final int bookings;
  final int completed;
  final int cancelled;
  final double cancellationRate;
  final int newCustomers;
  final int newProviders;
  final int reviewCount;
  final double? averageRating;

  final List<({String label, int count})> bookingTrend;
  final List<({String label, int customers, int providers})> userGrowth;
  final List<({String label, int count})> statusBreakdown;
  final List<({String label, int count})> popularServices;
  final List<({String label, int count})> topProviders;
  final List<({String label, int count})> providerCategories;

  factory AdminAnalytics.fromJson(Map<String, dynamic> json) {
    final summary = asMapOrNull(json['summary']) ?? const {};

    List<({String label, int count})> pairs(
      Object? raw,
      String labelKey,
      String countKey,
    ) => asMapList(raw)
        .map((m) => (label: asString(m[labelKey]), count: asInt(m[countKey])))
        .toList();

    return AdminAnalytics(
      range: asString(json['range'], fallback: '30d'),
      since: asDateOrNull(json['since']),
      bookings: asInt(summary['bookings']),
      completed: asInt(summary['completed']),
      cancelled: asInt(summary['cancelled']),
      cancellationRate: asDouble(summary['cancellationRate']),
      newCustomers: asInt(summary['newCustomers']),
      newProviders: asInt(summary['newProviders']),
      reviewCount: asInt(summary['reviews']),
      averageRating: asDoubleOrNull(summary['averageRating']),
      bookingTrend: pairs(json['bookingTrend'], 'label', 'bookings'),
      userGrowth: asMapList(json['userGrowth'])
          .map(
            (m) => (
              label: asString(m['label']),
              customers: asInt(m['customers']),
              providers: asInt(m['providers']),
            ),
          )
          .toList(),
      statusBreakdown: pairs(json['statusBreakdown'], 'status', 'count'),
      popularServices: pairs(json['popularServices'], 'service', 'bookings'),
      topProviders: pairs(json['topProviders'], 'provider', 'bookings'),
      providerCategories: pairs(
        json['providerCategories'],
        'category',
        'count',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Booking policy — GET/PATCH /admin/booking-policy
// ---------------------------------------------------------------------------

/// Real, enforced platform-wide configuration (see bookingPolicy.service.js)
/// — not merely displayed. availability.service.js and booking.service.js
/// independently reject a booking that violates these values.
class BookingPolicy {
  const BookingPolicy({
    required this.id,
    required this.minAdvanceMinutes,
    required this.maxAdvanceDays,
    required this.allowSameDayBooking,
  });

  final int id;
  final int minAdvanceMinutes;
  final int maxAdvanceDays;
  final bool allowSameDayBooking;

  factory BookingPolicy.fromJson(Map<String, dynamic> json) => BookingPolicy(
    id: asInt(json['id']),
    minAdvanceMinutes: asInt(json['minAdvanceMinutes']),
    maxAdvanceDays: asInt(json['maxAdvanceDays']),
    allowSameDayBooking: asBool(json['allowSameDayBooking'], fallback: true),
  );
}

// ---------------------------------------------------------------------------
// Audit log — GET /admin/audit-log (read-only)
// ---------------------------------------------------------------------------

class AuditLogEntry {
  const AuditLogEntry({
    required this.id,
    required this.action,
    required this.entityType,
    required this.entityId,
    required this.metadata,
    required this.createdAt,
    required this.adminName,
    required this.adminEmail,
  });

  final int id;
  final String action;
  final String entityType;
  final int? entityId;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final String adminName;
  final String adminEmail;

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    final admin = asMapOrNull(json['admin']) ?? const {};
    return AuditLogEntry(
      id: asInt(json['id']),
      action: asString(json['action']),
      entityType: asString(json['entityType']),
      entityId: asIntOrNull(json['entityId']),
      metadata: asMapOrNull(json['metadata']) ?? const {},
      createdAt: asDate(json['createdAt']),
      adminName: asString(admin['name']),
      adminEmail: asString(admin['email']),
    );
  }
}

class AuditLogPage {
  const AuditLogPage({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.totalPages,
  });

  final List<AuditLogEntry> items;
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  factory AuditLogPage.fromJson(Map<String, dynamic> json) => AuditLogPage(
    items: asMapList(
      json['items'],
    ).map(AuditLogEntry.fromJson).toList(),
    page: asInt(json['page']),
    pageSize: asInt(json['pageSize']),
    total: asInt(json['total']),
    totalPages: asInt(json['totalPages']),
  );
}
