import 'package:flutter/material.dart';

/// The single spinner for the whole app.
///
/// Screens previously each wrote `Center(child: CircularProgressIndicator())`
/// inline; routing it through one widget means a future change to loading
/// treatment (skeletons, for instance) lands everywhere at once.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!, style: Theme.of(context).textTheme.bodySmall),
          ],
        ],
      ),
    );
  }
}
