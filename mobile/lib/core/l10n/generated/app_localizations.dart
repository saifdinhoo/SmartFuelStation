import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Smart Automotive Service'**
  String get appTitle;

  /// No description provided for @actionLogin.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get actionLogin;

  /// No description provided for @actionRegister.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get actionRegister;

  /// No description provided for @actionLogout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get actionLogout;

  /// No description provided for @actionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// No description provided for @actionSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get actionSave;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// No description provided for @actionAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get actionAdd;

  /// No description provided for @actionEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get actionEdit;

  /// No description provided for @actionDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get actionDelete;

  /// No description provided for @actionApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get actionApprove;

  /// No description provided for @fieldEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get fieldEmail;

  /// No description provided for @fieldPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get fieldPassword;

  /// No description provided for @fieldName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get fieldName;

  /// No description provided for @fieldDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get fieldDescription;

  /// No description provided for @fieldBusinessName.
  ///
  /// In en, this message translates to:
  /// **'Business name'**
  String get fieldBusinessName;

  /// No description provided for @fieldAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get fieldAddress;

  /// No description provided for @fieldAccountType.
  ///
  /// In en, this message translates to:
  /// **'Account type'**
  String get fieldAccountType;

  /// No description provided for @roleCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get roleCustomer;

  /// No description provided for @roleProvider.
  ///
  /// In en, this message translates to:
  /// **'Service Provider'**
  String get roleProvider;

  /// No description provided for @roleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get roleAdmin;

  /// No description provided for @dayMonday.
  ///
  /// In en, this message translates to:
  /// **'Monday'**
  String get dayMonday;

  /// No description provided for @dayTuesday.
  ///
  /// In en, this message translates to:
  /// **'Tuesday'**
  String get dayTuesday;

  /// No description provided for @dayWednesday.
  ///
  /// In en, this message translates to:
  /// **'Wednesday'**
  String get dayWednesday;

  /// No description provided for @dayThursday.
  ///
  /// In en, this message translates to:
  /// **'Thursday'**
  String get dayThursday;

  /// No description provided for @dayFriday.
  ///
  /// In en, this message translates to:
  /// **'Friday'**
  String get dayFriday;

  /// No description provided for @daySaturday.
  ///
  /// In en, this message translates to:
  /// **'Saturday'**
  String get daySaturday;

  /// No description provided for @daySunday.
  ///
  /// In en, this message translates to:
  /// **'Sunday'**
  String get daySunday;

  /// No description provided for @loginSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Logging in…'**
  String get loginSubmitting;

  /// No description provided for @loginNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No account? Register'**
  String get loginNoAccount;

  /// No description provided for @loginForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get loginForgotPassword;

  /// No description provided for @registerSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Registering…'**
  String get registerSubmitting;

  /// No description provided for @registerProviderNotice.
  ///
  /// In en, this message translates to:
  /// **'Your provider account will need admin approval before it\'s active.'**
  String get registerProviderNotice;

  /// No description provided for @forgotPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get forgotPasswordTitle;

  /// No description provided for @forgotPasswordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We\'ll email you a link to reset it'**
  String get forgotPasswordSubtitle;

  /// No description provided for @forgotPasswordSubmit.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get forgotPasswordSubmit;

  /// No description provided for @forgotPasswordCheckEmailTitle.
  ///
  /// In en, this message translates to:
  /// **'Check your email'**
  String get forgotPasswordCheckEmailTitle;

  /// No description provided for @forgotPasswordCheckEmailBody.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for that email, we\'ve sent a link to reset your password. Open it on this phone or any device to finish resetting your password.'**
  String get forgotPasswordCheckEmailBody;

  /// No description provided for @forgotPasswordBackToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to login'**
  String get forgotPasswordBackToLogin;

  /// No description provided for @forgotPasswordInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address'**
  String get forgotPasswordInvalidEmail;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get navCategories;

  /// No description provided for @navProviders.
  ///
  /// In en, this message translates to:
  /// **'Providers'**
  String get navProviders;

  /// No description provided for @dashboardWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome, {name}'**
  String dashboardWelcome(String name);

  /// No description provided for @dashboardRole.
  ///
  /// In en, this message translates to:
  /// **'Role: {role}'**
  String dashboardRole(String role);

  /// No description provided for @dashboardApprovalStatus.
  ///
  /// In en, this message translates to:
  /// **'Business approval status: {status}'**
  String dashboardApprovalStatus(String status);

  /// No description provided for @statusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get statusApproved;

  /// No description provided for @statusPendingApproval.
  ///
  /// In en, this message translates to:
  /// **'Pending approval'**
  String get statusPendingApproval;

  /// No description provided for @categoriesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No categories yet.'**
  String get categoriesEmpty;

  /// No description provided for @categoriesAdd.
  ///
  /// In en, this message translates to:
  /// **'Add category'**
  String get categoriesAdd;

  /// No description provided for @categoriesEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit category'**
  String get categoriesEdit;

  /// No description provided for @providersEmpty.
  ///
  /// In en, this message translates to:
  /// **'No providers yet.'**
  String get providersEmpty;

  /// No description provided for @stateLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get stateLoading;

  /// No description provided for @stateErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get stateErrorTitle;

  /// No description provided for @stateEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet'**
  String get stateEmptyTitle;

  /// No description provided for @settingsTheme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get settingsTheme;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @unauthorizedTitle.
  ///
  /// In en, this message translates to:
  /// **'Not available for your account'**
  String get unauthorizedTitle;

  /// No description provided for @unauthorizedBody.
  ///
  /// In en, this message translates to:
  /// **'You are signed in as {role}, which does not have access to this page.'**
  String unauthorizedBody(String role);

  /// No description provided for @unauthorizedGoBack.
  ///
  /// In en, this message translates to:
  /// **'Go to dashboard'**
  String get unauthorizedGoBack;

  /// No description provided for @notFoundTitle.
  ///
  /// In en, this message translates to:
  /// **'Page not found'**
  String get notFoundTitle;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navExplore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get navExplore;

  /// No description provided for @navBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get navBookings;

  /// No description provided for @navQueue.
  ///
  /// In en, this message translates to:
  /// **'Queue'**
  String get navQueue;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String homeGreeting(String name);

  /// No description provided for @homeBrowseCategories.
  ///
  /// In en, this message translates to:
  /// **'Browse by category'**
  String get homeBrowseCategories;

  /// No description provided for @homeOpenNow.
  ///
  /// In en, this message translates to:
  /// **'Open now'**
  String get homeOpenNow;

  /// No description provided for @homeNoOpenProviders.
  ///
  /// In en, this message translates to:
  /// **'No businesses are open right now.'**
  String get homeNoOpenProviders;

  /// No description provided for @homeSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get homeSeeAll;

  /// No description provided for @homeActiveBooking.
  ///
  /// In en, this message translates to:
  /// **'Your active booking'**
  String get homeActiveBooking;

  /// No description provided for @homeNoActivity.
  ///
  /// In en, this message translates to:
  /// **'You have no active bookings.'**
  String get homeNoActivity;

  /// No description provided for @homeFindService.
  ///
  /// In en, this message translates to:
  /// **'Find a service'**
  String get homeFindService;

  /// No description provided for @homeQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get homeQuickActions;

  /// No description provided for @homeQueueCount.
  ///
  /// In en, this message translates to:
  /// **'{count} in queue'**
  String homeQueueCount(int count);

  /// No description provided for @exploreTitle.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get exploreTitle;

  /// No description provided for @exploreSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search businesses or services…'**
  String get exploreSearchHint;

  /// No description provided for @exploreNoResults.
  ///
  /// In en, this message translates to:
  /// **'No businesses match your search.'**
  String get exploreNoResults;

  /// No description provided for @exploreNoProviders.
  ///
  /// In en, this message translates to:
  /// **'No businesses are available yet.'**
  String get exploreNoProviders;

  /// No description provided for @exploreFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All categories'**
  String get exploreFilterAll;

  /// No description provided for @exploreOpenOnly.
  ///
  /// In en, this message translates to:
  /// **'Open only'**
  String get exploreOpenOnly;

  /// No description provided for @exploreSortDistance.
  ///
  /// In en, this message translates to:
  /// **'Nearest first'**
  String get exploreSortDistance;

  /// No description provided for @exploreSortPrice.
  ///
  /// In en, this message translates to:
  /// **'Lowest price'**
  String get exploreSortPrice;

  /// No description provided for @exploreSortRating.
  ///
  /// In en, this message translates to:
  /// **'Highest rated'**
  String get exploreSortRating;

  /// No description provided for @exploreSortLabel.
  ///
  /// In en, this message translates to:
  /// **'Sort'**
  String get exploreSortLabel;

  /// No description provided for @exploreUseLocation.
  ///
  /// In en, this message translates to:
  /// **'Update my location'**
  String get exploreUseLocation;

  /// No description provided for @exploreLocationDenied.
  ///
  /// In en, this message translates to:
  /// **'Location unavailable, so distance sorting is off.'**
  String get exploreLocationDenied;

  /// No description provided for @exploreResultCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No businesses} =1{1 business} other{{count} businesses}}'**
  String exploreResultCount(int count);

  /// No description provided for @providerOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get providerOpen;

  /// No description provided for @providerClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get providerClosed;

  /// No description provided for @providerDistanceKm.
  ///
  /// In en, this message translates to:
  /// **'{km} km away'**
  String providerDistanceKm(String km);

  /// No description provided for @providerWaitMinutes.
  ///
  /// In en, this message translates to:
  /// **'~{minutes} min wait'**
  String providerWaitMinutes(int minutes);

  /// No description provided for @providerReviewCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No reviews} =1{1 review} other{{count} reviews}}'**
  String providerReviewCount(int count);

  /// No description provided for @providerNoRating.
  ///
  /// In en, this message translates to:
  /// **'Not rated yet'**
  String get providerNoRating;

  /// No description provided for @providerServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get providerServices;

  /// No description provided for @providerNoServices.
  ///
  /// In en, this message translates to:
  /// **'This business has no bookable services right now.'**
  String get providerNoServices;

  /// No description provided for @providerReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get providerReviews;

  /// No description provided for @providerNoReviews.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get providerNoReviews;

  /// No description provided for @providerAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get providerAbout;

  /// No description provided for @providerQueueNow.
  ///
  /// In en, this message translates to:
  /// **'Queue right now'**
  String get providerQueueNow;

  /// No description provided for @providerInLine.
  ///
  /// In en, this message translates to:
  /// **'{count} in line'**
  String providerInLine(int count);

  /// No description provided for @locationViewLocation.
  ///
  /// In en, this message translates to:
  /// **'View location'**
  String get locationViewLocation;

  /// No description provided for @locationGetDirections.
  ///
  /// In en, this message translates to:
  /// **'Get directions'**
  String get locationGetDirections;

  /// No description provided for @locationCouldNotOpenMaps.
  ///
  /// In en, this message translates to:
  /// **'Could not open Maps.'**
  String get locationCouldNotOpenMaps;

  /// No description provided for @providerFavorite.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get providerFavorite;

  /// No description provided for @providerUnfavorite.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get providerUnfavorite;

  /// No description provided for @providerBookNow.
  ///
  /// In en, this message translates to:
  /// **'Book now'**
  String get providerBookNow;

  /// No description provided for @providerClosedCannotBook.
  ///
  /// In en, this message translates to:
  /// **'This business is closed right now, but you can still request a booking.'**
  String get providerClosedCannotBook;

  /// No description provided for @providerHoursTitle.
  ///
  /// In en, this message translates to:
  /// **'Operating hours'**
  String get providerHoursTitle;

  /// No description provided for @providerHoursNotSet.
  ///
  /// In en, this message translates to:
  /// **'Hours not set'**
  String get providerHoursNotSet;

  /// No description provided for @providerHoursNone.
  ///
  /// In en, this message translates to:
  /// **'This provider hasn\'t set their operating hours yet.'**
  String get providerHoursNone;

  /// No description provided for @fuelGasoline95.
  ///
  /// In en, this message translates to:
  /// **'Gasoline 95'**
  String get fuelGasoline95;

  /// No description provided for @fuelGasoline98.
  ///
  /// In en, this message translates to:
  /// **'Gasoline 98'**
  String get fuelGasoline98;

  /// No description provided for @fuelDiesel.
  ///
  /// In en, this message translates to:
  /// **'Diesel / Solar'**
  String get fuelDiesel;

  /// No description provided for @fuelRemainingLabel.
  ///
  /// In en, this message translates to:
  /// **'Remaining'**
  String get fuelRemainingLabel;

  /// No description provided for @fuelCapacityLabel.
  ///
  /// In en, this message translates to:
  /// **'Capacity'**
  String get fuelCapacityLabel;

  /// No description provided for @fuelLastUpdatedLabel.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get fuelLastUpdatedLabel;

  /// No description provided for @fuelAvailabilityTitle.
  ///
  /// In en, this message translates to:
  /// **'Fuel Availability'**
  String get fuelAvailabilityTitle;

  /// No description provided for @fuelMyInventoryTitle.
  ///
  /// In en, this message translates to:
  /// **'My Fuel Inventory'**
  String get fuelMyInventoryTitle;

  /// No description provided for @fuelManagedByAdminNote.
  ///
  /// In en, this message translates to:
  /// **'Fuel inventory is managed by the platform administrator.'**
  String get fuelManagedByAdminNote;

  /// No description provided for @fuelHistoryTitle.
  ///
  /// In en, this message translates to:
  /// **'Fuel Remaining Over Time'**
  String get fuelHistoryTitle;

  /// No description provided for @fuelRange7d.
  ///
  /// In en, this message translates to:
  /// **'Last 7 days'**
  String get fuelRange7d;

  /// No description provided for @fuelRange30d.
  ///
  /// In en, this message translates to:
  /// **'Last 30 days'**
  String get fuelRange30d;

  /// No description provided for @fuelHistoryEmpty.
  ///
  /// In en, this message translates to:
  /// **'No fuel history recorded in this range yet.'**
  String get fuelHistoryEmpty;

  /// No description provided for @fuelHistorySinglePoint.
  ///
  /// In en, this message translates to:
  /// **'More history will appear as fuel levels are updated.'**
  String get fuelHistorySinglePoint;

  /// No description provided for @serviceDuration.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String serviceDuration(int minutes);

  /// No description provided for @bookingCreateTitle.
  ///
  /// In en, this message translates to:
  /// **'Book a service'**
  String get bookingCreateTitle;

  /// No description provided for @bookingSelectService.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get bookingSelectService;

  /// No description provided for @bookingSelectServiceHint.
  ///
  /// In en, this message translates to:
  /// **'Choose a service…'**
  String get bookingSelectServiceHint;

  /// No description provided for @bookingDateTime.
  ///
  /// In en, this message translates to:
  /// **'Date & time'**
  String get bookingDateTime;

  /// No description provided for @bookingNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes (optional)'**
  String get bookingNotes;

  /// No description provided for @bookingNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Anything the business should know…'**
  String get bookingNotesHint;

  /// No description provided for @bookingSubmit.
  ///
  /// In en, this message translates to:
  /// **'Request booking'**
  String get bookingSubmit;

  /// No description provided for @bookingCreated.
  ///
  /// In en, this message translates to:
  /// **'Booking requested'**
  String get bookingCreated;

  /// No description provided for @bookingErrorSelectService.
  ///
  /// In en, this message translates to:
  /// **'Select a service'**
  String get bookingErrorSelectService;

  /// No description provided for @bookingSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get bookingSelectDate;

  /// No description provided for @bookingOpenHours.
  ///
  /// In en, this message translates to:
  /// **'Open {opening} – {closing}'**
  String bookingOpenHours(String opening, String closing);

  /// No description provided for @bookingClosedOnDate.
  ///
  /// In en, this message translates to:
  /// **'This provider is closed on the selected date.'**
  String get bookingClosedOnDate;

  /// No description provided for @bookingHoursNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'This provider hasn\'t set their operating hours yet, so this date can\'t be booked.'**
  String get bookingHoursNotConfigured;

  /// No description provided for @bookingNoSlotsFit.
  ///
  /// In en, this message translates to:
  /// **'No time slots fit this service before closing on this date.'**
  String get bookingNoSlotsFit;

  /// No description provided for @bookingSlotBookedLabel.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get bookingSlotBookedLabel;

  /// No description provided for @bookingSlotPastLabel.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get bookingSlotPastLabel;

  /// No description provided for @bookingErrorSelectSlot.
  ///
  /// In en, this message translates to:
  /// **'Choose an available time slot'**
  String get bookingErrorSelectSlot;

  /// No description provided for @bookingConflictRetry.
  ///
  /// In en, this message translates to:
  /// **'That time was just booked by someone else. Pick another slot below.'**
  String get bookingConflictRetry;

  /// No description provided for @bookingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get bookingsTitle;

  /// No description provided for @bookingsActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get bookingsActive;

  /// No description provided for @bookingsHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get bookingsHistory;

  /// No description provided for @bookingsNoneActive.
  ///
  /// In en, this message translates to:
  /// **'You have no active bookings.'**
  String get bookingsNoneActive;

  /// No description provided for @bookingsNoneHistory.
  ///
  /// In en, this message translates to:
  /// **'No past bookings yet.'**
  String get bookingsNoneHistory;

  /// No description provided for @bookingsNone.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t booked anything yet.'**
  String get bookingsNone;

  /// No description provided for @bookingsFindProvider.
  ///
  /// In en, this message translates to:
  /// **'Find a business'**
  String get bookingsFindProvider;

  /// No description provided for @bookingDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Booking details'**
  String get bookingDetailsTitle;

  /// No description provided for @bookingStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get bookingStatusLabel;

  /// No description provided for @bookingDetailsSection.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get bookingDetailsSection;

  /// No description provided for @bookingService.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get bookingService;

  /// No description provided for @bookingCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get bookingCategory;

  /// No description provided for @bookingPrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get bookingPrice;

  /// No description provided for @bookingWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get bookingWhen;

  /// No description provided for @bookingBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get bookingBusiness;

  /// No description provided for @bookingCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel booking'**
  String get bookingCancel;

  /// No description provided for @bookingCancelConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this booking?'**
  String get bookingCancelConfirmTitle;

  /// No description provided for @bookingCancelConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'The business will be notified. This cannot be undone.'**
  String get bookingCancelConfirmBody;

  /// No description provided for @bookingCancelled.
  ///
  /// In en, this message translates to:
  /// **'Booking cancelled'**
  String get bookingCancelled;

  /// No description provided for @bookingNotFound.
  ///
  /// In en, this message translates to:
  /// **'This booking no longer exists.'**
  String get bookingNotFound;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get statusPending;

  /// No description provided for @statusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get statusConfirmed;

  /// No description provided for @statusArrived.
  ///
  /// In en, this message translates to:
  /// **'Arrived'**
  String get statusArrived;

  /// No description provided for @statusInQueue.
  ///
  /// In en, this message translates to:
  /// **'In queue'**
  String get statusInQueue;

  /// No description provided for @statusInService.
  ///
  /// In en, this message translates to:
  /// **'In service'**
  String get statusInService;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @statusRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get statusRejected;

  /// No description provided for @queueTitle.
  ///
  /// In en, this message translates to:
  /// **'Queue'**
  String get queueTitle;

  /// No description provided for @queueNotInLine.
  ///
  /// In en, this message translates to:
  /// **'You\'re not in a queue right now.'**
  String get queueNotInLine;

  /// No description provided for @queueNotInLineBody.
  ///
  /// In en, this message translates to:
  /// **'When a business adds you to their queue, your place appears here.'**
  String get queueNotInLineBody;

  /// No description provided for @queuePosition.
  ///
  /// In en, this message translates to:
  /// **'You are #{position} in line'**
  String queuePosition(int position);

  /// No description provided for @queueYoureNext.
  ///
  /// In en, this message translates to:
  /// **'You\'re next'**
  String get queueYoureNext;

  /// No description provided for @queueAhead.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nobody ahead of you} =1{1 customer ahead} other{{count} customers ahead}}'**
  String queueAhead(int count);

  /// No description provided for @queueEstimatedWait.
  ///
  /// In en, this message translates to:
  /// **'Estimated wait: {minutes} min'**
  String queueEstimatedWait(int minutes);

  /// No description provided for @queueBeingServed.
  ///
  /// In en, this message translates to:
  /// **'You\'re being served now'**
  String get queueBeingServed;

  /// No description provided for @queueServedBody.
  ///
  /// In en, this message translates to:
  /// **'Enjoy your service.'**
  String get queueServedBody;

  /// No description provided for @queueDone.
  ///
  /// In en, this message translates to:
  /// **'Service completed'**
  String get queueDone;

  /// No description provided for @queueRemoved.
  ///
  /// In en, this message translates to:
  /// **'Removed from the queue'**
  String get queueRemoved;

  /// No description provided for @queueStayNearby.
  ///
  /// In en, this message translates to:
  /// **'Please stay nearby — you\'ll be called when it\'s your turn.'**
  String get queueStayNearby;

  /// No description provided for @queueWaitingToJoin.
  ///
  /// In en, this message translates to:
  /// **'Waiting to be added to the queue'**
  String get queueWaitingToJoin;

  /// No description provided for @queueWaitingToJoinBody.
  ///
  /// In en, this message translates to:
  /// **'Let the front desk know you\'ve arrived.'**
  String get queueWaitingToJoinBody;

  /// No description provided for @queueRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get queueRefresh;

  /// No description provided for @queueLiveNote.
  ///
  /// In en, this message translates to:
  /// **'Numbers update when you refresh.'**
  String get queueLiveNote;

  /// No description provided for @reviewWriteTitle.
  ///
  /// In en, this message translates to:
  /// **'Write a review'**
  String get reviewWriteTitle;

  /// No description provided for @reviewYourRating.
  ///
  /// In en, this message translates to:
  /// **'Your rating'**
  String get reviewYourRating;

  /// No description provided for @reviewComment.
  ///
  /// In en, this message translates to:
  /// **'Comment (optional)'**
  String get reviewComment;

  /// No description provided for @reviewCommentHint.
  ///
  /// In en, this message translates to:
  /// **'How was the service?'**
  String get reviewCommentHint;

  /// No description provided for @reviewSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit review'**
  String get reviewSubmit;

  /// No description provided for @reviewSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Thanks for your review'**
  String get reviewSubmitted;

  /// No description provided for @reviewErrorRating.
  ///
  /// In en, this message translates to:
  /// **'Choose a rating from 1 to 5'**
  String get reviewErrorRating;

  /// No description provided for @reviewLeaveOne.
  ///
  /// In en, this message translates to:
  /// **'Leave a review'**
  String get reviewLeaveOne;

  /// No description provided for @reviewYours.
  ///
  /// In en, this message translates to:
  /// **'Your review'**
  String get reviewYours;

  /// No description provided for @reviewDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete review'**
  String get reviewDelete;

  /// No description provided for @reviewDeleteConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete your review?'**
  String get reviewDeleteConfirmTitle;

  /// No description provided for @reviewDeleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This removes it from the business\'s rating. This cannot be undone.'**
  String get reviewDeleteConfirmBody;

  /// No description provided for @reviewDeleted.
  ///
  /// In en, this message translates to:
  /// **'Review deleted'**
  String get reviewDeleted;

  /// No description provided for @reviewOnlyAfterCompleted.
  ///
  /// In en, this message translates to:
  /// **'You can review a business after they complete your booking.'**
  String get reviewOnlyAfterCompleted;

  /// No description provided for @myReviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Reviews'**
  String get myReviewsTitle;

  /// No description provided for @myReviewsEmpty.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t reviewed any bookings yet.'**
  String get myReviewsEmpty;

  /// No description provided for @myComplaintsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Complaints'**
  String get myComplaintsTitle;

  /// No description provided for @myComplaintsEmpty.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t filed any complaints.'**
  String get myComplaintsEmpty;

  /// No description provided for @complaintFile.
  ///
  /// In en, this message translates to:
  /// **'File a complaint'**
  String get complaintFile;

  /// No description provided for @complaintFileTitle.
  ///
  /// In en, this message translates to:
  /// **'File a complaint'**
  String get complaintFileTitle;

  /// No description provided for @complaintBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get complaintBusiness;

  /// No description provided for @complaintSubject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get complaintSubject;

  /// No description provided for @complaintSeverity.
  ///
  /// In en, this message translates to:
  /// **'Severity'**
  String get complaintSeverity;

  /// No description provided for @complaintDetails.
  ///
  /// In en, this message translates to:
  /// **'Details (optional)'**
  String get complaintDetails;

  /// No description provided for @complaintSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit complaint'**
  String get complaintSubmit;

  /// No description provided for @complaintSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Complaint submitted'**
  String get complaintSubmitted;

  /// No description provided for @complaintErrorProvider.
  ///
  /// In en, this message translates to:
  /// **'Choose a business'**
  String get complaintErrorProvider;

  /// No description provided for @complaintErrorSubject.
  ///
  /// In en, this message translates to:
  /// **'Subject is required'**
  String get complaintErrorSubject;

  /// No description provided for @favoritesTitle.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get favoritesTitle;

  /// No description provided for @favoritesEmpty.
  ///
  /// In en, this message translates to:
  /// **'Save a business from its page to find it here later.'**
  String get favoritesEmpty;

  /// No description provided for @myVehiclesTitle.
  ///
  /// In en, this message translates to:
  /// **'My Vehicles'**
  String get myVehiclesTitle;

  /// No description provided for @myVehiclesEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add a vehicle so it\'s on hand the next time you book a service.'**
  String get myVehiclesEmpty;

  /// No description provided for @vehicleAdd.
  ///
  /// In en, this message translates to:
  /// **'Add vehicle'**
  String get vehicleAdd;

  /// No description provided for @vehicleEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit vehicle'**
  String get vehicleEdit;

  /// No description provided for @vehicleMake.
  ///
  /// In en, this message translates to:
  /// **'Make'**
  String get vehicleMake;

  /// No description provided for @vehicleModel.
  ///
  /// In en, this message translates to:
  /// **'Model'**
  String get vehicleModel;

  /// No description provided for @vehicleYear.
  ///
  /// In en, this message translates to:
  /// **'Year'**
  String get vehicleYear;

  /// No description provided for @vehiclePlate.
  ///
  /// In en, this message translates to:
  /// **'Plate (optional)'**
  String get vehiclePlate;

  /// No description provided for @vehicleColor.
  ///
  /// In en, this message translates to:
  /// **'Color (optional)'**
  String get vehicleColor;

  /// No description provided for @vehicleFuelType.
  ///
  /// In en, this message translates to:
  /// **'Fuel type (optional)'**
  String get vehicleFuelType;

  /// No description provided for @vehicleFuelTypeNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get vehicleFuelTypeNotSet;

  /// No description provided for @vehicleSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get vehicleSaveChanges;

  /// No description provided for @vehicleAdded.
  ///
  /// In en, this message translates to:
  /// **'Vehicle added'**
  String get vehicleAdded;

  /// No description provided for @vehicleUpdated.
  ///
  /// In en, this message translates to:
  /// **'Vehicle updated'**
  String get vehicleUpdated;

  /// No description provided for @vehicleDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete vehicle'**
  String get vehicleDelete;

  /// No description provided for @vehicleDeleteConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove this vehicle?'**
  String get vehicleDeleteConfirmTitle;

  /// No description provided for @vehicleDeleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This cannot be undone.'**
  String get vehicleDeleteConfirmBody;

  /// No description provided for @vehicleDeleted.
  ///
  /// In en, this message translates to:
  /// **'Vehicle removed'**
  String get vehicleDeleted;

  /// No description provided for @vehicleErrorMake.
  ///
  /// In en, this message translates to:
  /// **'Make is required'**
  String get vehicleErrorMake;

  /// No description provided for @vehicleErrorModel.
  ///
  /// In en, this message translates to:
  /// **'Model is required'**
  String get vehicleErrorModel;

  /// No description provided for @vehicleErrorYear.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid year'**
  String get vehicleErrorYear;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileTitle;

  /// No description provided for @profileAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get profileAccount;

  /// No description provided for @profilePreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get profilePreferences;

  /// No description provided for @profileRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get profileRole;

  /// No description provided for @profileNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get profileNotSet;

  /// No description provided for @profileUnsupportedTitle.
  ///
  /// In en, this message translates to:
  /// **'Not available yet'**
  String get profileUnsupportedTitle;

  /// No description provided for @profileEditUnsupported.
  ///
  /// In en, this message translates to:
  /// **'Editing your profile needs a backend endpoint that doesn\'t exist yet.'**
  String get profileEditUnsupported;

  /// No description provided for @profileUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Unavailable'**
  String get profileUnavailable;

  /// No description provided for @profileChangePasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get profileChangePasswordTitle;

  /// No description provided for @fieldCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get fieldCurrentPassword;

  /// No description provided for @fieldNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get fieldNewPassword;

  /// No description provided for @fieldConfirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get fieldConfirmPassword;

  /// No description provided for @changePasswordSubmit.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get changePasswordSubmit;

  /// No description provided for @changePasswordSuccess.
  ///
  /// In en, this message translates to:
  /// **'Password changed successfully'**
  String get changePasswordSuccess;

  /// No description provided for @changePasswordMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match'**
  String get changePasswordMismatch;

  /// No description provided for @changePasswordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 6 characters'**
  String get changePasswordTooShort;

  /// No description provided for @pNavOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get pNavOverview;

  /// No description provided for @pNavBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get pNavBookings;

  /// No description provided for @pNavQueue.
  ///
  /// In en, this message translates to:
  /// **'Queue'**
  String get pNavQueue;

  /// No description provided for @pNavServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get pNavServices;

  /// No description provided for @pNavMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get pNavMore;

  /// No description provided for @pOverviewWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome back, {name}'**
  String pOverviewWelcome(String name);

  /// No description provided for @pOverviewApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get pOverviewApproved;

  /// No description provided for @pOverviewPending.
  ///
  /// In en, this message translates to:
  /// **'Pending approval'**
  String get pOverviewPending;

  /// No description provided for @pOverviewPendingBody.
  ///
  /// In en, this message translates to:
  /// **'Customers can\'t find your business until an administrator approves it.'**
  String get pOverviewPendingBody;

  /// No description provided for @pOverviewOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get pOverviewOpen;

  /// No description provided for @pOverviewClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get pOverviewClosed;

  /// No description provided for @pOverviewQueueLength.
  ///
  /// In en, this message translates to:
  /// **'In line'**
  String get pOverviewQueueLength;

  /// No description provided for @pOverviewWait.
  ///
  /// In en, this message translates to:
  /// **'Est. wait'**
  String get pOverviewWait;

  /// No description provided for @pOverviewToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get pOverviewToday;

  /// No description provided for @pOverviewCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get pOverviewCompleted;

  /// No description provided for @pOverviewRating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get pOverviewRating;

  /// No description provided for @pOverviewReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get pOverviewReviews;

  /// No description provided for @pOverviewRecentReviews.
  ///
  /// In en, this message translates to:
  /// **'Recent reviews'**
  String get pOverviewRecentReviews;

  /// No description provided for @pOverviewNoReviews.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get pOverviewNoReviews;

  /// No description provided for @pOverviewQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get pOverviewQuickActions;

  /// No description provided for @pOverviewNextCustomer.
  ///
  /// In en, this message translates to:
  /// **'Start next customer'**
  String get pOverviewNextCustomer;

  /// No description provided for @pOverviewAddWalkIn.
  ///
  /// In en, this message translates to:
  /// **'Add walk-in'**
  String get pOverviewAddWalkIn;

  /// No description provided for @pOverviewViewQueue.
  ///
  /// In en, this message translates to:
  /// **'View queue'**
  String get pOverviewViewQueue;

  /// No description provided for @pOverviewPendingBookings.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No bookings need attention} =1{1 booking needs attention} other{{count} bookings need attention}}'**
  String pOverviewPendingBookings(int count);

  /// No description provided for @pBookingsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get pBookingsAll;

  /// No description provided for @pBookingsNeedsAction.
  ///
  /// In en, this message translates to:
  /// **'Needs action'**
  String get pBookingsNeedsAction;

  /// No description provided for @pBookingsToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get pBookingsToday;

  /// No description provided for @pBookingsUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get pBookingsUpcoming;

  /// No description provided for @pBookingsPast.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get pBookingsPast;

  /// No description provided for @pBookingsNone.
  ///
  /// In en, this message translates to:
  /// **'No bookings yet.'**
  String get pBookingsNone;

  /// No description provided for @pBookingsNoneMatch.
  ///
  /// In en, this message translates to:
  /// **'No bookings match these filters.'**
  String get pBookingsNoneMatch;

  /// No description provided for @pBookingsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search customer or service…'**
  String get pBookingsSearchHint;

  /// No description provided for @pBookingCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get pBookingCustomer;

  /// No description provided for @pBookingContact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get pBookingContact;

  /// No description provided for @pBookingConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm booking'**
  String get pBookingConfirm;

  /// No description provided for @pBookingReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get pBookingReject;

  /// No description provided for @pBookingMarkArrived.
  ///
  /// In en, this message translates to:
  /// **'Mark as arrived'**
  String get pBookingMarkArrived;

  /// No description provided for @pBookingAddToQueue.
  ///
  /// In en, this message translates to:
  /// **'Add to queue'**
  String get pBookingAddToQueue;

  /// No description provided for @pBookingStartService.
  ///
  /// In en, this message translates to:
  /// **'Start service'**
  String get pBookingStartService;

  /// No description provided for @pBookingCompleteService.
  ///
  /// In en, this message translates to:
  /// **'Complete service'**
  String get pBookingCompleteService;

  /// No description provided for @pBookingRemoveFromQueue.
  ///
  /// In en, this message translates to:
  /// **'Remove from queue'**
  String get pBookingRemoveFromQueue;

  /// No description provided for @pBookingCancelBooking.
  ///
  /// In en, this message translates to:
  /// **'Cancel booking'**
  String get pBookingCancelBooking;

  /// No description provided for @pBookingNextStep.
  ///
  /// In en, this message translates to:
  /// **'Next step'**
  String get pBookingNextStep;

  /// No description provided for @pBookingNoActions.
  ///
  /// In en, this message translates to:
  /// **'Nothing left to do for this booking.'**
  String get pBookingNoActions;

  /// No description provided for @pBookingQueueEntry.
  ///
  /// In en, this message translates to:
  /// **'Queue entry'**
  String get pBookingQueueEntry;

  /// No description provided for @pBookingPositionInLine.
  ///
  /// In en, this message translates to:
  /// **'Position in line'**
  String get pBookingPositionInLine;

  /// No description provided for @pConfirmRejectTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject this booking?'**
  String get pConfirmRejectTitle;

  /// No description provided for @pConfirmRejectBody.
  ///
  /// In en, this message translates to:
  /// **'The customer will be told their request was declined. This cannot be undone.'**
  String get pConfirmRejectBody;

  /// No description provided for @pConfirmCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this booking?'**
  String get pConfirmCancelTitle;

  /// No description provided for @pConfirmCancelBody.
  ///
  /// In en, this message translates to:
  /// **'The customer will be notified. This cannot be undone.'**
  String get pConfirmCancelBody;

  /// No description provided for @pConfirmRemoveQueueTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove from queue?'**
  String get pConfirmRemoveQueueTitle;

  /// No description provided for @pConfirmRemoveQueueBody.
  ///
  /// In en, this message translates to:
  /// **'This drops the customer out of the line and cancels their booking.'**
  String get pConfirmRemoveQueueBody;

  /// No description provided for @pConfirmCompleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Complete service?'**
  String get pConfirmCompleteTitle;

  /// No description provided for @pConfirmCompleteBody.
  ///
  /// In en, this message translates to:
  /// **'This marks the service finished and closes the booking.'**
  String get pConfirmCompleteBody;

  /// No description provided for @pActionDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get pActionDone;

  /// No description provided for @pQueueWaiting.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get pQueueWaiting;

  /// No description provided for @pQueueInService.
  ///
  /// In en, this message translates to:
  /// **'In service'**
  String get pQueueInService;

  /// No description provided for @pQueueEmpty.
  ///
  /// In en, this message translates to:
  /// **'The queue is empty.'**
  String get pQueueEmpty;

  /// No description provided for @pQueueEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add a walk-in customer or check an arrived booking in.'**
  String get pQueueEmptyBody;

  /// No description provided for @pQueueNoneWaiting.
  ///
  /// In en, this message translates to:
  /// **'Nobody is waiting.'**
  String get pQueueNoneWaiting;

  /// No description provided for @pQueueNoneInService.
  ///
  /// In en, this message translates to:
  /// **'Nobody is being served.'**
  String get pQueueNoneInService;

  /// No description provided for @pQueueCurrent.
  ///
  /// In en, this message translates to:
  /// **'Now serving'**
  String get pQueueCurrent;

  /// No description provided for @pQueueNext.
  ///
  /// In en, this message translates to:
  /// **'Next up'**
  String get pQueueNext;

  /// No description provided for @pQueueMoveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get pQueueMoveUp;

  /// No description provided for @pQueueMoveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get pQueueMoveDown;

  /// No description provided for @pQueueReordered.
  ///
  /// In en, this message translates to:
  /// **'Queue order saved'**
  String get pQueueReordered;

  /// No description provided for @pWalkInTitle.
  ///
  /// In en, this message translates to:
  /// **'Add walk-in customer'**
  String get pWalkInTitle;

  /// No description provided for @pWalkInName.
  ///
  /// In en, this message translates to:
  /// **'Customer name'**
  String get pWalkInName;

  /// No description provided for @pWalkInService.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get pWalkInService;

  /// No description provided for @pWalkInAdd.
  ///
  /// In en, this message translates to:
  /// **'Add to queue'**
  String get pWalkInAdd;

  /// No description provided for @pWalkInNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the customer\'s name'**
  String get pWalkInNameRequired;

  /// No description provided for @pWalkInServiceRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose a service'**
  String get pWalkInServiceRequired;

  /// No description provided for @pWalkInAdded.
  ///
  /// In en, this message translates to:
  /// **'Added to the queue'**
  String get pWalkInAdded;

  /// No description provided for @pServicesNone.
  ///
  /// In en, this message translates to:
  /// **'No services yet.'**
  String get pServicesNone;

  /// No description provided for @pServicesNoneBody.
  ///
  /// In en, this message translates to:
  /// **'Add the services your business offers so customers can book them.'**
  String get pServicesNoneBody;

  /// No description provided for @pServicesAdd.
  ///
  /// In en, this message translates to:
  /// **'Add service'**
  String get pServicesAdd;

  /// No description provided for @pServicesEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit service'**
  String get pServicesEdit;

  /// No description provided for @pServiceName.
  ///
  /// In en, this message translates to:
  /// **'Service name'**
  String get pServiceName;

  /// No description provided for @pServiceCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get pServiceCategory;

  /// No description provided for @pServicePrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get pServicePrice;

  /// No description provided for @pServiceDuration.
  ///
  /// In en, this message translates to:
  /// **'Duration (minutes)'**
  String get pServiceDuration;

  /// No description provided for @pServiceAvailable.
  ///
  /// In en, this message translates to:
  /// **'Available for booking'**
  String get pServiceAvailable;

  /// No description provided for @pServiceSaved.
  ///
  /// In en, this message translates to:
  /// **'Service saved'**
  String get pServiceSaved;

  /// No description provided for @pServiceDeleted.
  ///
  /// In en, this message translates to:
  /// **'Service deleted'**
  String get pServiceDeleted;

  /// No description provided for @pServiceDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this service?'**
  String get pServiceDeleteTitle;

  /// No description provided for @pServiceDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'Services with bookings or queue history can\'t be deleted — mark them unavailable instead.'**
  String get pServiceDeleteBody;

  /// No description provided for @pServiceNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a service name'**
  String get pServiceNameRequired;

  /// No description provided for @pServicePriceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a price greater than 0'**
  String get pServicePriceInvalid;

  /// No description provided for @pServiceDurationInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a duration greater than 0'**
  String get pServiceDurationInvalid;

  /// No description provided for @pServiceNoCategories.
  ///
  /// In en, this message translates to:
  /// **'An administrator needs to create a service category first.'**
  String get pServiceNoCategories;

  /// No description provided for @pProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'Business profile'**
  String get pProfileTitle;

  /// No description provided for @pProfileBusinessDetails.
  ///
  /// In en, this message translates to:
  /// **'Business details'**
  String get pProfileBusinessDetails;

  /// No description provided for @pProfileBusinessName.
  ///
  /// In en, this message translates to:
  /// **'Business name'**
  String get pProfileBusinessName;

  /// No description provided for @pProfileDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get pProfileDescription;

  /// No description provided for @pProfileDescriptionHint.
  ///
  /// In en, this message translates to:
  /// **'Tell customers what your business does…'**
  String get pProfileDescriptionHint;

  /// No description provided for @pProfileAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get pProfileAddress;

  /// No description provided for @pProfileContact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get pProfileContact;

  /// No description provided for @pProfilePhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get pProfilePhone;

  /// No description provided for @pProfileContactName.
  ///
  /// In en, this message translates to:
  /// **'Contact name'**
  String get pProfileContactName;

  /// No description provided for @pProfileEmailReadOnly.
  ///
  /// In en, this message translates to:
  /// **'Email is your sign-in identity and can\'t be changed here.'**
  String get pProfileEmailReadOnly;

  /// No description provided for @pProfileLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get pProfileLocation;

  /// No description provided for @pProfileLatitude.
  ///
  /// In en, this message translates to:
  /// **'Latitude'**
  String get pProfileLatitude;

  /// No description provided for @pProfileLongitude.
  ///
  /// In en, this message translates to:
  /// **'Longitude'**
  String get pProfileLongitude;

  /// No description provided for @pProfileLocationHint.
  ///
  /// In en, this message translates to:
  /// **'Used to rank your business by distance in customer search.'**
  String get pProfileLocationHint;

  /// No description provided for @pProfileUseCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use current location'**
  String get pProfileUseCurrentLocation;

  /// No description provided for @pProfilePreviewOnMap.
  ///
  /// In en, this message translates to:
  /// **'Preview on map'**
  String get pProfilePreviewOnMap;

  /// No description provided for @pProfileLocationDenied.
  ///
  /// In en, this message translates to:
  /// **'Could not get your current location. Check your permissions and try again.'**
  String get pProfileLocationDenied;

  /// No description provided for @pProfileSave.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get pProfileSave;

  /// No description provided for @pProfileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile updated'**
  String get pProfileSaved;

  /// No description provided for @pHoursTitle.
  ///
  /// In en, this message translates to:
  /// **'Operating hours'**
  String get pHoursTitle;

  /// No description provided for @pHoursSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Shown to customers, and used to decide which times they can book.'**
  String get pHoursSubtitle;

  /// No description provided for @pHoursClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get pHoursClosed;

  /// No description provided for @pHoursOpensLabel.
  ///
  /// In en, this message translates to:
  /// **'Opens'**
  String get pHoursOpensLabel;

  /// No description provided for @pHoursClosesLabel.
  ///
  /// In en, this message translates to:
  /// **'Closes'**
  String get pHoursClosesLabel;

  /// No description provided for @pHoursSave.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get pHoursSave;

  /// No description provided for @pHoursDiscard.
  ///
  /// In en, this message translates to:
  /// **'Discard changes'**
  String get pHoursDiscard;

  /// No description provided for @pHoursSaved.
  ///
  /// In en, this message translates to:
  /// **'Operating hours saved'**
  String get pHoursSaved;

  /// No description provided for @pHoursErrorCloseBeforeOpen.
  ///
  /// In en, this message translates to:
  /// **'Closing time must be after opening time'**
  String get pHoursErrorCloseBeforeOpen;

  /// No description provided for @pProfileNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Business name is required'**
  String get pProfileNameRequired;

  /// No description provided for @pProfileAddressRequired.
  ///
  /// In en, this message translates to:
  /// **'Address is required'**
  String get pProfileAddressRequired;

  /// No description provided for @pProfileCoordinateInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid coordinate'**
  String get pProfileCoordinateInvalid;

  /// No description provided for @pLiveTitle.
  ///
  /// In en, this message translates to:
  /// **'Live status'**
  String get pLiveTitle;

  /// No description provided for @pLiveOpenForBusiness.
  ///
  /// In en, this message translates to:
  /// **'Open for business'**
  String get pLiveOpenForBusiness;

  /// No description provided for @pLiveOpenBody.
  ///
  /// In en, this message translates to:
  /// **'Customers can find you in search and book your available services.'**
  String get pLiveOpenBody;

  /// No description provided for @pLiveClosedBody.
  ///
  /// In en, this message translates to:
  /// **'You are shown as closed. Existing bookings are unaffected.'**
  String get pLiveClosedBody;

  /// No description provided for @pLiveNotApproved.
  ///
  /// In en, this message translates to:
  /// **'Your business is still pending approval, so it won\'t appear in customer search yet.'**
  String get pLiveNotApproved;

  /// No description provided for @pLiveAdvertisedWait.
  ///
  /// In en, this message translates to:
  /// **'Advertised wait time'**
  String get pLiveAdvertisedWait;

  /// No description provided for @pLiveAdvertisedWaitBody.
  ///
  /// In en, this message translates to:
  /// **'Shown on your public profile. The live average is measured from your actual queue.'**
  String get pLiveAdvertisedWaitBody;

  /// No description provided for @pLiveMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minutes'**
  String get pLiveMinutes;

  /// No description provided for @pLiveSaved.
  ///
  /// In en, this message translates to:
  /// **'Live status updated'**
  String get pLiveSaved;

  /// No description provided for @pLiveNowOpen.
  ///
  /// In en, this message translates to:
  /// **'You\'re now open'**
  String get pLiveNowOpen;

  /// No description provided for @pLiveNowClosed.
  ///
  /// In en, this message translates to:
  /// **'You\'re now closed'**
  String get pLiveNowClosed;

  /// No description provided for @pLiveLiveAverage.
  ///
  /// In en, this message translates to:
  /// **'Live average'**
  String get pLiveLiveAverage;

  /// No description provided for @pLiveBeingServed.
  ///
  /// In en, this message translates to:
  /// **'Being served'**
  String get pLiveBeingServed;

  /// No description provided for @pReviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get pReviewsTitle;

  /// No description provided for @pReviewsAverage.
  ///
  /// In en, this message translates to:
  /// **'Average rating'**
  String get pReviewsAverage;

  /// No description provided for @pReviewsTotal.
  ///
  /// In en, this message translates to:
  /// **'Total reviews'**
  String get pReviewsTotal;

  /// No description provided for @pReviewsNone.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get pReviewsNone;

  /// No description provided for @pReviewsNoneBody.
  ///
  /// In en, this message translates to:
  /// **'Customers can review you after you complete their booking.'**
  String get pReviewsNoneBody;

  /// No description provided for @pReviewsNoReplies.
  ///
  /// In en, this message translates to:
  /// **'Replying to reviews isn\'t available — the database has no field to store a response.'**
  String get pReviewsNoReplies;

  /// No description provided for @pReviewsFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All ratings'**
  String get pReviewsFilterAll;

  /// No description provided for @pAnalyticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get pAnalyticsTitle;

  /// No description provided for @pAnalyticsRange7.
  ///
  /// In en, this message translates to:
  /// **'Last 7 days'**
  String get pAnalyticsRange7;

  /// No description provided for @pAnalyticsRange30.
  ///
  /// In en, this message translates to:
  /// **'Last 30 days'**
  String get pAnalyticsRange30;

  /// No description provided for @pAnalyticsRange90.
  ///
  /// In en, this message translates to:
  /// **'Last 90 days'**
  String get pAnalyticsRange90;

  /// No description provided for @pAnalyticsTotal.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get pAnalyticsTotal;

  /// No description provided for @pAnalyticsCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get pAnalyticsCompleted;

  /// No description provided for @pAnalyticsCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get pAnalyticsCancelled;

  /// No description provided for @pAnalyticsCancelRate.
  ///
  /// In en, this message translates to:
  /// **'Cancellation rate'**
  String get pAnalyticsCancelRate;

  /// No description provided for @pAnalyticsAvgWait.
  ///
  /// In en, this message translates to:
  /// **'Avg. wait'**
  String get pAnalyticsAvgWait;

  /// No description provided for @pAnalyticsAvgRating.
  ///
  /// In en, this message translates to:
  /// **'Avg. rating'**
  String get pAnalyticsAvgRating;

  /// No description provided for @pAnalyticsQueueHandled.
  ///
  /// In en, this message translates to:
  /// **'Queue entries'**
  String get pAnalyticsQueueHandled;

  /// No description provided for @pAnalyticsPopular.
  ///
  /// In en, this message translates to:
  /// **'Popular services'**
  String get pAnalyticsPopular;

  /// No description provided for @pAnalyticsBusy.
  ///
  /// In en, this message translates to:
  /// **'Busy hours'**
  String get pAnalyticsBusy;

  /// No description provided for @pAnalyticsBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Booking status'**
  String get pAnalyticsBreakdown;

  /// No description provided for @pAnalyticsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No activity in this range.'**
  String get pAnalyticsEmpty;

  /// No description provided for @pAnalyticsNoRevenue.
  ///
  /// In en, this message translates to:
  /// **'Revenue is tracked separately — see Finance for real commission and earnings figures.'**
  String get pAnalyticsNoRevenue;

  /// No description provided for @pFinanceTitle.
  ///
  /// In en, this message translates to:
  /// **'My Earnings'**
  String get pFinanceTitle;

  /// No description provided for @pFinanceCommissionLabel.
  ///
  /// In en, this message translates to:
  /// **'Platform commission'**
  String get pFinanceCommissionLabel;

  /// No description provided for @pFinanceCommissionPaid.
  ///
  /// In en, this message translates to:
  /// **'Platform Fees'**
  String get pFinanceCommissionPaid;

  /// No description provided for @pFinanceNetEarnings.
  ///
  /// In en, this message translates to:
  /// **'Net Earnings'**
  String get pFinanceNetEarnings;

  /// No description provided for @pFinancePending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pFinancePending;

  /// No description provided for @pFinanceSettled.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get pFinanceSettled;

  /// No description provided for @pFinanceTrend.
  ///
  /// In en, this message translates to:
  /// **'Net Earnings Over Time'**
  String get pFinanceTrend;

  /// No description provided for @pFinanceTransactions.
  ///
  /// In en, this message translates to:
  /// **'Transaction History'**
  String get pFinanceTransactions;

  /// No description provided for @pFinanceNoTransactions.
  ///
  /// In en, this message translates to:
  /// **'No earnings yet'**
  String get pFinanceNoTransactions;

  /// No description provided for @pFinanceReadOnlyNote.
  ///
  /// In en, this message translates to:
  /// **'Set by the platform admin. You cannot edit this — changes only ever apply to future completed bookings.'**
  String get pFinanceReadOnlyNote;

  /// No description provided for @pMoreTitle.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get pMoreTitle;

  /// No description provided for @pMoreBusinessProfile.
  ///
  /// In en, this message translates to:
  /// **'Business profile'**
  String get pMoreBusinessProfile;

  /// No description provided for @pMoreLiveStatus.
  ///
  /// In en, this message translates to:
  /// **'Live status'**
  String get pMoreLiveStatus;

  /// No description provided for @pMoreReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get pMoreReviews;

  /// No description provided for @pMoreAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get pMoreAnalytics;

  /// No description provided for @pMoreFinance.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get pMoreFinance;

  /// No description provided for @pMoreAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get pMoreAccount;

  /// No description provided for @pMorePreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get pMorePreferences;

  /// No description provided for @realtimeLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get realtimeLive;

  /// No description provided for @realtimeOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline'**
  String get realtimeOffline;

  /// No description provided for @realtimeReconnecting.
  ///
  /// In en, this message translates to:
  /// **'Reconnecting…'**
  String get realtimeReconnecting;

  /// No description provided for @queueLiveUpdating.
  ///
  /// In en, this message translates to:
  /// **'Updating automatically.'**
  String get queueLiveUpdating;

  /// No description provided for @commonKm.
  ///
  /// In en, this message translates to:
  /// **'km'**
  String get commonKm;

  /// No description provided for @commonRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get commonRefresh;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get commonBack;

  /// No description provided for @aNavOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get aNavOverview;

  /// No description provided for @aNavProviders.
  ///
  /// In en, this message translates to:
  /// **'Businesses'**
  String get aNavProviders;

  /// No description provided for @aNavBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get aNavBookings;

  /// No description provided for @aNavComplaints.
  ///
  /// In en, this message translates to:
  /// **'Complaints'**
  String get aNavComplaints;

  /// No description provided for @aNavMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get aNavMore;

  /// No description provided for @aOverviewUsers.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get aOverviewUsers;

  /// No description provided for @aOverviewCustomers.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get aOverviewCustomers;

  /// No description provided for @aOverviewProviderAccounts.
  ///
  /// In en, this message translates to:
  /// **'Provider accounts'**
  String get aOverviewProviderAccounts;

  /// No description provided for @aOverviewAdmins.
  ///
  /// In en, this message translates to:
  /// **'Admins'**
  String get aOverviewAdmins;

  /// No description provided for @aOverviewBusinesses.
  ///
  /// In en, this message translates to:
  /// **'Businesses'**
  String get aOverviewBusinesses;

  /// No description provided for @aOverviewApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get aOverviewApproved;

  /// No description provided for @aOverviewPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get aOverviewPending;

  /// No description provided for @aOverviewOpenNow.
  ///
  /// In en, this message translates to:
  /// **'Open now'**
  String get aOverviewOpenNow;

  /// No description provided for @aOverviewBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get aOverviewBookings;

  /// No description provided for @aOverviewActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get aOverviewActive;

  /// No description provided for @aOverviewCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get aOverviewCompleted;

  /// No description provided for @aOverviewCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get aOverviewCancelled;

  /// No description provided for @aOverviewRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get aOverviewRejected;

  /// No description provided for @aOverviewQueueNow.
  ///
  /// In en, this message translates to:
  /// **'In queue now'**
  String get aOverviewQueueNow;

  /// No description provided for @aOverviewReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aOverviewReviews;

  /// No description provided for @aOverviewAvgRating.
  ///
  /// In en, this message translates to:
  /// **'Average rating'**
  String get aOverviewAvgRating;

  /// No description provided for @aOverviewCatalog.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get aOverviewCatalog;

  /// No description provided for @aOverviewCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get aOverviewCategories;

  /// No description provided for @aOverviewServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get aOverviewServices;

  /// No description provided for @aOverviewComplaintsOpen.
  ///
  /// In en, this message translates to:
  /// **'Open complaints'**
  String get aOverviewComplaintsOpen;

  /// No description provided for @aOverviewComplaintsTotal.
  ///
  /// In en, this message translates to:
  /// **'Total complaints'**
  String get aOverviewComplaintsTotal;

  /// No description provided for @aOverviewRecentRegistrations.
  ///
  /// In en, this message translates to:
  /// **'Recent registrations'**
  String get aOverviewRecentRegistrations;

  /// No description provided for @aOverviewPendingApprovals.
  ///
  /// In en, this message translates to:
  /// **'Pending approvals'**
  String get aOverviewPendingApprovals;

  /// No description provided for @aOverviewRecentComplaints.
  ///
  /// In en, this message translates to:
  /// **'Recent complaints'**
  String get aOverviewRecentComplaints;

  /// No description provided for @aOverviewNothingPending.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for approval.'**
  String get aOverviewNothingPending;

  /// No description provided for @aOverviewNoComplaints.
  ///
  /// In en, this message translates to:
  /// **'No complaints have been filed.'**
  String get aOverviewNoComplaints;

  /// No description provided for @aOverviewNoRegistrations.
  ///
  /// In en, this message translates to:
  /// **'No recent registrations.'**
  String get aOverviewNoRegistrations;

  /// No description provided for @aOverviewQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get aOverviewQuickActions;

  /// No description provided for @aOverviewViewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get aOverviewViewAll;

  /// No description provided for @aUsersTitle.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get aUsersTitle;

  /// No description provided for @aUsersSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search by name or email'**
  String get aUsersSearchHint;

  /// No description provided for @aUsersAllRoles.
  ///
  /// In en, this message translates to:
  /// **'All roles'**
  String get aUsersAllRoles;

  /// No description provided for @aUsersNoResults.
  ///
  /// In en, this message translates to:
  /// **'No users match this filter.'**
  String get aUsersNoResults;

  /// No description provided for @aUsersJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get aUsersJoined;

  /// No description provided for @aUsersBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get aUsersBookings;

  /// No description provided for @aUsersReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aUsersReviews;

  /// No description provided for @aUsersComplaints.
  ///
  /// In en, this message translates to:
  /// **'Complaints'**
  String get aUsersComplaints;

  /// No description provided for @aUsersDetails.
  ///
  /// In en, this message translates to:
  /// **'User details'**
  String get aUsersDetails;

  /// No description provided for @aUsersRecentBookings.
  ///
  /// In en, this message translates to:
  /// **'Recent bookings'**
  String get aUsersRecentBookings;

  /// No description provided for @aUsersRecentReviews.
  ///
  /// In en, this message translates to:
  /// **'Recent reviews'**
  String get aUsersRecentReviews;

  /// No description provided for @aUsersBusiness.
  ///
  /// In en, this message translates to:
  /// **'Linked business'**
  String get aUsersBusiness;

  /// No description provided for @aUsersNoBookings.
  ///
  /// In en, this message translates to:
  /// **'No bookings yet.'**
  String get aUsersNoBookings;

  /// No description provided for @aUsersNoReviews.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get aUsersNoReviews;

  /// No description provided for @aUsersReadOnly.
  ///
  /// In en, this message translates to:
  /// **'User records are read-only. The schema has no account status field, and a provider account is tied to its business row — so deactivation and role changes have no endpoint to call.'**
  String get aUsersReadOnly;

  /// No description provided for @aProvidersSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search businesses'**
  String get aProvidersSearchHint;

  /// No description provided for @aProvidersAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get aProvidersAll;

  /// No description provided for @aProvidersApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get aProvidersApproved;

  /// No description provided for @aProvidersPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get aProvidersPending;

  /// No description provided for @aProvidersNoResults.
  ///
  /// In en, this message translates to:
  /// **'No businesses match this filter.'**
  String get aProvidersNoResults;

  /// No description provided for @aProvidersOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get aProvidersOwner;

  /// No description provided for @aProvidersServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get aProvidersServices;

  /// No description provided for @aProvidersReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aProvidersReviews;

  /// No description provided for @aProvidersQueueEntries.
  ///
  /// In en, this message translates to:
  /// **'Queue entries'**
  String get aProvidersQueueEntries;

  /// No description provided for @aProvidersApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get aProvidersApprove;

  /// No description provided for @aProvidersRevoke.
  ///
  /// In en, this message translates to:
  /// **'Revoke approval'**
  String get aProvidersRevoke;

  /// No description provided for @aFuelManageButton.
  ///
  /// In en, this message translates to:
  /// **'Manage Fuel'**
  String get aFuelManageButton;

  /// No description provided for @aFuelTitle.
  ///
  /// In en, this message translates to:
  /// **'Fuel Management'**
  String get aFuelTitle;

  /// No description provided for @aFuelNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Not configured yet.'**
  String get aFuelNotConfigured;

  /// No description provided for @aFuelSetUp.
  ///
  /// In en, this message translates to:
  /// **'Set up'**
  String get aFuelSetUp;

  /// No description provided for @aFuelUpdate.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get aFuelUpdate;

  /// No description provided for @aFuelCapacityField.
  ///
  /// In en, this message translates to:
  /// **'Capacity'**
  String get aFuelCapacityField;

  /// No description provided for @aFuelRemainingField.
  ///
  /// In en, this message translates to:
  /// **'Remaining'**
  String get aFuelRemainingField;

  /// No description provided for @aFuelPriceField.
  ///
  /// In en, this message translates to:
  /// **'Price per liter'**
  String get aFuelPriceField;

  /// No description provided for @aFuelSaved.
  ///
  /// In en, this message translates to:
  /// **'Fuel inventory updated'**
  String get aFuelSaved;

  /// No description provided for @aFuelCapacityInvalid.
  ///
  /// In en, this message translates to:
  /// **'Capacity must be greater than 0'**
  String get aFuelCapacityInvalid;

  /// No description provided for @aFuelRemainingInvalid.
  ///
  /// In en, this message translates to:
  /// **'Remaining must not be negative'**
  String get aFuelRemainingInvalid;

  /// No description provided for @aFuelRemainingExceedsCapacity.
  ///
  /// In en, this message translates to:
  /// **'Remaining cannot exceed capacity'**
  String get aFuelRemainingExceedsCapacity;

  /// No description provided for @aFuelPriceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Price must not be negative'**
  String get aFuelPriceInvalid;

  /// No description provided for @financeGross.
  ///
  /// In en, this message translates to:
  /// **'Gross'**
  String get financeGross;

  /// No description provided for @financeCommission.
  ///
  /// In en, this message translates to:
  /// **'Commission'**
  String get financeCommission;

  /// No description provided for @financeNet.
  ///
  /// In en, this message translates to:
  /// **'Net'**
  String get financeNet;

  /// No description provided for @financeCommissionRateField.
  ///
  /// In en, this message translates to:
  /// **'Commission rate'**
  String get financeCommissionRateField;

  /// No description provided for @financeStatusAll.
  ///
  /// In en, this message translates to:
  /// **'All statuses'**
  String get financeStatusAll;

  /// No description provided for @financeStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get financeStatusPending;

  /// No description provided for @financeStatusSettled.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get financeStatusSettled;

  /// No description provided for @financeTrendEmpty.
  ///
  /// In en, this message translates to:
  /// **'No completed bookings recorded in this range yet.'**
  String get financeTrendEmpty;

  /// No description provided for @financeTrendSinglePoint.
  ///
  /// In en, this message translates to:
  /// **'More history will appear as bookings complete.'**
  String get financeTrendSinglePoint;

  /// No description provided for @financeUnknownService.
  ///
  /// In en, this message translates to:
  /// **'Booking'**
  String get financeUnknownService;

  /// No description provided for @commonCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get commonCreated;

  /// No description provided for @aFinanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get aFinanceTitle;

  /// No description provided for @aFinanceCommissionRevenue.
  ///
  /// In en, this message translates to:
  /// **'Platform Revenue'**
  String get aFinanceCommissionRevenue;

  /// No description provided for @aFinanceProviderNet.
  ///
  /// In en, this message translates to:
  /// **'Provider Net'**
  String get aFinanceProviderNet;

  /// No description provided for @aFinancePending.
  ///
  /// In en, this message translates to:
  /// **'Pending Settlement'**
  String get aFinancePending;

  /// No description provided for @aFinanceSettled.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get aFinanceSettled;

  /// No description provided for @aFinanceTransactionCount.
  ///
  /// In en, this message translates to:
  /// **'Transactions'**
  String get aFinanceTransactionCount;

  /// No description provided for @aFinanceTrend.
  ///
  /// In en, this message translates to:
  /// **'Revenue Over Time'**
  String get aFinanceTrend;

  /// No description provided for @aFinanceTransactions.
  ///
  /// In en, this message translates to:
  /// **'Transactions'**
  String get aFinanceTransactions;

  /// No description provided for @aFinanceProviderFilter.
  ///
  /// In en, this message translates to:
  /// **'Provider'**
  String get aFinanceProviderFilter;

  /// No description provided for @aFinanceAllProviders.
  ///
  /// In en, this message translates to:
  /// **'All providers'**
  String get aFinanceAllProviders;

  /// No description provided for @aFinanceNoTransactions.
  ///
  /// In en, this message translates to:
  /// **'No transactions match this filter yet.'**
  String get aFinanceNoTransactions;

  /// No description provided for @aFinanceMarkSettled.
  ///
  /// In en, this message translates to:
  /// **'Mark Settled'**
  String get aFinanceMarkSettled;

  /// No description provided for @aFinanceSettleSuccess.
  ///
  /// In en, this message translates to:
  /// **'Transaction marked as settled'**
  String get aFinanceSettleSuccess;

  /// No description provided for @aFinanceSettledAt.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get aFinanceSettledAt;

  /// No description provided for @aFinanceCommissionEdit.
  ///
  /// In en, this message translates to:
  /// **'Manage commission'**
  String get aFinanceCommissionEdit;

  /// No description provided for @aFinanceCommissionTitle.
  ///
  /// In en, this message translates to:
  /// **'Platform commission'**
  String get aFinanceCommissionTitle;

  /// No description provided for @aFinanceCommissionInvalid.
  ///
  /// In en, this message translates to:
  /// **'Commission rate must be between 0 and 100'**
  String get aFinanceCommissionInvalid;

  /// No description provided for @aFinanceCommissionSaved.
  ///
  /// In en, this message translates to:
  /// **'Commission rate updated'**
  String get aFinanceCommissionSaved;

  /// No description provided for @aProvidersApproveTitle.
  ///
  /// In en, this message translates to:
  /// **'Approve this business?'**
  String get aProvidersApproveTitle;

  /// No description provided for @aProvidersApproveBody.
  ///
  /// In en, this message translates to:
  /// **'It becomes visible to customers and can accept bookings.'**
  String get aProvidersApproveBody;

  /// No description provided for @aProvidersRevokeTitle.
  ///
  /// In en, this message translates to:
  /// **'Revoke approval?'**
  String get aProvidersRevokeTitle;

  /// No description provided for @aProvidersRevokeBody.
  ///
  /// In en, this message translates to:
  /// **'It disappears from customer discovery. Existing bookings are not cancelled.'**
  String get aProvidersRevokeBody;

  /// No description provided for @aProvidersDetails.
  ///
  /// In en, this message translates to:
  /// **'Business details'**
  String get aProvidersDetails;

  /// No description provided for @aCategoriesTitle.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get aCategoriesTitle;

  /// No description provided for @aCategoriesNew.
  ///
  /// In en, this message translates to:
  /// **'New category'**
  String get aCategoriesNew;

  /// No description provided for @aCategoriesEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit category'**
  String get aCategoriesEdit;

  /// No description provided for @aCategoriesActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get aCategoriesActive;

  /// No description provided for @aCategoriesInactive.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get aCategoriesInactive;

  /// No description provided for @aCategoriesNone.
  ///
  /// In en, this message translates to:
  /// **'No categories yet.'**
  String get aCategoriesNone;

  /// No description provided for @aCategoriesDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this category?'**
  String get aCategoriesDeleteTitle;

  /// No description provided for @aCategoriesDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'A category still used by services cannot be deleted — deactivate it instead.'**
  String get aCategoriesDeleteBody;

  /// No description provided for @aCategoriesNameRequired.
  ///
  /// In en, this message translates to:
  /// **'A category needs a name.'**
  String get aCategoriesNameRequired;

  /// No description provided for @aBookingsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search customer, business or service'**
  String get aBookingsSearchHint;

  /// No description provided for @aBookingsNoResults.
  ///
  /// In en, this message translates to:
  /// **'No bookings match this filter.'**
  String get aBookingsNoResults;

  /// No description provided for @aBookingsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get aBookingsAll;

  /// No description provided for @aBookingsCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get aBookingsCustomer;

  /// No description provided for @aBookingsBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get aBookingsBusiness;

  /// No description provided for @aBookingsReadOnly.
  ///
  /// In en, this message translates to:
  /// **'Admins view bookings; the workflow belongs to the business that owns them.'**
  String get aBookingsReadOnly;

  /// No description provided for @aComplaintsNoResults.
  ///
  /// In en, this message translates to:
  /// **'No complaints match this filter.'**
  String get aComplaintsNoResults;

  /// No description provided for @aComplaintsAllStatuses.
  ///
  /// In en, this message translates to:
  /// **'All statuses'**
  String get aComplaintsAllStatuses;

  /// No description provided for @aComplaintsAllSeverities.
  ///
  /// In en, this message translates to:
  /// **'All severities'**
  String get aComplaintsAllSeverities;

  /// No description provided for @aComplaintStatusOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get aComplaintStatusOpen;

  /// No description provided for @aComplaintStatusInReview.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get aComplaintStatusInReview;

  /// No description provided for @aComplaintStatusResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get aComplaintStatusResolved;

  /// No description provided for @aComplaintStatusDismissed.
  ///
  /// In en, this message translates to:
  /// **'Dismissed'**
  String get aComplaintStatusDismissed;

  /// No description provided for @aComplaintSeverityLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get aComplaintSeverityLow;

  /// No description provided for @aComplaintSeverityMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get aComplaintSeverityMedium;

  /// No description provided for @aComplaintSeverityHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get aComplaintSeverityHigh;

  /// No description provided for @aComplaintDetails.
  ///
  /// In en, this message translates to:
  /// **'Complaint'**
  String get aComplaintDetails;

  /// No description provided for @aComplaintAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get aComplaintAbout;

  /// No description provided for @aComplaintSubmittedBy.
  ///
  /// In en, this message translates to:
  /// **'Submitted by'**
  String get aComplaintSubmittedBy;

  /// No description provided for @aComplaintFiled.
  ///
  /// In en, this message translates to:
  /// **'Filed'**
  String get aComplaintFiled;

  /// No description provided for @aComplaintClosedAt.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get aComplaintClosedAt;

  /// No description provided for @aComplaintUpdateStatus.
  ///
  /// In en, this message translates to:
  /// **'Update status'**
  String get aComplaintUpdateStatus;

  /// No description provided for @aComplaintNoDetails.
  ///
  /// In en, this message translates to:
  /// **'No further details were given.'**
  String get aComplaintNoDetails;

  /// No description provided for @aComplaintReopenNote.
  ///
  /// In en, this message translates to:
  /// **'Reopening a closed complaint clears its closing date.'**
  String get aComplaintReopenNote;

  /// No description provided for @aReviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aReviewsTitle;

  /// No description provided for @aReviewsNoResults.
  ///
  /// In en, this message translates to:
  /// **'No reviews match this filter.'**
  String get aReviewsNoResults;

  /// No description provided for @aReviewsAllProviders.
  ///
  /// In en, this message translates to:
  /// **'All businesses'**
  String get aReviewsAllProviders;

  /// No description provided for @aReviewsDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this review?'**
  String get aReviewsDeleteTitle;

  /// No description provided for @aReviewsDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'It is removed for everyone and the business\'s rating is recalculated. This cannot be undone.'**
  String get aReviewsDeleteBody;

  /// No description provided for @aReviewsNoComment.
  ///
  /// In en, this message translates to:
  /// **'No comment was left.'**
  String get aReviewsNoComment;

  /// No description provided for @aReviewsDeleted.
  ///
  /// In en, this message translates to:
  /// **'Review deleted'**
  String get aReviewsDeleted;

  /// No description provided for @aReviewsBy.
  ///
  /// In en, this message translates to:
  /// **'by'**
  String get aReviewsBy;

  /// No description provided for @aAnalyticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Platform analytics'**
  String get aAnalyticsTitle;

  /// No description provided for @aAnalyticsBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get aAnalyticsBookings;

  /// No description provided for @aAnalyticsCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get aAnalyticsCompleted;

  /// No description provided for @aAnalyticsCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get aAnalyticsCancelled;

  /// No description provided for @aAnalyticsCancelRate.
  ///
  /// In en, this message translates to:
  /// **'Cancellation rate'**
  String get aAnalyticsCancelRate;

  /// No description provided for @aAnalyticsNewCustomers.
  ///
  /// In en, this message translates to:
  /// **'New customers'**
  String get aAnalyticsNewCustomers;

  /// No description provided for @aAnalyticsNewProviders.
  ///
  /// In en, this message translates to:
  /// **'New businesses'**
  String get aAnalyticsNewProviders;

  /// No description provided for @aAnalyticsReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aAnalyticsReviews;

  /// No description provided for @aAnalyticsAvgRating.
  ///
  /// In en, this message translates to:
  /// **'Average rating'**
  String get aAnalyticsAvgRating;

  /// No description provided for @aAnalyticsBookingTrend.
  ///
  /// In en, this message translates to:
  /// **'Booking trend'**
  String get aAnalyticsBookingTrend;

  /// No description provided for @aAnalyticsUserGrowth.
  ///
  /// In en, this message translates to:
  /// **'User growth'**
  String get aAnalyticsUserGrowth;

  /// No description provided for @aAnalyticsStatusBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Booking status breakdown'**
  String get aAnalyticsStatusBreakdown;

  /// No description provided for @aAnalyticsPopularServices.
  ///
  /// In en, this message translates to:
  /// **'Popular services'**
  String get aAnalyticsPopularServices;

  /// No description provided for @aAnalyticsTopProviders.
  ///
  /// In en, this message translates to:
  /// **'Top businesses'**
  String get aAnalyticsTopProviders;

  /// No description provided for @aAnalyticsCategories.
  ///
  /// In en, this message translates to:
  /// **'Businesses per category'**
  String get aAnalyticsCategories;

  /// No description provided for @aAnalyticsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing was recorded in this range.'**
  String get aAnalyticsEmpty;

  /// No description provided for @aAnalyticsSource.
  ///
  /// In en, this message translates to:
  /// **'Every figure comes from /admin/analytics. Revenue, AI and system-health metrics are absent because the platform does not record them.'**
  String get aAnalyticsSource;

  /// No description provided for @aAnalyticsCustomersLabel.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get aAnalyticsCustomersLabel;

  /// No description provided for @aAnalyticsProvidersLabel.
  ///
  /// In en, this message translates to:
  /// **'Businesses'**
  String get aAnalyticsProvidersLabel;

  /// No description provided for @aMoreManagement.
  ///
  /// In en, this message translates to:
  /// **'Management'**
  String get aMoreManagement;

  /// No description provided for @aMoreUsers.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get aMoreUsers;

  /// No description provided for @aMoreCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get aMoreCategories;

  /// No description provided for @aMoreReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get aMoreReviews;

  /// No description provided for @aMoreAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get aMoreAnalytics;

  /// No description provided for @aMoreFinance.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get aMoreFinance;

  /// No description provided for @aMoreAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get aMoreAccount;

  /// No description provided for @aMorePreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get aMorePreferences;

  /// No description provided for @aMoreRealtimeNote.
  ///
  /// In en, this message translates to:
  /// **'Admin lists refresh on demand: the only live event the backend sends an admin is a business opening or closing.'**
  String get aMoreRealtimeNote;

  /// No description provided for @aMoreBookingPolicyTitle.
  ///
  /// In en, this message translates to:
  /// **'Booking window configuration'**
  String get aMoreBookingPolicyTitle;

  /// No description provided for @aMoreBookingPolicyDescription.
  ///
  /// In en, this message translates to:
  /// **'Applies platform-wide, to every provider — enforced on both the availability grid and booking creation, not just shown here.'**
  String get aMoreBookingPolicyDescription;

  /// No description provided for @fieldMinAdvanceMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minimum advance time (minutes)'**
  String get fieldMinAdvanceMinutes;

  /// No description provided for @fieldMaxAdvanceDays.
  ///
  /// In en, this message translates to:
  /// **'Maximum days in advance'**
  String get fieldMaxAdvanceDays;

  /// No description provided for @fieldAllowSameDayBooking.
  ///
  /// In en, this message translates to:
  /// **'Allow same-day booking'**
  String get fieldAllowSameDayBooking;

  /// No description provided for @aMoreBookingPolicyInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a minimum advance time of 0 or more and a maximum of at least 1 day.'**
  String get aMoreBookingPolicyInvalid;

  /// No description provided for @aMoreBookingPolicySaved.
  ///
  /// In en, this message translates to:
  /// **'Booking policy updated'**
  String get aMoreBookingPolicySaved;

  /// No description provided for @aMoreNotificationSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notification settings'**
  String get aMoreNotificationSettingsTitle;

  /// No description provided for @aMoreNotificationSettingsDescription.
  ///
  /// In en, this message translates to:
  /// **'Which in-app notifications you receive on this account. Disabling a category stops it from being created for you at all.'**
  String get aMoreNotificationSettingsDescription;

  /// No description provided for @notifPrefBookingUpdates.
  ///
  /// In en, this message translates to:
  /// **'Booking updates'**
  String get notifPrefBookingUpdates;

  /// No description provided for @notifPrefBookingUpdatesDesc.
  ///
  /// In en, this message translates to:
  /// **'Created, confirmed, rejected, cancelled, started, and completed bookings.'**
  String get notifPrefBookingUpdatesDesc;

  /// No description provided for @notifPrefQueueUpdates.
  ///
  /// In en, this message translates to:
  /// **'Queue updates'**
  String get notifPrefQueueUpdates;

  /// No description provided for @notifPrefQueueUpdatesDesc.
  ///
  /// In en, this message translates to:
  /// **'Joining a queue and when your turn is next.'**
  String get notifPrefQueueUpdatesDesc;

  /// No description provided for @notifPrefReviewUpdates.
  ///
  /// In en, this message translates to:
  /// **'Review updates'**
  String get notifPrefReviewUpdates;

  /// No description provided for @notifPrefReviewUpdatesDesc.
  ///
  /// In en, this message translates to:
  /// **'A new review is left for a provider.'**
  String get notifPrefReviewUpdatesDesc;

  /// No description provided for @notifPrefProviderUpdates.
  ///
  /// In en, this message translates to:
  /// **'Provider updates'**
  String get notifPrefProviderUpdates;

  /// No description provided for @notifPrefProviderUpdatesDesc.
  ///
  /// In en, this message translates to:
  /// **'A new provider registers, is approved, or is rejected.'**
  String get notifPrefProviderUpdatesDesc;

  /// No description provided for @aMoreBackupTitle.
  ///
  /// In en, this message translates to:
  /// **'System data backup'**
  String get aMoreBackupTitle;

  /// No description provided for @aMoreBackupDescription.
  ///
  /// In en, this message translates to:
  /// **'Exports a real JSON snapshot of the platform\'s application data — users (without passwords), providers, bookings, reviews, finance, and more. Never includes credentials, tokens, or API keys.'**
  String get aMoreBackupDescription;

  /// No description provided for @actionDownloadBackup.
  ///
  /// In en, this message translates to:
  /// **'Download backup'**
  String get actionDownloadBackup;

  /// No description provided for @aMoreBackupSaved.
  ///
  /// In en, this message translates to:
  /// **'Backup saved'**
  String get aMoreBackupSaved;

  /// No description provided for @aMoreAuditLog.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get aMoreAuditLog;

  /// No description provided for @auditLogTitle.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get auditLogTitle;

  /// No description provided for @auditLogDescription.
  ///
  /// In en, this message translates to:
  /// **'A real, append-only record of administrative actions — who did what, and when. Nothing here can be edited or removed.'**
  String get auditLogDescription;

  /// No description provided for @auditLogFilterAction.
  ///
  /// In en, this message translates to:
  /// **'Filter by action'**
  String get auditLogFilterAction;

  /// No description provided for @auditLogAllActions.
  ///
  /// In en, this message translates to:
  /// **'All actions'**
  String get auditLogAllActions;

  /// No description provided for @auditLogEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No audit entries'**
  String get auditLogEmptyTitle;

  /// No description provided for @auditLogEmptyDescription.
  ///
  /// In en, this message translates to:
  /// **'Administrative actions will appear here as they happen.'**
  String get auditLogEmptyDescription;

  /// No description provided for @auditLogPagination.
  ///
  /// In en, this message translates to:
  /// **'Page {page} of {totalPages}'**
  String auditLogPagination(int page, int totalPages);

  /// No description provided for @actionPrevious.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get actionPrevious;

  /// No description provided for @actionNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get actionNext;

  /// No description provided for @auditActionProviderApproved.
  ///
  /// In en, this message translates to:
  /// **'Provider approved'**
  String get auditActionProviderApproved;

  /// No description provided for @auditActionProviderRejected.
  ///
  /// In en, this message translates to:
  /// **'Provider rejected'**
  String get auditActionProviderRejected;

  /// No description provided for @auditActionCategoryCreated.
  ///
  /// In en, this message translates to:
  /// **'Category created'**
  String get auditActionCategoryCreated;

  /// No description provided for @auditActionCategoryUpdated.
  ///
  /// In en, this message translates to:
  /// **'Category updated'**
  String get auditActionCategoryUpdated;

  /// No description provided for @auditActionCategoryDeleted.
  ///
  /// In en, this message translates to:
  /// **'Category deleted'**
  String get auditActionCategoryDeleted;

  /// No description provided for @auditActionFuelInventoryUpdated.
  ///
  /// In en, this message translates to:
  /// **'Fuel inventory updated'**
  String get auditActionFuelInventoryUpdated;

  /// No description provided for @auditActionFinanceSettled.
  ///
  /// In en, this message translates to:
  /// **'Finance settled'**
  String get auditActionFinanceSettled;

  /// No description provided for @auditActionCommissionRateUpdated.
  ///
  /// In en, this message translates to:
  /// **'Commission rate updated'**
  String get auditActionCommissionRateUpdated;

  /// No description provided for @auditActionBookingStatusChanged.
  ///
  /// In en, this message translates to:
  /// **'Booking status changed'**
  String get auditActionBookingStatusChanged;

  /// No description provided for @auditActionBookingPolicyUpdated.
  ///
  /// In en, this message translates to:
  /// **'Booking policy updated'**
  String get auditActionBookingPolicyUpdated;

  /// No description provided for @auditActionSystemBackupExported.
  ///
  /// In en, this message translates to:
  /// **'System backup exported'**
  String get auditActionSystemBackupExported;

  /// No description provided for @aBookingNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get aBookingNotes;

  /// No description provided for @aCategoriesNoToggle.
  ///
  /// In en, this message translates to:
  /// **'The categories endpoint accepts a name and description only. Active state is shown here but has no endpoint to change it — a category is deactivated in the database, not from this screen.'**
  String get aCategoriesNoToggle;

  /// No description provided for @notifTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifTitle;

  /// No description provided for @notifMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notifMarkAllRead;

  /// No description provided for @notifEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet.'**
  String get notifEmpty;

  /// No description provided for @notifUnreadSummary.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{You\'re all caught up} =1{1 unread} other{{count} unread}}'**
  String notifUnreadSummary(int count);

  /// No description provided for @homeLiveStationSection.
  ///
  /// In en, this message translates to:
  /// **'Live Station'**
  String get homeLiveStationSection;

  /// No description provided for @homeLiveStationBody.
  ///
  /// In en, this message translates to:
  /// **'See the current station situation before you go.'**
  String get homeLiveStationBody;

  /// No description provided for @homeWatchLive.
  ///
  /// In en, this message translates to:
  /// **'Watch Live'**
  String get homeWatchLive;

  /// No description provided for @liveCameraLive.
  ///
  /// In en, this message translates to:
  /// **'LIVE'**
  String get liveCameraLive;

  /// No description provided for @liveCameraOffline.
  ///
  /// In en, this message translates to:
  /// **'Camera Offline'**
  String get liveCameraOffline;

  /// No description provided for @liveCameraUnavailableMessage.
  ///
  /// In en, this message translates to:
  /// **'Live view is currently unavailable'**
  String get liveCameraUnavailableMessage;

  /// No description provided for @liveCameraPrivacyNote.
  ///
  /// In en, this message translates to:
  /// **'Live view is provided by the station for current conditions.'**
  String get liveCameraPrivacyNote;

  /// No description provided for @liveStationAppBarTitle.
  ///
  /// In en, this message translates to:
  /// **'Live Station'**
  String get liveStationAppBarTitle;

  /// No description provided for @liveStationNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Live camera is not available for this business.'**
  String get liveStationNotAvailable;

  /// No description provided for @aiAssistantTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Assistant'**
  String get aiAssistantTitle;

  /// No description provided for @aiAssistantDescription.
  ///
  /// In en, this message translates to:
  /// **'Ask how the platform works, or describe a vehicle problem for a preliminary diagnosis.'**
  String get aiAssistantDescription;

  /// No description provided for @aiAssistantWelcome.
  ///
  /// In en, this message translates to:
  /// **'Hi! I\'m your platform assistant. Ask me how something works, or describe a vehicle problem and I\'ll help narrow down what might be going on.'**
  String get aiAssistantWelcome;

  /// No description provided for @aiAssistantInputHint.
  ///
  /// In en, this message translates to:
  /// **'Type your message…'**
  String get aiAssistantInputHint;

  /// No description provided for @aiAssistantClear.
  ///
  /// In en, this message translates to:
  /// **'Clear conversation'**
  String get aiAssistantClear;

  /// No description provided for @aiAssistantUnavailable.
  ///
  /// In en, this message translates to:
  /// **'AI Assistant is temporarily unavailable. Please try again.'**
  String get aiAssistantUnavailable;

  /// No description provided for @aiSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get aiSend;

  /// No description provided for @aiThinking.
  ///
  /// In en, this message translates to:
  /// **'Thinking…'**
  String get aiThinking;

  /// No description provided for @aiModeAuto.
  ///
  /// In en, this message translates to:
  /// **'Auto'**
  String get aiModeAuto;

  /// No description provided for @aiModeSupport.
  ///
  /// In en, this message translates to:
  /// **'Platform Support'**
  String get aiModeSupport;

  /// No description provided for @aiModeDiagnosis.
  ///
  /// In en, this message translates to:
  /// **'Vehicle Diagnosis'**
  String get aiModeDiagnosis;

  /// No description provided for @aiDiagnosisTitle.
  ///
  /// In en, this message translates to:
  /// **'Preliminary Diagnosis'**
  String get aiDiagnosisTitle;

  /// No description provided for @aiPossibleCauses.
  ///
  /// In en, this message translates to:
  /// **'Possible causes'**
  String get aiPossibleCauses;

  /// No description provided for @aiLikelihood.
  ///
  /// In en, this message translates to:
  /// **'Likelihood'**
  String get aiLikelihood;

  /// No description provided for @aiLikelihoodLikely.
  ///
  /// In en, this message translates to:
  /// **'Likely'**
  String get aiLikelihoodLikely;

  /// No description provided for @aiLikelihoodPossible.
  ///
  /// In en, this message translates to:
  /// **'Possible'**
  String get aiLikelihoodPossible;

  /// No description provided for @aiLikelihoodLessLikely.
  ///
  /// In en, this message translates to:
  /// **'Less likely'**
  String get aiLikelihoodLessLikely;

  /// No description provided for @aiLikelihoodUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unspecified'**
  String get aiLikelihoodUnknown;

  /// No description provided for @aiUrgencyLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get aiUrgencyLow;

  /// No description provided for @aiUrgencyMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get aiUrgencyMedium;

  /// No description provided for @aiUrgencyHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get aiUrgencyHigh;

  /// No description provided for @aiUrgencyEmergency.
  ///
  /// In en, this message translates to:
  /// **'Emergency'**
  String get aiUrgencyEmergency;

  /// No description provided for @aiUrgencyUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unspecified'**
  String get aiUrgencyUnknown;

  /// No description provided for @aiSafetyAdvice.
  ///
  /// In en, this message translates to:
  /// **'Safety advice'**
  String get aiSafetyAdvice;

  /// No description provided for @aiNeedMoreInfo.
  ///
  /// In en, this message translates to:
  /// **'I need a little more information.'**
  String get aiNeedMoreInfo;

  /// No description provided for @aiRecommendedService.
  ///
  /// In en, this message translates to:
  /// **'Recommended service'**
  String get aiRecommendedService;

  /// No description provided for @aiFindProviders.
  ///
  /// In en, this message translates to:
  /// **'Find Suitable Providers'**
  String get aiFindProviders;

  /// No description provided for @aiFindNearbySecondary.
  ///
  /// In en, this message translates to:
  /// **'Find nearby service providers'**
  String get aiFindNearbySecondary;

  /// No description provided for @aiSeekImmediateHelp.
  ///
  /// In en, this message translates to:
  /// **'Seek immediate help'**
  String get aiSeekImmediateHelp;

  /// No description provided for @aiSeekImmediateHelpBody.
  ///
  /// In en, this message translates to:
  /// **'Stop driving as soon as it is safe to do so, and seek roadside or emergency assistance now — this is not something to wait on a booking for.'**
  String get aiSeekImmediateHelpBody;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
