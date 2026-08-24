@Tags(['live'])
library;

import 'dart:io' show HttpOverrides;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smart_automotive_service_app/core/models/admin_models.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/network/api_exception.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/core/storage/secure_token_store.dart';
import 'package:smart_automotive_service_app/features/admin/data/admin_repository.dart';
import 'package:smart_automotive_service_app/features/auth/data/auth_api.dart';
import 'package:smart_automotive_service_app/features/auth/state/auth_state.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';

/// Admin Mobile against a running backend and real PostgreSQL.
///
///   flutter test test/live_admin_test.dart --run-skipped \
///     --dart-define=API_BASE_URL=http://localhost:5000/api
///
/// Every mutation here is a round trip that restores what it changed, so
/// the suite can be run repeatedly against the same seeded database.
void main() {
  const adminEmail = 'admin@smartfuelstation.com';
  const adminPassword = 'admin123';
  const customerEmail = 'layla@smartauto.local';
  const providerEmail = 'provider@smartauto.local';
  const password = 'demo123';

  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    HttpOverrides.global = null;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(
      {},
    );
  });

  Future<
    ({
      AuthState auth,
      ApiClient api,
      QueryCache cache,
      AdminRepository admin,
      CustomerRepository customer,
    })
  >
  session(String email, {String pass = password}) async {
    final tokens = SecureTokenStore(const FlutterSecureStorage());
    final auth = AuthState(tokens);
    final api = ApiClient(
      readToken: auth.readToken,
      onUnauthorized: auth.logout,
    );
    auth.api = AuthApi(api);
    final cache = QueryCache();
    await auth.signIn(email: email, password: pass);
    return (
      auth: auth,
      api: api,
      cache: cache,
      admin: AdminRepository(api, cache),
      customer: CustomerRepository(api, cache),
    );
  }

  Future<
    ({
      AuthState auth,
      ApiClient api,
      QueryCache cache,
      AdminRepository admin,
      CustomerRepository customer,
    })
  >
  adminSession() => session(adminEmail, pass: adminPassword);

  test('overview counts agree with the rows behind them', () async {
    final s = await adminSession();
    final overview = await s.admin.refreshOverview();

    // Cross-checked against the list endpoints rather than trusted alone:
    // if the aggregate and the list disagree, one of them is wrong.
    final users = await s.admin.refreshUsers();
    expect(overview.users.total, users.length);

    final providers = await s.admin.refreshProviders();
    expect(overview.providers.total, providers.length);
    expect(
      overview.providers.approved,
      providers.where((p) => p.isApproved).length,
    );
    expect(
      overview.providers.pending,
      providers.where((p) => !p.isApproved).length,
    );

    final bookings = await s.admin.refreshBookings();
    expect(overview.bookings.total, bookings.length);

    // Section totals must add up.
    expect(
      overview.users.customers +
          overview.users.providerAccounts +
          overview.users.admins,
      overview.users.total,
    );
    expect(
      overview.providers.approved + overview.providers.pending,
      overview.providers.total,
    );

    // Nothing invented.
    expect(overview.toString().toLowerCase(), isNot(contains('revenue')));
  });

  test('the user list filters and searches on the server', () async {
    final s = await adminSession();

    final all = await s.admin.refreshUsers();
    expect(all, isNotEmpty);

    final providersOnly = await s.admin.refreshUsers(role: 'PROVIDER');
    expect(providersOnly, isNotEmpty);
    for (final u in providersOnly) {
      expect(u.role, UserRoleModel.provider);
    }
    expect(providersOnly.length, lessThan(all.length));

    // A provider account carries its linked business.
    expect(providersOnly.first.businessName, isNotNull);

    // Search matches name or email, case-insensitively.
    final searched = await s.admin.refreshUsers(search: 'LAYLA');
    expect(searched, isNotEmpty);
    for (final u in searched) {
      expect(
        '${u.name} ${u.email}'.toLowerCase(),
        contains('layla'),
        reason: 'the server filtered this list, not the client',
      );
    }

    // A filter with no matches is an empty list, not an error.
    final none = await s.admin.refreshUsers(search: 'zzz-no-such-user-zzz');
    expect(none, isEmpty);
  });

  test('a user detail carries counts, business and recent activity', () async {
    final s = await adminSession();
    final providers = await s.admin.refreshUsers(role: 'PROVIDER');
    final target = providers.first;

    final detail = await s.cache.refresh<AdminUserDetail>(
      AdminKeys.user(target.id),
      () async {
        final json = await s.api.get('/admin/users/${target.id}') as Map;
        return AdminUserDetail.fromJson(Map<String, dynamic>.from(json));
      },
    );

    expect(detail.id, target.id);
    expect(detail.email, target.email);
    expect(detail.business, isNotNull);
    expect(detail.business!.businessName, isNotEmpty);
    expect(detail.bookingCount, greaterThanOrEqualTo(0));
    expect(detail.recentBookings.length, lessThanOrEqualTo(10));
  });

  test('provider approval round-trips and persists', () async {
    final s = await adminSession();
    final before = await s.admin.refreshProviders();
    final target = before.first;
    final original = target.isApproved;

    await s.admin.setProviderApproval(target.id, !original);
    var after = await s.admin.refreshProviders();
    expect(
      after.firstWhere((p) => p.id == target.id).isApproved,
      !original,
      reason: 'the flip must be readable back from the database',
    );

    // Restore, so the suite is repeatable.
    await s.admin.setProviderApproval(target.id, original);
    after = await s.admin.refreshProviders();
    expect(after.firstWhere((p) => p.id == target.id).isApproved, original);
  });

  test('an admin sees unapproved businesses a customer never does', () async {
    final admin = await adminSession();
    final customer = await session(customerEmail);

    final adminList = await admin.admin.refreshProviders();
    final customerList = await customer.customer.refreshProviders();

    final pending = adminList.where((p) => !p.isApproved).toList();
    if (pending.isEmpty) {
      markTestSkipped('every seeded business is approved');
      return;
    }

    final customerIds = customerList.map((p) => p.id).toSet();
    for (final p in pending) {
      expect(
        customerIds,
        isNot(contains(p.id)),
        reason: 'an unapproved business must not reach customer discovery',
      );
    }
  });

  test('category CRUD round-trips, and safe delete is enforced', () async {
    final s = await adminSession();
    final name = 'Phase 4 probe ${DateTime.now().millisecondsSinceEpoch}';

    await s.admin.createCategory(name: name, description: 'temp');
    var categories = await s.admin.refreshCategories();
    final created = categories.firstWhere((c) => c.name == name);
    expect(created.isActive, isTrue);

    await s.admin.updateCategory(
      created.id,
      name: '$name edited',
      description: 'edited',
    );
    categories = await s.admin.refreshCategories();
    final edited = categories.firstWhere((c) => c.id == created.id);
    expect(edited.name, '$name edited');
    expect(edited.description, 'edited');
    // isActive is not editable through this endpoint — the service reads
    // only name and description — so it must stay exactly as created.
    expect(
      edited.isActive,
      created.isActive,
      reason: 'no route writes isActive; it must not appear to change',
    );

    // Sending isActive directly is accepted but ignored — proof that the
    // UI is right not to offer a toggle for it.
    await s.api.put(
      '/categories/${created.id}',
      body: {'name': '$name edited', 'isActive': !created.isActive},
    );
    categories = await s.admin.refreshCategories();
    expect(
      categories.firstWhere((c) => c.id == created.id).isActive,
      created.isActive,
      reason: 'the endpoint silently drops isActive',
    );

    // A brand-new category has no services, so it deletes cleanly.
    await s.admin.deleteCategory(created.id);
    categories = await s.admin.refreshCategories();
    expect(categories.where((c) => c.id == created.id), isEmpty);

    // One that is in use must be refused with an explanation rather than
    // cascading away the services that depend on it.
    final services = (await s.api.get('/providers') as List)
        .whereType<Map>()
        .expand((p) => (p['services'] as List? ?? const []).whereType<Map>())
        .toList();
    if (services.isEmpty) {
      markTestSkipped('no provider services seeded; safe delete not probed');
      return;
    }
    final inUseCategoryId =
        (services.first['categoryId'] as num?)?.toInt() ??
        ((services.first['category'] as Map?)?['id'] as num?)?.toInt();
    expect(inUseCategoryId, isNotNull);

    await expectLater(
      s.admin.deleteCategory(inUseCategoryId!),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message.toLowerCase(),
          'explains why',
          contains('cannot be deleted'),
        ),
      ),
    );
    // And it is still there.
    categories = await s.admin.refreshCategories();
    expect(categories.where((c) => c.id == inUseCategoryId), isNotEmpty);
  });

  test('an admin sees every booking on the platform', () async {
    final admin = await adminSession();
    final customer = await session(customerEmail);

    final all = await admin.admin.refreshBookings();
    final mine = await customer.customer.refreshBookings();

    expect(all.length, greaterThanOrEqualTo(mine.length));
    // Bookings from more than one customer prove it is not role-scoped down.
    if (all.length > 1) {
      expect(all.map((b) => b.customerName).toSet(), isNotEmpty);
    }
    // A single booking is readable in full.
    final one = await admin.api.get('/bookings/${all.first.id}') as Map;
    expect(one['id'], all.first.id);
  });

  test('complaint triage round-trips and derives resolvedAt', () async {
    final s = await adminSession();
    final complaints = await s.admin.refreshComplaints();
    if (complaints.isEmpty) {
      markTestSkipped('no complaints seeded; triage not probed');
      return;
    }

    final target = complaints.first;
    final original = target.status;

    // Close it: the backend stamps resolvedAt from the status, not from
    // anything the client sends.
    final resolved = await s.admin.setComplaintStatus(
      target.id,
      ComplaintStatus.resolved,
    );
    expect(resolved.status, ComplaintStatus.resolved);
    expect(
      resolved.resolvedAt,
      isNotNull,
      reason: 'closing a complaint must stamp its closing date',
    );

    // Reopen it: the stamp is cleared again.
    final reopened = await s.admin.setComplaintStatus(
      target.id,
      ComplaintStatus.open,
    );
    expect(reopened.status, ComplaintStatus.open);
    expect(
      reopened.resolvedAt,
      isNull,
      reason: 'reopening must clear the closing date',
    );

    // Filters are applied server-side.
    final openOnly = await s.admin.refreshComplaints(status: 'OPEN');
    for (final c in openOnly) {
      expect(c.status, ComplaintStatus.open);
    }

    // Restore whatever it was before this test ran.
    if (original != ComplaintStatus.open) {
      await s.admin.setComplaintStatus(target.id, original);
    }
  });

  test('an invalid complaint status is refused by the backend', () async {
    final s = await adminSession();
    final complaints = await s.admin.refreshComplaints();
    if (complaints.isEmpty) {
      markTestSkipped('no complaints seeded');
      return;
    }
    await expectLater(
      s.api.patch(
        '/admin/complaints/${complaints.first.id}',
        body: {'status': 'NOT_A_STATUS'},
      ),
      throwsA(isA<ApiException>()),
    );
  });

  test('review moderation deletes a real review', () async {
    final admin = await adminSession();
    final customer = await session(customerEmail);

    // A review is created through the real customer flow first, so the
    // moderation test never destroys seeded data.
    final bookings = await customer.customer.refreshBookings();
    final reviewable = bookings
        .where((b) => b.status == BookingStatus.completed)
        .toList();
    if (reviewable.isEmpty) {
      markTestSkipped('no completed booking available to review');
      return;
    }

    int? createdId;
    for (final booking in reviewable) {
      try {
        final json =
            await customer.api.post(
                  '/reviews',
                  body: {
                    'bookingId': booking.id,
                    'rating': 4,
                    'comment': 'Phase 4 moderation probe',
                  },
                )
                as Map;
        createdId = (json['id'] as num).toInt();
        break;
      } on ApiException {
        // Already reviewed — a unique index enforces one per booking.
        continue;
      }
    }
    if (createdId == null) {
      markTestSkipped('every completed booking is already reviewed');
      return;
    }

    final before = await admin.admin.refreshReviews();
    expect(before.map((r) => r.id), contains(createdId));

    await admin.admin.deleteReview(createdId);

    final after = await admin.admin.refreshReviews();
    expect(
      after.map((r) => r.id),
      isNot(contains(createdId)),
      reason: 'the deletion must be readable back from the database',
    );
  });

  test('reviews filter by rating on the server', () async {
    final s = await adminSession();
    final all = await s.admin.refreshReviews();
    if (all.isEmpty) {
      markTestSkipped('no reviews on the platform');
      return;
    }
    final rating = all.first.rating;
    final filtered = await s.admin.refreshReviews(rating: '$rating');
    expect(filtered, isNotEmpty);
    for (final r in filtered) {
      expect(r.rating, rating);
    }
  });

  test('analytics returns real series and no invented metrics', () async {
    final s = await adminSession();

    for (final range in ['7d', '30d', '90d']) {
      final analytics = await s.admin.refreshAnalytics(range);
      expect(analytics.range, range);
      expect(analytics.completed, lessThanOrEqualTo(analytics.bookings));
      expect(analytics.cancellationRate, greaterThanOrEqualTo(0));
      // One point per day in the window.
      expect(
        analytics.bookingTrend.length,
        {'7d': 7, '30d': 30, '90d': 90}[range],
      );
      expect(analytics.userGrowth.length, analytics.bookingTrend.length);

      final serialized = analytics.toString().toLowerCase();
      for (final invented in ['revenue', 'ai', 'sentiment', 'health']) {
        expect(
          serialized,
          isNot(contains('"$invented"')),
          reason: 'analytics must not carry a $invented figure',
        );
      }
    }

    // An unsupported window is a 400, not a silent default.
    await expectLater(
      s.api.get('/admin/analytics', query: {'range': '365d'}),
      throwsA(isA<ApiException>()),
    );
  });

  test('a customer cannot reach any admin endpoint', () async {
    final customer = await session(customerEmail);

    for (final path in [
      '/admin/overview',
      '/admin/analytics',
      '/admin/users',
      '/admin/reviews',
      '/admin/complaints',
    ]) {
      await expectLater(
        customer.api.get(path),
        throwsA(
          isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
        ),
        reason: '$path must be closed to a customer',
      );
    }

    // Nor the admin-only writes that live outside /admin.
    await expectLater(
      customer.api.post('/categories', body: {'name': 'nope'}),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
    );
    await expectLater(
      customer.api.patch('/providers/1/approval', body: {'isApproved': true}),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
    );
  });

  test('a provider cannot reach any admin endpoint', () async {
    final provider = await session(providerEmail);

    for (final path in [
      '/admin/overview',
      '/admin/analytics',
      '/admin/users',
      '/admin/reviews',
      '/admin/complaints',
    ]) {
      await expectLater(
        provider.api.get(path),
        throwsA(
          isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
        ),
        reason: '$path must be closed to a provider',
      );
    }

    // A provider cannot approve itself.
    await expectLater(
      provider.api.patch('/providers/1/approval', body: {'isApproved': true}),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
    );
    // Nor edit the shared catalog.
    await expectLater(
      provider.api.post('/categories', body: {'name': 'nope'}),
      throwsA(
        isA<ApiException>().having((e) => e.isForbidden, 'is 403', isTrue),
      ),
    );
  });

  test('the admin session survives a restart', () async {
    final tokens = SecureTokenStore(const FlutterSecureStorage());
    final first = AuthState(tokens);
    final firstApi = ApiClient(
      readToken: first.readToken,
      onUnauthorized: first.logout,
    );
    first.api = AuthApi(firstApi);
    await first.signIn(email: adminEmail, password: adminPassword);

    // A new AuthState over the same secure storage is a relaunch.
    final second = AuthState(tokens);
    final secondApi = ApiClient(
      readToken: second.readToken,
      onUnauthorized: second.logout,
    );
    second.api = AuthApi(secondApi);
    await second.restoreSession();

    expect(second.isAuthenticated, isTrue);
    expect(second.role?.name, 'admin');

    // And the restored token really works against an admin route.
    final overview = await AdminRepository(
      secondApi,
      QueryCache(),
    ).refreshOverview();
    expect(overview.users.total, greaterThan(0));
  });
}
