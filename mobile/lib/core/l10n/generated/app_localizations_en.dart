// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Smart Automotive Service';

  @override
  String get actionLogin => 'Login';

  @override
  String get actionRegister => 'Register';

  @override
  String get actionLogout => 'Logout';

  @override
  String get actionRetry => 'Retry';

  @override
  String get actionSave => 'Save';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionAdd => 'Add';

  @override
  String get actionEdit => 'Edit';

  @override
  String get actionDelete => 'Delete';

  @override
  String get actionApprove => 'Approve';

  @override
  String get fieldEmail => 'Email';

  @override
  String get fieldPassword => 'Password';

  @override
  String get fieldName => 'Name';

  @override
  String get fieldDescription => 'Description';

  @override
  String get fieldBusinessName => 'Business name';

  @override
  String get fieldAddress => 'Address';

  @override
  String get fieldAccountType => 'Account type';

  @override
  String get roleCustomer => 'Customer';

  @override
  String get roleProvider => 'Service Provider';

  @override
  String get roleAdmin => 'Admin';

  @override
  String get loginSubmitting => 'Logging in…';

  @override
  String get loginNoAccount => 'No account? Register';

  @override
  String get registerSubmitting => 'Registering…';

  @override
  String get registerProviderNotice =>
      'Your provider account will need admin approval before it\'s active.';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navCategories => 'Categories';

  @override
  String get navProviders => 'Providers';

  @override
  String dashboardWelcome(String name) {
    return 'Welcome, $name';
  }

  @override
  String dashboardRole(String role) {
    return 'Role: $role';
  }

  @override
  String dashboardApprovalStatus(String status) {
    return 'Business approval status: $status';
  }

  @override
  String get statusApproved => 'Approved';

  @override
  String get statusPendingApproval => 'Pending approval';

  @override
  String get categoriesEmpty => 'No categories yet.';

  @override
  String get categoriesAdd => 'Add category';

  @override
  String get categoriesEdit => 'Edit category';

  @override
  String get providersEmpty => 'No providers yet.';

  @override
  String get stateLoading => 'Loading…';

  @override
  String get stateErrorTitle => 'Something went wrong';

  @override
  String get stateEmptyTitle => 'Nothing here yet';

  @override
  String get settingsTheme => 'Theme';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeSystem => 'System';

  @override
  String get unauthorizedTitle => 'Not available for your account';

  @override
  String unauthorizedBody(String role) {
    return 'You are signed in as $role, which does not have access to this page.';
  }

  @override
  String get unauthorizedGoBack => 'Go to dashboard';

  @override
  String get notFoundTitle => 'Page not found';
}
