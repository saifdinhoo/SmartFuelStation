import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/network/api_client.dart';
import 'package:smart_automotive_service_app/core/state/query_cache.dart';
import 'package:smart_automotive_service_app/features/customer/data/customer_repository.dart';

class _CapturingAdapter implements HttpClientAdapter {
  RequestOptions? lastOptions;
  Object? lastBody;
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
    lastBody = options.data;
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
  group('CustomerRepository — favorites', () {
    test('watchMyFavorites GETs /favorites/me and parses the nested provider', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'provider': {
              'id': 2,
              'businessName': 'Al-Nour Auto',
              'address': '12 Nile St',
              'isOpen': true,
              'estimatedWaitMinutes': 10,
            },
          },
        ]),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final favorites = await repo.refreshMyFavorites();

      expect(adapter.lastOptions!.path, '/favorites/me');
      expect(adapter.lastOptions!.method, 'GET');
      expect(favorites, hasLength(1));
      expect(favorites.first.providerId, 2);
      expect(favorites.first.providerBusinessName, 'Al-Nour Auto');
      expect(favorites.first.providerIsOpen, isTrue);
    });

    test('addFavorite POSTs /favorites with exactly the providerId', () async {
      final adapter = _CapturingAdapter([
        jsonEncode({
          'id': 1,
          'createdAt': '2026-01-01T00:00:00.000Z',
          'provider': {
            'id': 2,
            'businessName': 'Al-Nour Auto',
            'address': '12 Nile St',
            'isOpen': true,
            'estimatedWaitMinutes': 10,
          },
        }),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final favorite = await repo.addFavorite(2);

      expect(adapter.lastOptions!.path, '/favorites');
      expect(adapter.lastOptions!.method, 'POST');
      expect(adapter.lastBody, {'providerId': 2});
      expect(favorite.providerId, 2);
    });

    test('removeFavorite DELETEs /favorites/:providerId and invalidates the cache', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'createdAt': '2026-01-01T00:00:00.000Z',
            'provider': {
              'id': 2,
              'businessName': 'Al-Nour Auto',
              'address': '12 Nile St',
              'isOpen': true,
              'estimatedWaitMinutes': 10,
            },
          },
        ]),
        jsonEncode({'success': true}), // the DELETE call itself
        jsonEncode([]), // refetched after invalidation — now empty
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final before = await repo.refreshMyFavorites();
      expect(before, hasLength(1));

      await repo.removeFavorite(2);
      expect(adapter.lastOptions!.path, '/favorites/2');
      expect(adapter.lastOptions!.method, 'DELETE');

      final after = await repo.refreshMyFavorites();
      expect(after, isEmpty);
    });
  });
}
