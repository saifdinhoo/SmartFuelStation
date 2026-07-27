import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final providerInfo = user?['provider'];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Welcome, ${user?['name']}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text('Role: ${user?['role']}'),
          if (user?['role'] == 'PROVIDER' && providerInfo != null) ...[
            const SizedBox(height: 8),
            Text(
              'Business approval status: ${providerInfo['isApproved'] == true ? 'Approved' : 'Pending approval'}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ],
      ),
    );
  }
}
