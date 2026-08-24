import '../network/api_exception.dart';

/// The three states any server read can be in, as one type.
///
/// Screens switch over this instead of juggling separate `isLoading`,
/// `error` and `data` fields that can contradict each other — the shape
/// that produced a different ad-hoc loading/error path in every Phase 0
/// screen.
sealed class AsyncValue<T> {
  const AsyncValue();

  /// Data from a previous successful fetch, if any. Present even while a
  /// refresh is in flight, so a pull-to-refresh can keep showing content
  /// rather than blanking the screen.
  T? get valueOrNull => switch (this) {
    AsyncData<T>(:final value) => value,
    AsyncLoading<T>(:final previous) => previous,
    AsyncError<T>(:final previous) => previous,
  };

  bool get isLoading => this is AsyncLoading<T>;
  bool get hasValue => valueOrNull != null;

  ApiException? get errorOrNull =>
      this is AsyncError<T> ? (this as AsyncError<T>).error : null;

  R map<R>({
    required R Function(T value) onData,
    required R Function(T? previous) onLoading,
    required R Function(ApiException error, T? previous) onError,
  }) => switch (this) {
    AsyncData<T>(:final value) => onData(value),
    AsyncLoading<T>(:final previous) => onLoading(previous),
    AsyncError<T>(:final error, :final previous) => onError(error, previous),
  };
}

class AsyncLoading<T> extends AsyncValue<T> {
  const AsyncLoading({this.previous});
  final T? previous;
}

class AsyncData<T> extends AsyncValue<T> {
  const AsyncData(this.value);
  final T value;
}

class AsyncError<T> extends AsyncValue<T> {
  const AsyncError(this.error, {this.previous});
  final ApiException error;
  final T? previous;
}
