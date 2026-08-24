import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../network/api_exception.dart';
import 'async_value.dart';

/// A small keyed cache for server reads — the role TanStack Query plays in
/// the web app.
///
/// Deliberately not a new state-management framework. It sits on the
/// `ChangeNotifier` + `provider` base Phase 0 already established and
/// provides only the four things the screens actually need:
///
///   * cached reads      — a key fetched once is reused everywhere
///   * shared state      — two screens on the same key see one
///                         loading/error/data, never two disagreeing copies
///   * invalidation      — a mutation marks keys stale and they refetch
///   * in-flight dedupe  — concurrent asks for the same key await one
///                         request instead of firing duplicates
///
/// Keys are plain strings (`'providers'`, `'provider/7/reviews'`), and
/// [invalidatePrefix] lets a mutation drop a whole family at once.
class QueryCache extends ChangeNotifier {
  final Map<String, _Entry> _entries = {};

  /// How long a successful result is served without refetching.
  ///
  /// Kept short even though sockets now push most changes: the socket is a
  /// best-effort channel, and this window is the backstop for anything
  /// missed while disconnected or for a screen opened mid-gap.
  static const staleAfter = Duration(seconds: 30);

  /// Current state for [key], without triggering a fetch.
  ///
  /// A key read as the wrong type degrades to loading rather than throwing:
  /// a mistyped cache entry is a bug, but it should not take a screen down
  /// — treating it as absent makes the next watch refetch it correctly.
  AsyncValue<T> read<T>(String key) {
    final state = _entries[key]?.state;
    if (state is AsyncValue<T>) return state;
    return AsyncLoading<T>(previous: state?.valueOrNull as T?);
  }

  /// Ensures [key] is populated, fetching via [loader] when missing or
  /// stale. Safe to call from `build` — it schedules rather than mutating
  /// state mid-frame, and repeated calls while a request is in flight
  /// attach to that request instead of starting another.
  AsyncValue<T> watch<T>(String key, Future<T> Function() loader) {
    final entry = _entries[key];

    if (entry == null || (entry.isStale && !entry.inFlight)) {
      // Deferred: watch() is normally called during build, and notifying
      // listeners synchronously there would throw.
      Future.microtask(() => refresh<T>(key, loader));
    }

    return (entry?.state as AsyncValue<T>?) ?? AsyncLoading<T>();
  }

  /// Fetches [key] now, regardless of staleness. Returns the value, or
  /// rethrows so a caller that cares (a mutation, a retry button) can react.
  Future<T> refresh<T>(String key, Future<T> Function() loader) async {
    final existing = _entries[key];
    if (existing != null && existing.inFlight) {
      // Dedupe: join the request already running for this key.
      return await existing.pending as T;
    }

    final previous = existing?.state.valueOrNull as T?;
    final future = loader();
    _entries[key] = _Entry(
      state: AsyncLoading<T>(previous: previous),
      pending: future,
      fetchedAt: null,
    );
    notifyListeners();

    try {
      final value = await future;
      _entries[key] = _Entry(
        state: AsyncData<T>(value),
        fetchedAt: DateTime.now(),
      );
      notifyListeners();
      return value;
    } on ApiException catch (error) {
      _entries[key] = _Entry(
        state: AsyncError<T>(error, previous: previous),
        fetchedAt: DateTime.now(),
      );
      notifyListeners();
      rethrow;
    }
  }

  /// Writes a value straight into the cache without a request.
  ///
  /// Used by the socket layer, where the server has already pushed the new
  /// state and refetching it would be a redundant round trip. The entry is
  /// marked fresh, so a `watch` immediately afterwards does not refetch.
  void setData<T>(String key, T value) {
    _entries[key] = _Entry(
      state: AsyncData<T>(value),
      fetchedAt: DateTime.now(),
    );
    notifyListeners();
  }

  /// Transforms the value already cached under [key], if any.
  ///
  /// Returns false when there is nothing cached to update — the caller
  /// should invalidate instead, so the data is fetched rather than
  /// silently skipped.
  bool update<T>(String key, T Function(T current) transform) {
    final current = _entries[key]?.state.valueOrNull;
    if (current is! T) return false;
    setData<T>(key, transform(current));
    return true;
  }

  /// Marks [key] stale so the next [watch] refetches. Existing data stays
  /// visible in the meantime rather than flashing a spinner.
  void invalidate(String key) {
    final entry = _entries[key];
    if (entry == null) return;
    _entries[key] = entry.copyStale();
    notifyListeners();
  }

  /// Invalidates every key starting with [prefix] — e.g. `'provider/'`
  /// after a mutation that could affect any provider's data.
  void invalidatePrefix(String prefix) {
    var changed = false;
    for (final key in _entries.keys.toList()) {
      if (key.startsWith(prefix)) {
        _entries[key] = _entries[key]!.copyStale();
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }

  /// Drops everything. Called on logout so the next account never sees the
  /// previous one's cached data.
  void clear() {
    if (_entries.isEmpty) return;
    _entries.clear();
    notifyListeners();
  }

  @visibleForTesting
  bool hasKey(String key) => _entries.containsKey(key);
}

extension QueryCacheContext on BuildContext {
  /// Subscribes this widget to cache changes.
  ///
  /// Repository `watch*` calls read through the cache but cannot subscribe
  /// on the widget's behalf, so a screen that renders cached data must call
  /// this once in `build` or it will never rebuild when the data arrives.
  void watchQueries() => watch<QueryCache>();
}

class _Entry {
  _Entry({required this.state, this.pending, this.fetchedAt});

  final AsyncValue<Object?> state;
  final Future<Object?>? pending;
  final DateTime? fetchedAt;

  bool get inFlight => fetchedAt == null && pending != null;

  bool get isStale =>
      fetchedAt == null ||
      DateTime.now().difference(fetchedAt!) > QueryCache.staleAfter;

  /// Keeps the data but backdates it so the next watch refetches.
  _Entry copyStale() =>
      _Entry(state: state, fetchedAt: DateTime.fromMillisecondsSinceEpoch(0));
}
