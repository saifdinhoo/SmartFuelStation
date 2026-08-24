import 'dart:math' as math;

import 'parsing.dart';

export 'parsing.dart';

/// Typed mirrors of the Prisma models, parsed once at the API boundary so
/// screens never index into `Map<String, dynamic>`.

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

enum UserRoleModel {
  customer,
  provider,
  admin;

  static UserRoleModel? fromApi(String? value) => switch (value) {
    'CUSTOMER' => UserRoleModel.customer,
    'PROVIDER' => UserRoleModel.provider,
    'ADMIN' => UserRoleModel.admin,
    _ => null,
  };
}

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
  });

  final int id;
  final String name;
  final String email;
  final UserRoleModel? role;
  final String? phone;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: asInt(json['id']),
    name: asString(json['name']),
    email: asString(json['email']),
    role: UserRoleModel.fromApi(asStringOrNull(json['role'])),
    phone: asStringOrNull(json['phone']),
  );
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

class ServiceCategory {
  const ServiceCategory({
    required this.id,
    required this.name,
    this.description,
    this.isActive = true,
  });

  final int id;
  final String name;
  final String? description;
  final bool isActive;

  factory ServiceCategory.fromJson(Map<String, dynamic> json) =>
      ServiceCategory(
        id: asInt(json['id']),
        name: asString(json['name']),
        description: asStringOrNull(json['description']),
        isActive: asBool(json['isActive'], fallback: true),
      );
}

class ProviderService {
  const ProviderService({
    required this.id,
    required this.name,
    required this.price,
    required this.durationMinutes,
    required this.isAvailable,
    required this.categoryId,
    required this.categoryName,
  });

  final int id;
  final String name;

  /// Prisma Decimal — arrives as a string, widened to double here.
  final double price;
  final int durationMinutes;
  final bool isAvailable;
  final int categoryId;
  final String categoryName;

  factory ProviderService.fromJson(Map<String, dynamic> json) {
    final category = asMapOrNull(json['category']);
    return ProviderService(
      id: asInt(json['id']),
      name: asString(json['name']),
      price: asDouble(json['price']),
      durationMinutes: asInt(json['durationMinutes']),
      isAvailable: asBool(json['isAvailable'], fallback: true),
      categoryId: asInt(json['categoryId'] ?? category?['id']),
      categoryName: asString(category?['name']),
    );
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

class ServiceProvider {
  const ServiceProvider({
    required this.id,
    required this.businessName,
    required this.address,
    required this.isOpen,
    required this.estimatedWaitMinutes,
    required this.services,
    required this.reviewCount,
    this.description,
    this.latitude,
    this.longitude,
    this.phone,
    this.distanceKm,
  });

  final int id;
  final String businessName;
  final String address;
  final String? description;
  final bool isOpen;
  final double? latitude;
  final double? longitude;
  final int estimatedWaitMinutes;
  final List<ProviderService> services;
  final int reviewCount;
  final String? phone;

  /// Filled in client-side once device location is known; null when
  /// location is unavailable or the provider has no coordinates.
  final double? distanceKm;

  List<ProviderService> get bookableServices =>
      services.where((s) => s.isAvailable).toList();

  /// Cheapest bookable service, used for the "lowest price" sort. Null when
  /// nothing is bookable, which sorts such providers last.
  double? get lowestPrice {
    final prices = bookableServices.map((s) => s.price);
    return prices.isEmpty ? null : prices.reduce(math.min);
  }

  factory ServiceProvider.fromJson(Map<String, dynamic> json) {
    final user = asMapOrNull(json['user']);
    final count = asMapOrNull(json['_count']);
    return ServiceProvider(
      id: asInt(json['id']),
      businessName: asString(json['businessName']),
      address: asString(json['address']),
      description: asStringOrNull(json['description']),
      isOpen: asBool(json['isOpen']),
      latitude: asDoubleOrNull(json['latitude']),
      longitude: asDoubleOrNull(json['longitude']),
      estimatedWaitMinutes: asInt(json['estimatedWaitMinutes']),
      services: asMapList(
        json['services'],
      ).map(ProviderService.fromJson).toList(),
      reviewCount: asInt(count?['reviews']),
      phone: asStringOrNull(user?['phone']),
    );
  }

  /// Applies a `provider:status_changed` push. Only the public availability
  /// fields move; services, address and everything else stay as fetched.
  ServiceProvider copyWithStatus({
    required bool isOpen,
    required int estimatedWaitMinutes,
  }) => ServiceProvider(
    id: id,
    businessName: businessName,
    address: address,
    description: description,
    isOpen: isOpen,
    latitude: latitude,
    longitude: longitude,
    estimatedWaitMinutes: estimatedWaitMinutes,
    services: services,
    reviewCount: reviewCount,
    phone: phone,
    distanceKm: distanceKm,
  );

  ServiceProvider copyWithDistance(double? km) => ServiceProvider(
    id: id,
    businessName: businessName,
    address: address,
    description: description,
    isOpen: isOpen,
    latitude: latitude,
    longitude: longitude,
    estimatedWaitMinutes: estimatedWaitMinutes,
    services: services,
    reviewCount: reviewCount,
    phone: phone,
    distanceKm: km,
  );
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

class Review {
  const Review({
    required this.id,
    required this.rating,
    required this.createdAt,
    required this.customerId,
    required this.customerName,
    this.comment,
    this.bookingId,
  });

  final int id;
  final int rating;
  final String? comment;
  final DateTime createdAt;
  final int customerId;
  final String customerName;
  final int? bookingId;

  factory Review.fromJson(Map<String, dynamic> json) {
    final customer = asMapOrNull(json['customer']);
    return Review(
      id: asInt(json['id']),
      rating: asInt(json['rating']),
      comment: asStringOrNull(json['comment']),
      createdAt: asDate(json['createdAt']),
      customerId: asInt(customer?['id']),
      customerName: asString(customer?['name']),
      bookingId: asIntOrNull(json['bookingId']),
    );
  }
}

/// Server-side Prisma aggregation — never computed on the client.
/// [averageRating] is null when the provider has no reviews at all, which
/// must render as a dash rather than 0.0.
class RatingSummary {
  const RatingSummary({required this.averageRating, required this.reviewCount});

  final double? averageRating;
  final int reviewCount;

  static const empty = RatingSummary(averageRating: null, reviewCount: 0);

  factory RatingSummary.fromJson(Map<String, dynamic> json) => RatingSummary(
    averageRating: asDoubleOrNull(json['averageRating']),
    reviewCount: asInt(json['reviewCount']),
  );
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

enum BookingStatus {
  pending,
  confirmed,
  arrived,
  inQueue,
  inService,
  completed,
  cancelled,
  rejected;

  static BookingStatus fromApi(String? value) => switch (value) {
    'PENDING' => BookingStatus.pending,
    'CONFIRMED' => BookingStatus.confirmed,
    'ARRIVED' => BookingStatus.arrived,
    'IN_QUEUE' => BookingStatus.inQueue,
    'IN_SERVICE' => BookingStatus.inService,
    'COMPLETED' => BookingStatus.completed,
    'CANCELLED' => BookingStatus.cancelled,
    'REJECTED' => BookingStatus.rejected,
    _ => BookingStatus.pending,
  };

  /// The normal forward path, used to draw the status timeline.
  /// CANCELLED/REJECTED are terminal exits shown separately.
  static const lifecycle = [
    BookingStatus.pending,
    BookingStatus.confirmed,
    BookingStatus.arrived,
    BookingStatus.inQueue,
    BookingStatus.inService,
    BookingStatus.completed,
  ];

  bool get isTerminal =>
      this == BookingStatus.completed ||
      this == BookingStatus.cancelled ||
      this == BookingStatus.rejected;

  /// Matches the backend transition table: a customer may only self-cancel
  /// before arriving. After that it is a front-desk action.
  bool get customerCanCancel =>
      this == BookingStatus.pending || this == BookingStatus.confirmed;
}

class Booking {
  const Booking({
    required this.id,
    required this.status,
    required this.scheduledAt,
    required this.priceAtBooking,
    required this.customerId,
    required this.customerName,
    required this.providerServiceId,
    required this.serviceName,
    required this.serviceDurationMinutes,
    required this.categoryName,
    required this.providerId,
    required this.providerName,
    required this.providerAddress,
    required this.createdAt,
    this.notes,
    this.completedAt,
    this.cancelledAt,
    this.hasReview = false,
  });

  final int id;
  final BookingStatus status;
  final DateTime scheduledAt;
  final double priceAtBooking;
  final int customerId;
  final String customerName;
  final int providerServiceId;
  final String serviceName;
  final int serviceDurationMinutes;
  final String categoryName;
  final int providerId;
  final String providerName;
  final String providerAddress;
  final DateTime createdAt;
  final String? notes;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final bool hasReview;

  /// A completed booking can be reviewed exactly once (enforced by a unique
  /// index on Review.bookingId). GET /bookings does not include the review
  /// relation, so this stays false there and is resolved against the
  /// customer's own review list instead.
  bool get isReviewable => status == BookingStatus.completed && !hasReview;

  factory Booking.fromJson(Map<String, dynamic> json) {
    final service = asMapOrNull(json['providerService']);
    final provider = asMapOrNull(service?['provider']);
    final category = asMapOrNull(service?['category']);
    final customer = asMapOrNull(json['customer']);
    return Booking(
      id: asInt(json['id']),
      status: BookingStatus.fromApi(asStringOrNull(json['status'])),
      scheduledAt: asDate(json['scheduledAt']),
      priceAtBooking: asDouble(json['priceAtBooking']),
      customerId: asInt(json['customerId']),
      customerName: asString(customer?['name']),
      providerServiceId: asInt(json['providerServiceId']),
      serviceName: asString(service?['name']),
      serviceDurationMinutes: asInt(service?['durationMinutes']),
      categoryName: asString(category?['name']),
      providerId: asInt(provider?['id']),
      providerName: asString(provider?['businessName']),
      providerAddress: asString(provider?['address']),
      createdAt: asDate(json['createdAt']),
      notes: asStringOrNull(json['notes']),
      completedAt: asDateOrNull(json['completedAt']),
      cancelledAt: asDateOrNull(json['cancelledAt']),
      hasReview: json['review'] != null,
    );
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

enum QueueStatus {
  waiting,
  inService,
  completed,
  cancelled;

  static QueueStatus fromApi(String? value) => switch (value) {
    'WAITING' => QueueStatus.waiting,
    'IN_SERVICE' => QueueStatus.inService,
    'COMPLETED' => QueueStatus.completed,
    'CANCELLED' => QueueStatus.cancelled,
    _ => QueueStatus.waiting,
  };

  bool get isActive =>
      this == QueueStatus.waiting || this == QueueStatus.inService;
}

/// A row from GET /queue.
///
/// Serves both callers. For a CUSTOMER the backend scopes the response to
/// their own entries, so no other customer's identity is present to begin
/// with. For a PROVIDER it is their whole line, which additionally carries
/// [customerName] and [position] — fields a customer's own payload does not
/// include, hence both being optional here.
class QueueEntry {
  const QueueEntry({
    required this.id,
    required this.status,
    required this.providerId,
    required this.providerName,
    required this.serviceName,
    required this.joinedAt,
    this.bookingId,
    this.bookingStatus,
    this.estimatedWaitMinutes,
    this.customersAhead,
    this.startedAt,
    this.completedAt,
    this.customerName,
    this.queuePosition,
  });

  /// Present only on the provider's view of the line.
  final String? customerName;

  /// The stored `position` column, used for reordering. Distinct from
  /// [position], which is the customer-facing "you are #N" derived from
  /// customersAhead.
  final int? queuePosition;

  final int id;
  final QueueStatus status;
  final int providerId;
  final String providerName;
  final String serviceName;
  final DateTime joinedAt;
  final int? bookingId;
  final BookingStatus? bookingStatus;
  final int? estimatedWaitMinutes;
  final int? customersAhead;
  final DateTime? startedAt;
  final DateTime? completedAt;

  /// 1-based place in line. Only meaningful while waiting.
  int? get position => customersAhead == null ? null : customersAhead! + 1;

  factory QueueEntry.fromJson(Map<String, dynamic> json) {
    final provider = asMapOrNull(json['provider']);
    final service = asMapOrNull(json['providerService']);
    final booking = asMapOrNull(json['booking']);
    return QueueEntry(
      id: asInt(json['id']),
      status: QueueStatus.fromApi(asStringOrNull(json['status'])),
      providerId: asInt(json['providerId'] ?? provider?['id']),
      providerName: asString(provider?['businessName']),
      serviceName: asString(service?['name']),
      joinedAt: asDate(json['joinedAt']),
      bookingId: asIntOrNull(json['bookingId']),
      bookingStatus: booking == null
          ? null
          : BookingStatus.fromApi(asStringOrNull(booking['status'])),
      estimatedWaitMinutes: asIntOrNull(json['estimatedWaitMinutes']),
      customersAhead: asIntOrNull(json['customersAhead']),
      startedAt: asDateOrNull(json['startedAt']),
      completedAt: asDateOrNull(json['completedAt']),
      customerName: asStringOrNull(json['customerName']),
      queuePosition: asIntOrNull(json['position']),
    );
  }
}

// ---------------------------------------------------------------------------
// Provider self-service
// ---------------------------------------------------------------------------

/// GET /providers/me — the provider's own business record, including the
/// private fields their profile screen edits.
class OwnProviderProfile {
  const OwnProviderProfile({
    required this.id,
    required this.businessName,
    required this.address,
    required this.isApproved,
    required this.isOpen,
    required this.estimatedWaitMinutes,
    required this.services,
    required this.rating,
    required this.contactName,
    required this.email,
    this.description,
    this.latitude,
    this.longitude,
    this.phone,
  });

  final int id;
  final String businessName;
  final String address;
  final String? description;
  final bool isApproved;
  final bool isOpen;
  final double? latitude;
  final double? longitude;
  final int estimatedWaitMinutes;
  final List<ProviderService> services;
  final RatingSummary rating;
  final String contactName;
  final String email;
  final String? phone;

  factory OwnProviderProfile.fromJson(Map<String, dynamic> json) {
    final user = asMapOrNull(json['user']);
    final rating = asMapOrNull(json['rating']);
    return OwnProviderProfile(
      id: asInt(json['id']),
      businessName: asString(json['businessName']),
      address: asString(json['address']),
      description: asStringOrNull(json['description']),
      isApproved: asBool(json['isApproved']),
      isOpen: asBool(json['isOpen']),
      latitude: asDoubleOrNull(json['latitude']),
      longitude: asDoubleOrNull(json['longitude']),
      estimatedWaitMinutes: asInt(json['estimatedWaitMinutes']),
      services: asMapList(
        json['services'],
      ).map(ProviderService.fromJson).toList(),
      rating: rating == null
          ? RatingSummary.empty
          : RatingSummary.fromJson(rating),
      contactName: asString(user?['name']),
      email: asString(user?['email']),
      phone: asStringOrNull(user?['phone']),
    );
  }
}

/// GET /providers/me/analytics. Every field is computed server-side from
/// real rows — there is deliberately no revenue or "insight" figure,
/// because nothing in the database backs one.
class ProviderAnalytics {
  const ProviderAnalytics({
    required this.range,
    required this.totalBookings,
    required this.completedBookings,
    required this.cancelledBookings,
    required this.cancellationRate,
    required this.averageWaitMinutes,
    required this.reviewCount,
    required this.queueEntriesHandled,
    required this.popularServices,
    required this.busyHours,
    required this.statusBreakdown,
    required this.ratingDistribution,
    this.averageRating,
  });

  final String range;
  final int totalBookings;
  final int completedBookings;
  final int cancelledBookings;
  final double cancellationRate;
  final int averageWaitMinutes;
  final double? averageRating;
  final int reviewCount;
  final int queueEntriesHandled;
  final List<({String label, int count})> popularServices;
  final List<({String label, int count})> busyHours;
  final List<({String label, int count})> statusBreakdown;
  final List<({int stars, int count})> ratingDistribution;

  factory ProviderAnalytics.fromJson(Map<String, dynamic> json) {
    final summary = asMapOrNull(json['summary']) ?? const {};

    List<({String label, int count})> pairs(
      Object? raw,
      String labelKey,
      String countKey,
    ) => asMapList(raw)
        .map((m) => (label: asString(m[labelKey]), count: asInt(m[countKey])))
        .toList();

    return ProviderAnalytics(
      range: asString(json['range'], fallback: '30d'),
      totalBookings: asInt(summary['totalBookings']),
      completedBookings: asInt(summary['completedBookings']),
      cancelledBookings: asInt(summary['cancelledBookings']),
      cancellationRate: asDouble(summary['cancellationRate']),
      averageWaitMinutes: asInt(summary['averageWaitMinutes']),
      averageRating: asDoubleOrNull(summary['averageRating']),
      reviewCount: asInt(summary['reviewCount']),
      queueEntriesHandled: asInt(summary['queueEntriesHandled']),
      popularServices: pairs(json['popularServices'], 'service', 'bookings'),
      busyHours: pairs(json['busyHours'], 'hour', 'bookings'),
      statusBreakdown: pairs(json['statusBreakdown'], 'status', 'count'),
      ratingDistribution: asMapList(json['ratingDistribution'])
          .map((m) => (stars: asInt(m['stars']), count: asInt(m['count'])))
          .toList(),
    );
  }
}

/// GET /queue/summary/:providerId — aggregate only, safe for any browsing
/// customer (no entry-level detail, no other customer's identity).
class QueueSummary {
  const QueueSummary({
    required this.providerId,
    required this.queueLength,
    required this.estimatedWaitMinutes,
  });

  final int providerId;
  final int queueLength;
  final int estimatedWaitMinutes;

  factory QueueSummary.fromJson(Map<String, dynamic> json) => QueueSummary(
    providerId: asInt(json['providerId']),
    queueLength: asInt(json['queueLength']),
    estimatedWaitMinutes: asInt(json['estimatedWaitMinutes']),
  );
}
