import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/models/models.dart';
import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';

/// Captures every request handed to it and returns a queued response — same
/// pattern used across this test suite (see ai_test.dart, customer_settings_test.dart).
class _CapturingAdapter implements HttpClientAdapter {
  RequestOptions? lastOptions;
  final List<String> responses;
  int _index = 0;

  _CapturingAdapter(this.responses);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastOptions = options;
    final body = responses[_index.clamp(0, responses.length - 1)];
    _index++;
    return ResponseBody.fromString(
      body,
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('MyReview.fromJson', () {
    test('reads every field, including the provider it was written for', () {
      final review = MyReview.fromJson({
        'id': 9,
        'bookingId': 4,
        'rating': 4,
        'comment': 'Quick and professional.',
        'createdAt': '2026-01-01T00:00:00.000Z',
        'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
      });

      expect(review.id, 9);
      expect(review.bookingId, 4);
      expect(review.rating, 4);
      expect(review.comment, 'Quick and professional.');
      expect(review.providerId, 2);
      expect(review.providerBusinessName, 'Al-Nour Auto');
    });

    test('a null comment and bookingId parse cleanly, never throwing', () {
      final review = MyReview.fromJson({
        'id': 9,
        'bookingId': null,
        'rating': 5,
        'comment': null,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
      });

      expect(review.comment, isNull);
      expect(review.bookingId, isNull);
    });
  });

  group('CustomerRepository — my reviews', () {
    test('watchMyReviews GETs /reviews/me and parses the real array response', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'bookingId': 4,
            'rating': 5,
            'comment': null,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
          },
        ]),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final reviews = await repo.refreshMyReviews();

      expect(adapter.lastOptions!.path, '/reviews/me');
      expect(adapter.lastOptions!.method, 'GET');
      expect(reviews, hasLength(1));
      expect(reviews.first.providerBusinessName, 'Al-Nour Auto');
    });

    test('deleteReview DELETEs /reviews/:id and invalidates the my-reviews cache', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'bookingId': 4,
            'rating': 5,
            'comment': null,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
          },
        ]),
        jsonEncode({'success': true}), // the DELETE call itself
        jsonEncode([]), // refetched after invalidation — now empty
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final before = await repo.refreshMyReviews();
      expect(before, hasLength(1));

      await repo.deleteReview(1);
      expect(adapter.lastOptions!.path, '/reviews/1');
      expect(adapter.lastOptions!.method, 'DELETE');

      final after = await repo.refreshMyReviews();
      expect(after, isEmpty);
    });
  });
}
