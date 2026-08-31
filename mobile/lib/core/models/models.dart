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
    this.liveCameraEnabled = false,
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

  /// Whether this provider has a live camera at all (GET /providers
  /// includes the raw column). Does not mean a stream is actually
  /// watchable right now — that is what GET /providers/:id/live-camera's
  /// `status` is for, fetched separately once a customer opens the feature.
  final bool liveCameraEnabled;

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
      liveCameraEnabled: asBool(json['liveCameraEnabled']),
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
    liveCameraEnabled: liveCameraEnabled,
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
    liveCameraEnabled: liveCameraEnabled,
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
// Operating hours & availability
// ---------------------------------------------------------------------------

enum DayOfWeekModel {
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday;

  static DayOfWeekModel fromApi(String? value) => switch (value) {
    'MONDAY' => monday,
    'TUESDAY' => tuesday,
    'WEDNESDAY' => wednesday,
    'THURSDAY' => thursday,
    'FRIDAY' => friday,
    'SATURDAY' => saturday,
    _ => sunday,
  };

  /// The exact enum value the backend expects back on PUT
  /// /providers/me/hours.
  String get api => switch (this) {
    monday => 'MONDAY',
    tuesday => 'TUESDAY',
    wednesday => 'WEDNESDAY',
    thursday => 'THURSDAY',
    friday => 'FRIDAY',
    saturday => 'SATURDAY',
    sunday => 'SUNDAY',
  };

  /// Matches the Prisma enum's own declaration order, which is also the
  /// order GET /providers/:id/hours already returns.
  static const week = [
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
  ];
}

/// One weekday's row from GET /providers/:id/hours or
/// GET|PUT /providers/me/hours.
class OperatingHour {
  const OperatingHour({
    required this.dayOfWeek,
    required this.isClosed,
    this.openTime,
    this.closeTime,
  });

  final DayOfWeekModel dayOfWeek;
  final bool isClosed;

  /// "HH:mm", 24-hour, local wall-clock time. Null exactly when [isClosed]
  /// is true — the backend forces this pairing server-side too.
  final String? openTime;
  final String? closeTime;

  factory OperatingHour.fromJson(Map<String, dynamic> json) => OperatingHour(
    dayOfWeek: DayOfWeekModel.fromApi(asStringOrNull(json['dayOfWeek'])),
    isClosed: asBool(json['isClosed']),
    openTime: asStringOrNull(json['openTime']),
    closeTime: asStringOrNull(json['closeTime']),
  );

  Map<String, dynamic> toJson() => {
    'dayOfWeek': dayOfWeek.api,
    'isClosed': isClosed,
    'openTime': isClosed ? null : openTime,
    'closeTime': isClosed ? null : closeTime,
  };
}

enum SlotStatusModel {
  available,
  booked,
  past;

  static SlotStatusModel fromApi(String? value) => switch (value) {
    'AVAILABLE' => available,
    'BOOKED' => booked,
    _ => past,
  };
}

/// One candidate booking start from GET /providers/:id/availability.
///
/// Carries no customer identity or booking id — the backend never sends
/// either, even for a BOOKED slot, so there is nothing here that could leak
/// who holds it.
class AvailabilitySlot {
  const AvailabilitySlot({
    required this.startTime,
    required this.endTime,
    required this.status,
  });

  final String startTime;
  final String endTime;
  final SlotStatusModel status;

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) =>
      AvailabilitySlot(
        startTime: asString(json['startTime']),
        endTime: asString(json['endTime']),
        status: SlotStatusModel.fromApi(asStringOrNull(json['status'])),
      );
}

enum AvailabilityStatusModel {
  open,
  closed,
  hoursNotConfigured;

  static AvailabilityStatusModel fromApi(String? value) => switch (value) {
    'OPEN' => open,
    'CLOSED' => closed,
    _ => hoursNotConfigured,
  };
}

/// GET /providers/:id/availability?serviceId=&date=. Backend-authoritative
/// — the booking sheet never computes slots itself, only renders these.
class Availability {
  const Availability({
    required this.providerId,
    required this.serviceId,
    required this.date,
    required this.status,
    required this.serviceDurationMinutes,
    required this.slots,
    this.openingTime,
    this.closingTime,
  });

  final int providerId;
  final int serviceId;

  /// "YYYY-MM-DD", the same local calendar date that was requested.
  final String date;
  final AvailabilityStatusModel status;
  final String? openingTime;
  final String? closingTime;
  final int serviceDurationMinutes;
  final List<AvailabilitySlot> slots;

  factory Availability.fromJson(Map<String, dynamic> json) => Availability(
    providerId: asInt(json['providerId']),
    serviceId: asInt(json['serviceId']),
    date: asString(json['date']),
    status: AvailabilityStatusModel.fromApi(asStringOrNull(json['status'])),
    openingTime: asStringOrNull(json['openingTime']),
    closingTime: asStringOrNull(json['closingTime']),
    serviceDurationMinutes: asInt(json['serviceDurationMinutes']),
    slots: asMapList(json['slots']).map(AvailabilitySlot.fromJson).toList(),
  );
}

// ---------------------------------------------------------------------------
// Fuel inventory
// ---------------------------------------------------------------------------

enum FuelTypeModel {
  gasoline95,
  gasoline98,
  diesel;

  static FuelTypeModel fromApi(String? value) => switch (value) {
    'GASOLINE_98' => gasoline98,
    'DIESEL' => diesel,
    _ => gasoline95,
  };

  String get api => switch (this) {
    gasoline95 => 'GASOLINE_95',
    gasoline98 => 'GASOLINE_98',
    diesel => 'DIESEL',
  };
}

/// Public/provider-own shape from GET /providers/:id/fuel,
/// /providers/me/fuel. Never carries updatedByAdminId or any other audit
/// field — that is exactly what separates this from
/// [AdminFuelInventoryItem].
class FuelInventoryItem {
  const FuelInventoryItem({
    required this.fuelType,
    required this.displayName,
    required this.capacityLiters,
    required this.currentLiters,
    required this.percentageRemaining,
    required this.updatedAt,
    this.pricePerLiter,
  });

  final FuelTypeModel fuelType;
  final String displayName;
  final double capacityLiters;
  final double currentLiters;
  final double percentageRemaining;
  final double? pricePerLiter;
  final DateTime updatedAt;

  factory FuelInventoryItem.fromJson(Map<String, dynamic> json) => FuelInventoryItem(
    fuelType: FuelTypeModel.fromApi(asStringOrNull(json['fuelType'])),
    displayName: asString(json['displayName']),
    capacityLiters: asDouble(json['capacityLiters']),
    currentLiters: asDouble(json['currentLiters']),
    percentageRemaining: asDouble(json['percentageRemaining']),
    pricePerLiter: asDoubleOrNull(json['pricePerLiter']),
    updatedAt: asDate(json['updatedAt']),
  );
}

/// Admin-only shape from GET /admin/providers/:id/fuel — the same public
/// fields plus who last changed it.
class AdminFuelInventoryItem extends FuelInventoryItem {
  const AdminFuelInventoryItem({
    required super.fuelType,
    required super.displayName,
    required super.capacityLiters,
    required super.currentLiters,
    required super.percentageRemaining,
    required super.updatedAt,
    required this.id,
    required this.providerId,
    this.updatedByAdminId,
    this.updatedByAdminName,
    super.pricePerLiter,
  });

  final int id;
  final int providerId;
  final int? updatedByAdminId;
  final String? updatedByAdminName;

  factory AdminFuelInventoryItem.fromJson(Map<String, dynamic> json) => AdminFuelInventoryItem(
    fuelType: FuelTypeModel.fromApi(asStringOrNull(json['fuelType'])),
    displayName: asString(json['displayName']),
    capacityLiters: asDouble(json['capacityLiters']),
    currentLiters: asDouble(json['currentLiters']),
    percentageRemaining: asDouble(json['percentageRemaining']),
    pricePerLiter: asDoubleOrNull(json['pricePerLiter']),
    updatedAt: asDate(json['updatedAt']),
    id: asInt(json['id']),
    providerId: asInt(json['providerId']),
    updatedByAdminId: asIntOrNull(json['updatedByAdminId']),
    updatedByAdminName: asStringOrNull(json['updatedByAdminName']),
  );
}

/// One real chart point from GET /providers/:id/fuel/history — never a
/// customer/admin identity, only what a chart needs.
class FuelHistoryPoint {
  const FuelHistoryPoint({
    required this.fuelType,
    required this.liters,
    required this.timestamp,
  });

  final FuelTypeModel fuelType;
  final double liters;
  final DateTime timestamp;

  factory FuelHistoryPoint.fromJson(Map<String, dynamic> json) => FuelHistoryPoint(
    fuelType: FuelTypeModel.fromApi(asStringOrNull(json['fuelType'])),
    liters: asDouble(json['liters']),
    timestamp: asDate(json['timestamp']),
  );
}

/// One row of the Admin-only audit trail from
/// GET /admin/providers/:id/fuel/history.
class AdminFuelHistoryEntry {
  const AdminFuelHistoryEntry({
    required this.id,
    required this.fuelType,
    required this.previousLiters,
    required this.newLiters,
    required this.changedByAdminId,
    required this.changedByAdminName,
    required this.createdAt,
    this.previousCapacityLiters,
    this.newCapacityLiters,
    this.previousPricePerLiter,
    this.newPricePerLiter,
  });

  final int id;
  final FuelTypeModel fuelType;
  final double previousLiters;
  final double newLiters;
  final double? previousCapacityLiters;
  final double? newCapacityLiters;
  final double? previousPricePerLiter;
  final double? newPricePerLiter;
  final int changedByAdminId;
  final String changedByAdminName;
  final DateTime createdAt;

  factory AdminFuelHistoryEntry.fromJson(Map<String, dynamic> json) => AdminFuelHistoryEntry(
    id: asInt(json['id']),
    fuelType: FuelTypeModel.fromApi(asStringOrNull(json['fuelType'])),
    previousLiters: asDouble(json['previousLiters']),
    newLiters: asDouble(json['newLiters']),
    previousCapacityLiters: asDoubleOrNull(json['previousCapacityLiters']),
    newCapacityLiters: asDoubleOrNull(json['newCapacityLiters']),
    previousPricePerLiter: asDoubleOrNull(json['previousPricePerLiter']),
    newPricePerLiter: asDoubleOrNull(json['newPricePerLiter']),
    changedByAdminId: asInt(json['changedByAdminId']),
    changedByAdminName: asString(json['changedByAdminName']),
    createdAt: asDate(json['createdAt']),
  );
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

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

enum NotificationType {
  bookingCreated,
  bookingConfirmed,
  bookingRejected,
  bookingCancelled,
  queueJoined,
  queueAlmostTurn,
  serviceStarted,
  serviceCompleted,
  newReview,
  providerRegistered,
  providerApproved,
  providerRejected,
  unknown;

  static NotificationType fromApi(String? value) => switch (value) {
    'BOOKING_CREATED' => NotificationType.bookingCreated,
    'BOOKING_CONFIRMED' => NotificationType.bookingConfirmed,
    'BOOKING_REJECTED' => NotificationType.bookingRejected,
    'BOOKING_CANCELLED' => NotificationType.bookingCancelled,
    'QUEUE_JOINED' => NotificationType.queueJoined,
    'QUEUE_ALMOST_TURN' => NotificationType.queueAlmostTurn,
    'SERVICE_STARTED' => NotificationType.serviceStarted,
    'SERVICE_COMPLETED' => NotificationType.serviceCompleted,
    'NEW_REVIEW' => NotificationType.newReview,
    'PROVIDER_REGISTERED' => NotificationType.providerRegistered,
    'PROVIDER_APPROVED' => NotificationType.providerApproved,
    'PROVIDER_REJECTED' => NotificationType.providerRejected,
    _ => NotificationType.unknown,
  };
}

/// A row from GET /notifications. The title/message text is generated
/// server-side per business event — this model never re-derives copy from
/// [type] itself, it just renders what the backend already wrote.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.relatedBookingId,
    this.relatedProviderId,
    this.relatedReviewId,
    this.relatedQueueEntryId,
  });

  final int id;
  final NotificationType type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;
  final int? relatedBookingId;
  final int? relatedProviderId;
  final int? relatedReviewId;
  final int? relatedQueueEntryId;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: asInt(json['id']),
        type: NotificationType.fromApi(asStringOrNull(json['type'])),
        title: asString(json['title']),
        message: asString(json['message']),
        isRead: asBool(json['isRead']),
        createdAt: asDate(json['createdAt']),
        relatedBookingId: asIntOrNull(json['relatedBookingId']),
        relatedProviderId: asIntOrNull(json['relatedProviderId']),
        relatedReviewId: asIntOrNull(json['relatedReviewId']),
        relatedQueueEntryId: asIntOrNull(json['relatedQueueEntryId']),
      );

  AppNotification copyWithRead(bool read) => AppNotification(
    id: id,
    type: type,
    title: title,
    message: message,
    isRead: read,
    createdAt: createdAt,
    relatedBookingId: relatedBookingId,
    relatedProviderId: relatedProviderId,
    relatedReviewId: relatedReviewId,
    relatedQueueEntryId: relatedQueueEntryId,
  );
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

// ---------------------------------------------------------------------------
// Finance / commission ledger (Phase D)
// ---------------------------------------------------------------------------
//
// Every money field below is a real Prisma Decimal computed server-side from
// completed bookings — there is no client-side arithmetic on money anywhere
// in this app, only formatting.

/// One point of GET .../finance/summary's `trend` array — real recorded
/// figures for one day in the requested window, never interpolated.
class FinanceTrendPoint {
  const FinanceTrendPoint({
    required this.label,
    required this.gross,
    required this.commission,
    required this.net,
  });

  /// "YYYY-MM-DD".
  final String label;
  final double gross;
  final double commission;
  final double net;

  factory FinanceTrendPoint.fromJson(Map<String, dynamic> json) =>
      FinanceTrendPoint(
        label: asString(json['label']),
        gross: asDouble(json['gross']),
        commission: asDouble(json['commission']),
        net: asDouble(json['net']),
      );
}

/// One flexible shape covering all three summary endpoints
/// (GET /admin/finance/summary, GET /admin/finance/providers/:id,
/// GET /providers/me/finance/summary) rather than three near-identical
/// classes: [transactionCount] is set only by the platform-wide admin
/// summary, and [providerId]/[commissionRate] only when the summary is
/// scoped to one provider ([providerName] additionally only on the admin
/// side, since a provider's own summary already knows who it is). Every
/// other field — including [trend] — is shared by all three.
///
/// Every total except [trend] is all-time; only [trend] is windowed by
/// [range].
class FinanceSummary {
  const FinanceSummary({
    required this.range,
    required this.grossServiceValue,
    required this.platformCommissionRevenue,
    required this.providerNetEarnings,
    required this.pendingSettlementAmount,
    required this.settledAmount,
    required this.trend,
    this.transactionCount,
    this.providerId,
    this.providerName,
    this.commissionRate,
  });

  final String range;
  final double grossServiceValue;
  final double platformCommissionRevenue;
  final double providerNetEarnings;
  final double pendingSettlementAmount;
  final double settledAmount;
  final List<FinanceTrendPoint> trend;

  /// Platform-wide admin summary only.
  final int? transactionCount;

  /// Set when this summary is scoped to one provider.
  final int? providerId;

  /// Admin per-provider summary only.
  final String? providerName;
  final double? commissionRate;

  factory FinanceSummary.fromJson(Map<String, dynamic> json) =>
      FinanceSummary(
        range: asString(json['range'], fallback: '30d'),
        grossServiceValue: asDouble(json['grossServiceValue']),
        platformCommissionRevenue: asDouble(json['platformCommissionRevenue']),
        providerNetEarnings: asDouble(json['providerNetEarnings']),
        pendingSettlementAmount: asDouble(json['pendingSettlementAmount']),
        settledAmount: asDouble(json['settledAmount']),
        trend: asMapList(
          json['trend'],
        ).map(FinanceTrendPoint.fromJson).toList(),
        transactionCount: asIntOrNull(json['transactionCount']),
        providerId: asIntOrNull(json['providerId']),
        providerName: asStringOrNull(json['providerName']),
        commissionRate: asDoubleOrNull(json['commissionRate']),
      );
}

enum SettlementStatusModel {
  pending,
  settled;

  static SettlementStatusModel fromApi(String? value) => switch (value) {
    'SETTLED' => settled,
    _ => pending,
  };

  String get api => switch (this) {
    pending => 'PENDING',
    settled => 'SETTLED',
  };
}

/// The linked booking, trimmed to what a transaction row displays — never
/// the full [Booking] graph, which this payload does not carry.
class FinanceBookingRef {
  const FinanceBookingRef({
    required this.id,
    required this.status,
    required this.scheduledAt,
    required this.serviceName,
  });

  final int id;
  final BookingStatus status;
  final DateTime scheduledAt;
  final String serviceName;

  factory FinanceBookingRef.fromJson(Map<String, dynamic> json) =>
      FinanceBookingRef(
        id: asInt(json['id']),
        status: BookingStatus.fromApi(asStringOrNull(json['status'])),
        scheduledAt: asDate(json['scheduledAt']),
        serviceName: asString(json['serviceName']),
      );
}

/// Provider-safe shape from GET /providers/me/finance/transactions. Never
/// carries providerId/providerName (a provider's own list already implies
/// whose it is) or settledByAdminId/settledByAdminName — a provider must
/// never see internal admin identity. See [AdminFinanceTransaction] for the
/// admin shape, exactly the split [FuelInventoryItem]/[AdminFuelInventoryItem]
/// already draw.
class FinanceTransaction {
  const FinanceTransaction({
    required this.id,
    required this.bookingId,
    required this.grossAmount,
    required this.commissionRate,
    required this.commissionAmount,
    required this.providerNetAmount,
    required this.settlementStatus,
    required this.createdAt,
    this.settledAt,
    this.updatedAt,
    this.booking,
  });

  final int id;
  final int bookingId;
  final double grossAmount;
  final double commissionRate;
  final double commissionAmount;
  final double providerNetAmount;
  final SettlementStatusModel settlementStatus;
  final DateTime? settledAt;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final FinanceBookingRef? booking;

  factory FinanceTransaction.fromJson(Map<String, dynamic> json) {
    final booking = asMapOrNull(json['booking']);
    return FinanceTransaction(
      id: asInt(json['id']),
      bookingId: asInt(json['bookingId']),
      grossAmount: asDouble(json['grossAmount']),
      commissionRate: asDouble(json['commissionRate']),
      commissionAmount: asDouble(json['commissionAmount']),
      providerNetAmount: asDouble(json['providerNetAmount']),
      settlementStatus: SettlementStatusModel.fromApi(
        asStringOrNull(json['settlementStatus']),
      ),
      settledAt: asDateOrNull(json['settledAt']),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDateOrNull(json['updatedAt']),
      booking: booking == null ? null : FinanceBookingRef.fromJson(booking),
    );
  }
}

/// Admin-only shape from GET /admin/finance/transactions and the settlement
/// PATCH response — the same fields plus which business it belongs to and
/// who settled it, if anyone yet.
class AdminFinanceTransaction extends FinanceTransaction {
  const AdminFinanceTransaction({
    required super.id,
    required super.bookingId,
    required super.grossAmount,
    required super.commissionRate,
    required super.commissionAmount,
    required super.providerNetAmount,
    required super.settlementStatus,
    required super.createdAt,
    required this.providerId,
    required this.providerName,
    super.settledAt,
    super.updatedAt,
    super.booking,
    this.settledByAdminId,
    this.settledByAdminName,
  });

  final int providerId;
  final String providerName;
  final int? settledByAdminId;
  final String? settledByAdminName;

  factory AdminFinanceTransaction.fromJson(Map<String, dynamic> json) {
    final booking = asMapOrNull(json['booking']);
    return AdminFinanceTransaction(
      id: asInt(json['id']),
      bookingId: asInt(json['bookingId']),
      providerId: asInt(json['providerId']),
      providerName: asString(json['providerName']),
      grossAmount: asDouble(json['grossAmount']),
      commissionRate: asDouble(json['commissionRate']),
      commissionAmount: asDouble(json['commissionAmount']),
      providerNetAmount: asDouble(json['providerNetAmount']),
      settlementStatus: SettlementStatusModel.fromApi(
        asStringOrNull(json['settlementStatus']),
      ),
      settledAt: asDateOrNull(json['settledAt']),
      settledByAdminId: asIntOrNull(json['settledByAdminId']),
      settledByAdminName: asStringOrNull(json['settledByAdminName']),
      createdAt: asDate(json['createdAt']),
      updatedAt: asDateOrNull(json['updatedAt']),
      booking: booking == null ? null : FinanceBookingRef.fromJson(booking),
    );
  }
}

/// GET /admin/finance/providers/:id — a [FinanceSummary] scoped to one
/// provider, plus that provider's complete (all-time) transaction list.
/// Kept as a thin wrapper rather than folding `transactions` into
/// [FinanceSummary] itself, since neither the platform-wide nor the
/// provider's-own summary endpoint carries a transaction list at all.
class AdminProviderFinance {
  const AdminProviderFinance({
    required this.summary,
    required this.transactions,
  });

  final FinanceSummary summary;
  final List<AdminFinanceTransaction> transactions;

  factory AdminProviderFinance.fromJson(Map<String, dynamic> json) =>
      AdminProviderFinance(
        summary: FinanceSummary.fromJson(json),
        transactions: asMapList(
          json['transactions'],
        ).map(AdminFinanceTransaction.fromJson).toList(),
      );
}

/// GET/PUT .../commission. The same shape for both the admin's read/write
/// endpoints and the provider's read-only one — none of them ever return
/// who last changed it by name, only by id.
class ProviderCommission {
  const ProviderCommission({
    required this.providerId,
    required this.commissionRate,
    this.updatedAt,
    this.updatedByAdminId,
  });

  final int providerId;
  final double commissionRate;
  final DateTime? updatedAt;
  final int? updatedByAdminId;

  factory ProviderCommission.fromJson(Map<String, dynamic> json) =>
      ProviderCommission(
        providerId: asInt(json['providerId']),
        commissionRate: asDouble(json['commissionRate']),
        updatedAt: asDateOrNull(json['updatedAt']),
        updatedByAdminId: asIntOrNull(json['updatedByAdminId']),
      );
}
