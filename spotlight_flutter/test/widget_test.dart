import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spotlight_flutter/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('SpotlightApp widget smoke test initializes correctly', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const SpotlightApp());
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    expect(find.byType(SpotlightApp), findsOneWidget);
  });
}
