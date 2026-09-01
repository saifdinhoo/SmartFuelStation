import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/models/admin_models.dart';
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
  group('CustomerRepository — my complaints', () {
    test('watchMyComplaints GETs /complaints/me and parses via the shared Complaint model', () async {
      final adapter = _CapturingAdapter([
        jsonEncode([
          {
            'id': 1,
            'subject': 'Rude staff',
            'details': null,
            'severity': 'HIGH',
            'status': 'OPEN',
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T00:00:00.000Z',
            'resolvedAt': null,
            'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
          },
        ]),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final complaints = await repo.refreshMyComplaints();

      expect(adapter.lastOptions!.path, '/complaints/me');
      expect(adapter.lastOptions!.method, 'GET');
      expect(complaints, hasLength(1));
      expect(complaints.first.providerName, 'Al-Nour Auto');
      expect(complaints.first.severity, ComplaintSeverity.high);
      // The customer-facing response never includes who filed it (they
      // already know) — the shared model must tolerate that being absent.
      expect(complaints.first.submittedById, isNull);
    });

    test('submitComplaint POSTs /complaints with exactly the real fields — never a customerId', () async {
      final adapter = _CapturingAdapter([
        jsonEncode({
          'id': 1,
          'subject': 'Rude staff',
          'details': 'Waited an hour.',
          'severity': 'HIGH',
          'status': 'OPEN',
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
          'resolvedAt': null,
          'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
        }),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      final complaint = await repo.submitComplaint(
        providerId: 2,
        subject: 'Rude staff',
        details: 'Waited an hour.',
        severity: ComplaintSeverity.high,
      );

      expect(adapter.lastOptions!.path, '/complaints');
      expect(adapter.lastOptions!.method, 'POST');
      expect(adapter.lastBody, {
        'providerId': 2,
        'subject': 'Rude staff',
        'severity': 'HIGH',
        'details': 'Waited an hour.',
      });
      expect(complaint.providerName, 'Al-Nour Auto');
    });

    test('submitComplaint omits details entirely when blank, rather than sending an empty string', () async {
      final adapter = _CapturingAdapter([
        jsonEncode({
          'id': 1,
          'subject': 'Rude staff',
          'details': null,
          'severity': 'MEDIUM',
          'status': 'OPEN',
          'createdAt': '2026-01-01T00:00:00.000Z',
          'updatedAt': '2026-01-01T00:00:00.000Z',
          'resolvedAt': null,
          'provider': {'id': 2, 'businessName': 'Al-Nour Auto'},
        }),
      ]);
      final apiClient = ApiClient(readToken: () => 'jwt-token', onUnauthorized: () async {});
      apiClient.raw.httpClientAdapter = adapter;
      final repo = CustomerRepository(apiClient, QueryCache());

      await repo.submitComplaint(providerId: 2, subject: 'Rude staff', details: '   ');

      expect(adapter.lastBody, {
        'providerId': 2,
        'subject': 'Rude staff',
        'severity': 'MEDIUM',
      });
    });
  });
}
