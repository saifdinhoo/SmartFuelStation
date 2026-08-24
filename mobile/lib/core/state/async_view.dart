import 'package:flutter/material.dart';

import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import 'async_value.dart';

/// Renders an [AsyncValue] with the shared loading and error treatments, so
/// no screen writes its own spinner/error branch.
///
/// During a refresh it keeps showing the previous data rather than blanking
/// out — the behaviour a pull-to-refresh should have.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.value,
    required this.builder,
    this.onRetry,
    this.errorTitle,
  });

  final AsyncValue<T> value;
  final Widget Function(BuildContext context, T data) builder;
  final VoidCallback? onRetry;
  final String? errorTitle;

  @override
  Widget build(BuildContext context) {
    return value.map(
      onData: (data) => builder(context, data),
      onLoading: (previous) =>
          previous == null ? const LoadingView() : builder(context, previous),
      onError: (error, previous) => previous != null
          // A failed refresh over good data: keep the content, the caller
          // surfaces the failure separately rather than throwing away a
          // usable screen.
          ? builder(context, previous)
          : ErrorView(
              title: errorTitle,
              message: error.message,
              onRetry: onRetry,
            ),
    );
  }
}
