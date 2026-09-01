import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/models/models.dart';
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
  group('CustomerRepository — vehicles', () {
    test('watchMyVehicles GETs /vehicles and parses the shape, including a null fuelType', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'make': 'Toyota',
            'model': 'Corolla',
            'year': 2022,
            'plate': 'ABC 1234',
            'color': 'White',
            'fuelType': null,
          },
        ]),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final vehicles = await repo.refreshMyVehicles();

      expect(adapter.lastOptions!.path, '/vehicles');
      expect(adapter.lastOptions!.method, 'GET');
      expect(vehicles, hasLength(1));
      expect(vehicles.first.make, 'Toyota');
      expect(vehicles.first.year, 2022);
      // A vehicle genuinely has no fuel type set — must stay null, never
      // silently default to gasoline95 the way a required field would.
      expect(vehicles.first.fuelType, isNull);
    });

    test('createVehicle POSTs /vehicles with exactly the entered fields', () async {
      final adapter = _CapturingAdapter([
        jsonEncode({
          'id': 1,
          'make': 'Toyota',
          'model': 'Corolla',
          'year': 2022,
          'plate': null,
          'color': null,
          'fuelType': 'GASOLINE_95',
        }),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final vehicle = await repo.createVehicle(
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        fuelType: FuelTypeModel.gasoline95,
      );

      expect(adapter.lastOptions!.path, '/vehicles');
      expect(adapter.lastOptions!.method, 'POST');
      expect(adapter.lastBody, {
        'make': 'Toyota',
        'model': 'Corolla',
        'year': 2022,
        'plate': null,
        'color': null,
        'fuelType': 'GASOLINE_95',
      });
      expect(vehicle.fuelType, FuelTypeModel.gasoline95);
    });

    test('updateVehicle PATCHes /vehicles/:id sending an explicit null for a cleared field', () async {
      final adapter = _CapturingAdapter([
        jsonEncode({
          'id': 1,
          'make': 'Toyota',
          'model': 'Corolla',
          'year': 2022,
          'plate': null,
          'color': 'Blue',
          'fuelType': null,
        }),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      await repo.updateVehicle(
        1,
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        color: 'Blue',
      );

      expect(adapter.lastOptions!.path, '/vehicles/1');
      expect(adapter.lastOptions!.method, 'PATCH');
      // plate/fuelType are explicitly null (cleared), not omitted — the
      // backend distinguishes "absent key" (leave unchanged) from
      // "explicit null" (clear it).
      expect(adapter.lastBody, {
        'make': 'Toyota',
        'model': 'Corolla',
        'year': 2022,
        'plate': null,
        'color': 'Blue',
        'fuelType': null,
      });
    });

    test('deleteVehicle DELETEs /vehicles/:id and invalidates the cache', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'make': 'Toyota',
            'model': 'Corolla',
            'year': 2022,
            'plate': null,
            'color': null,
            'fuelType': null,
          },
        ]),
        jsonEncode({'success': true}), // the DELETE call itself
        jsonEncode([]), // refetched after invalidation — now empty
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final before = await repo.refreshMyVehicles();
      expect(before, hasLength(1));

      await repo.deleteVehicle(1);
      expect(adapter.lastOptions!.path, '/vehicles/1');
      expect(adapter.lastOptions!.method, 'DELETE');

      final after = await repo.refreshMyVehicles();
      expect(after, isEmpty);
    });
  });
}
