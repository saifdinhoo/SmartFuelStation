import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/main.dart';

void main() {
  testWidgets('shows the login screen when logged out', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();

    expect(find.text('Login'), findsWidgets);
  });
}
