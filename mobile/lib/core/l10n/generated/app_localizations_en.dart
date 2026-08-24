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

  @override
  String get navHome => 'Home';

  @override
  String get navExplore => 'Explore';

  @override
  String get navBookings => 'Bookings';

  @override
  String get navQueue => 'Queue';

  @override
  String get navProfile => 'Profile';

  @override
  String homeGreeting(String name) {
    return 'Hello, $name';
  }

  @override
  String get homeBrowseCategories => 'Browse by category';

  @override
  String get homeOpenNow => 'Open now';

  @override
  String get homeNoOpenProviders => 'No businesses are open right now.';

  @override
  String get homeSeeAll => 'See all';

  @override
  String get homeActiveBooking => 'Your active booking';

  @override
  String get homeNoActivity => 'You have no active bookings.';

  @override
  String get homeFindService => 'Find a service';

  @override
  String get exploreTitle => 'Explore';

  @override
  String get exploreSearchHint => 'Search businesses or services…';

  @override
  String get exploreNoResults => 'No businesses match your search.';

  @override
  String get exploreNoProviders => 'No businesses are available yet.';

  @override
  String get exploreFilterAll => 'All categories';

  @override
  String get exploreOpenOnly => 'Open only';

  @override
  String get exploreSortDistance => 'Nearest first';

  @override
  String get exploreSortPrice => 'Lowest price';

  @override
  String get exploreSortRating => 'Highest rated';

  @override
  String get exploreSortLabel => 'Sort';

  @override
  String get exploreUseLocation => 'Use my location';

  @override
  String get exploreLocationDenied =>
      'Location unavailable, so distance sorting is off.';

  @override
  String exploreResultCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count businesses',
      one: '1 business',
      zero: 'No businesses',
    );
    return '$_temp0';
  }

  @override
  String get providerOpen => 'Open';

  @override
  String get providerClosed => 'Closed';

  @override
  String providerDistanceKm(String km) {
    return '$km km away';
  }

  @override
  String providerWaitMinutes(int minutes) {
    return '~$minutes min wait';
  }

  @override
  String providerReviewCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reviews',
      one: '1 review',
      zero: 'No reviews',
    );
    return '$_temp0';
  }

  @override
  String get providerNoRating => 'Not rated yet';

  @override
  String get providerServices => 'Services';

  @override
  String get providerNoServices =>
      'This business has no bookable services right now.';

  @override
  String get providerReviews => 'Reviews';

  @override
  String get providerNoReviews => 'No reviews yet.';

  @override
  String get providerAbout => 'About';

  @override
  String get providerQueueNow => 'Queue right now';

  @override
  String providerInLine(int count) {
    return '$count in line';
  }

  @override
  String get providerDirections => 'Directions';

  @override
  String get providerDirectionsUnavailable => 'Maps aren\'t wired up yet.';

  @override
  String get providerFavorite => 'Save';

  @override
  String get providerUnfavorite => 'Saved';

  @override
  String get providerFavoriteLocalOnly => 'Saved on this device only.';

  @override
  String get providerBookNow => 'Book now';

  @override
  String get providerClosedCannotBook =>
      'This business is closed right now, but you can still request a booking.';

  @override
  String serviceDuration(int minutes) {
    return '$minutes min';
  }

  @override
  String get bookingCreateTitle => 'Book a service';

  @override
  String get bookingSelectService => 'Service';

  @override
  String get bookingSelectServiceHint => 'Choose a service…';

  @override
  String get bookingDateTime => 'Date & time';

  @override
  String get bookingPickDateTime => 'Pick a date and time';

  @override
  String get bookingNotes => 'Notes (optional)';

  @override
  String get bookingNotesHint => 'Anything the business should know…';

  @override
  String get bookingSubmit => 'Request booking';

  @override
  String get bookingCreated => 'Booking requested';

  @override
  String get bookingErrorSelectService => 'Select a service';

  @override
  String get bookingErrorSelectTime => 'Choose a date and time';

  @override
  String get bookingErrorFutureTime => 'Pick a time in the future';

  @override
  String get bookingsTitle => 'Bookings';

  @override
  String get bookingsActive => 'Active';

  @override
  String get bookingsHistory => 'History';

  @override
  String get bookingsNoneActive => 'You have no active bookings.';

  @override
  String get bookingsNoneHistory => 'No past bookings yet.';

  @override
  String get bookingsNone => 'You haven\'t booked anything yet.';

  @override
  String get bookingsFindProvider => 'Find a business';

  @override
  String get bookingDetailsTitle => 'Booking details';

  @override
  String get bookingStatusLabel => 'Status';

  @override
  String get bookingDetailsSection => 'Details';

  @override
  String get bookingService => 'Service';

  @override
  String get bookingCategory => 'Category';

  @override
  String get bookingPrice => 'Price';

  @override
  String get bookingWhen => 'When';

  @override
  String get bookingBusiness => 'Business';

  @override
  String get bookingCancel => 'Cancel booking';

  @override
  String get bookingCancelConfirmTitle => 'Cancel this booking?';

  @override
  String get bookingCancelConfirmBody =>
      'The business will be notified. This cannot be undone.';

  @override
  String get bookingCancelled => 'Booking cancelled';

  @override
  String get bookingNotFound => 'This booking no longer exists.';

  @override
  String get statusPending => 'Pending';

  @override
  String get statusConfirmed => 'Confirmed';

  @override
  String get statusArrived => 'Arrived';

  @override
  String get statusInQueue => 'In queue';

  @override
  String get statusInService => 'In service';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get statusRejected => 'Rejected';

  @override
  String get queueTitle => 'Queue';

  @override
  String get queueNotInLine => 'You\'re not in a queue right now.';

  @override
  String get queueNotInLineBody =>
      'When a business adds you to their queue, your place appears here.';

  @override
  String queuePosition(int position) {
    return 'You are #$position in line';
  }

  @override
  String get queueYoureNext => 'You\'re next';

  @override
  String queueAhead(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count customers ahead',
      one: '1 customer ahead',
      zero: 'Nobody ahead of you',
    );
    return '$_temp0';
  }

  @override
  String queueEstimatedWait(int minutes) {
    return 'Estimated wait: $minutes min';
  }

  @override
  String get queueBeingServed => 'You\'re being served now';

  @override
  String get queueServedBody => 'Enjoy your service.';

  @override
  String get queueDone => 'Service completed';

  @override
  String get queueRemoved => 'Removed from the queue';

  @override
  String get queueStayNearby =>
      'Please stay nearby — you\'ll be called when it\'s your turn.';

  @override
  String get queueWaitingToJoin => 'Waiting to be added to the queue';

  @override
  String get queueWaitingToJoinBody =>
      'Let the front desk know you\'ve arrived.';

  @override
  String get queueRefresh => 'Refresh';

  @override
  String get queueLiveNote => 'Numbers update when you refresh.';

  @override
  String get reviewWriteTitle => 'Write a review';

  @override
  String get reviewYourRating => 'Your rating';

  @override
  String get reviewComment => 'Comment (optional)';

  @override
  String get reviewCommentHint => 'How was the service?';

  @override
  String get reviewSubmit => 'Submit review';

  @override
  String get reviewSubmitted => 'Thanks for your review';

  @override
  String get reviewErrorRating => 'Choose a rating from 1 to 5';

  @override
  String get reviewLeaveOne => 'Leave a review';

  @override
  String get reviewYours => 'Your review';

  @override
  String get reviewDelete => 'Delete review';

  @override
  String get reviewDeleteConfirmTitle => 'Delete your review?';

  @override
  String get reviewDeleteConfirmBody =>
      'This removes it from the business\'s rating. This cannot be undone.';

  @override
  String get reviewDeleted => 'Review deleted';

  @override
  String get reviewOnlyAfterCompleted =>
      'You can review a business after they complete your booking.';

  @override
  String get profileTitle => 'Profile';

  @override
  String get profileAccount => 'Account';

  @override
  String get profilePreferences => 'Preferences';

  @override
  String get profileRole => 'Role';

  @override
  String get profileNotSet => 'Not set';

  @override
  String get profileUnsupportedTitle => 'Not available yet';

  @override
  String get profileEditUnsupported =>
      'Editing your profile needs a backend endpoint that doesn\'t exist yet.';

  @override
  String get profilePasswordUnsupported =>
      'There\'s no change-password endpoint yet.';

  @override
  String get profileUnavailable => 'Unavailable';

  @override
  String get pNavOverview => 'Overview';

  @override
  String get pNavBookings => 'Bookings';

  @override
  String get pNavQueue => 'Queue';

  @override
  String get pNavServices => 'Services';

  @override
  String get pNavMore => 'More';

  @override
  String pOverviewWelcome(String name) {
    return 'Welcome back, $name';
  }

  @override
  String get pOverviewApproved => 'Approved';

  @override
  String get pOverviewPending => 'Pending approval';

  @override
  String get pOverviewPendingBody =>
      'Customers can\'t find your business until an administrator approves it.';

  @override
  String get pOverviewOpen => 'Open';

  @override
  String get pOverviewClosed => 'Closed';

  @override
  String get pOverviewQueueLength => 'In line';

  @override
  String get pOverviewWait => 'Est. wait';

  @override
  String get pOverviewToday => 'Today';

  @override
  String get pOverviewCompleted => 'Completed';

  @override
  String get pOverviewRating => 'Rating';

  @override
  String get pOverviewReviews => 'Reviews';

  @override
  String get pOverviewRecentReviews => 'Recent reviews';

  @override
  String get pOverviewNoReviews => 'No reviews yet.';

  @override
  String get pOverviewQuickActions => 'Quick actions';

  @override
  String get pOverviewNextCustomer => 'Start next customer';

  @override
  String get pOverviewAddWalkIn => 'Add walk-in';

  @override
  String get pOverviewViewQueue => 'View queue';

  @override
  String pOverviewPendingBookings(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bookings need attention',
      one: '1 booking needs attention',
      zero: 'No bookings need attention',
    );
    return '$_temp0';
  }

  @override
  String get pBookingsAll => 'All';

  @override
  String get pBookingsNeedsAction => 'Needs action';

  @override
  String get pBookingsToday => 'Today';

  @override
  String get pBookingsUpcoming => 'Upcoming';

  @override
  String get pBookingsPast => 'Past';

  @override
  String get pBookingsNone => 'No bookings yet.';

  @override
  String get pBookingsNoneMatch => 'No bookings match these filters.';

  @override
  String get pBookingsSearchHint => 'Search customer or service…';

  @override
  String get pBookingCustomer => 'Customer';

  @override
  String get pBookingContact => 'Contact';

  @override
  String get pBookingConfirm => 'Confirm booking';

  @override
  String get pBookingReject => 'Reject';

  @override
  String get pBookingMarkArrived => 'Mark as arrived';

  @override
  String get pBookingAddToQueue => 'Add to queue';

  @override
  String get pBookingStartService => 'Start service';

  @override
  String get pBookingCompleteService => 'Complete service';

  @override
  String get pBookingRemoveFromQueue => 'Remove from queue';

  @override
  String get pBookingCancelBooking => 'Cancel booking';

  @override
  String get pBookingNextStep => 'Next step';

  @override
  String get pBookingNoActions => 'Nothing left to do for this booking.';

  @override
  String get pBookingQueueEntry => 'Queue entry';

  @override
  String get pBookingPositionInLine => 'Position in line';

  @override
  String get pConfirmRejectTitle => 'Reject this booking?';

  @override
  String get pConfirmRejectBody =>
      'The customer will be told their request was declined. This cannot be undone.';

  @override
  String get pConfirmCancelTitle => 'Cancel this booking?';

  @override
  String get pConfirmCancelBody =>
      'The customer will be notified. This cannot be undone.';

  @override
  String get pConfirmRemoveQueueTitle => 'Remove from queue?';

  @override
  String get pConfirmRemoveQueueBody =>
      'This drops the customer out of the line and cancels their booking.';

  @override
  String get pConfirmCompleteTitle => 'Complete service?';

  @override
  String get pConfirmCompleteBody =>
      'This marks the service finished and closes the booking.';

  @override
  String get pActionDone => 'Done';

  @override
  String get pQueueWaiting => 'Waiting';

  @override
  String get pQueueInService => 'In service';

  @override
  String get pQueueEmpty => 'The queue is empty.';

  @override
  String get pQueueEmptyBody =>
      'Add a walk-in customer or check an arrived booking in.';

  @override
  String get pQueueNoneWaiting => 'Nobody is waiting.';

  @override
  String get pQueueNoneInService => 'Nobody is being served.';

  @override
  String get pQueueCurrent => 'Now serving';

  @override
  String get pQueueNext => 'Next up';

  @override
  String get pQueueMoveUp => 'Move up';

  @override
  String get pQueueMoveDown => 'Move down';

  @override
  String get pQueueReordered => 'Queue order saved';

  @override
  String get pWalkInTitle => 'Add walk-in customer';

  @override
  String get pWalkInName => 'Customer name';

  @override
  String get pWalkInService => 'Service';

  @override
  String get pWalkInAdd => 'Add to queue';

  @override
  String get pWalkInNameRequired => 'Enter the customer\'s name';

  @override
  String get pWalkInServiceRequired => 'Choose a service';

  @override
  String get pWalkInAdded => 'Added to the queue';

  @override
  String get pServicesNone => 'No services yet.';

  @override
  String get pServicesNoneBody =>
      'Add the services your business offers so customers can book them.';

  @override
  String get pServicesAdd => 'Add service';

  @override
  String get pServicesEdit => 'Edit service';

  @override
  String get pServiceName => 'Service name';

  @override
  String get pServiceCategory => 'Category';

  @override
  String get pServicePrice => 'Price';

  @override
  String get pServiceDuration => 'Duration (minutes)';

  @override
  String get pServiceAvailable => 'Available for booking';

  @override
  String get pServiceSaved => 'Service saved';

  @override
  String get pServiceDeleted => 'Service deleted';

  @override
  String get pServiceDeleteTitle => 'Delete this service?';

  @override
  String get pServiceDeleteBody =>
      'Services with bookings or queue history can\'t be deleted — mark them unavailable instead.';

  @override
  String get pServiceNameRequired => 'Enter a service name';

  @override
  String get pServicePriceInvalid => 'Enter a price greater than 0';

  @override
  String get pServiceDurationInvalid => 'Enter a duration greater than 0';

  @override
  String get pServiceNoCategories =>
      'An administrator needs to create a service category first.';

  @override
  String get pProfileTitle => 'Business profile';

  @override
  String get pProfileBusinessDetails => 'Business details';

  @override
  String get pProfileBusinessName => 'Business name';

  @override
  String get pProfileDescription => 'Description';

  @override
  String get pProfileDescriptionHint =>
      'Tell customers what your business does…';

  @override
  String get pProfileAddress => 'Address';

  @override
  String get pProfileContact => 'Contact';

  @override
  String get pProfilePhone => 'Phone';

  @override
  String get pProfileContactName => 'Contact name';

  @override
  String get pProfileEmailReadOnly =>
      'Email is your sign-in identity and can\'t be changed here.';

  @override
  String get pProfileLocation => 'Location';

  @override
  String get pProfileLatitude => 'Latitude';

  @override
  String get pProfileLongitude => 'Longitude';

  @override
  String get pProfileLocationHint =>
      'Used to rank your business by distance in customer search.';

  @override
  String get pProfileHoursTitle => 'Operating hours aren\'t available';

  @override
  String get pProfileHoursBody =>
      'There is no field for them in the database, so they can\'t be saved. Use Live Status to mark yourself open or closed right now.';

  @override
  String get pProfileSave => 'Save changes';

  @override
  String get pProfileSaved => 'Profile updated';

  @override
  String get pProfileNameRequired => 'Business name is required';

  @override
  String get pProfileAddressRequired => 'Address is required';

  @override
  String get pProfileCoordinateInvalid => 'Enter a valid coordinate';

  @override
  String get pLiveTitle => 'Live status';

  @override
  String get pLiveOpenForBusiness => 'Open for business';

  @override
  String get pLiveOpenBody =>
      'Customers can find you in search and book your available services.';

  @override
  String get pLiveClosedBody =>
      'You are shown as closed. Existing bookings are unaffected.';

  @override
  String get pLiveNotApproved =>
      'Your business is still pending approval, so it won\'t appear in customer search yet.';

  @override
  String get pLiveAdvertisedWait => 'Advertised wait time';

  @override
  String get pLiveAdvertisedWaitBody =>
      'Shown on your public profile. The live average is measured from your actual queue.';

  @override
  String get pLiveMinutes => 'Minutes';

  @override
  String get pLiveSaved => 'Live status updated';

  @override
  String get pLiveNowOpen => 'You\'re now open';

  @override
  String get pLiveNowClosed => 'You\'re now closed';

  @override
  String get pLiveLiveAverage => 'Live average';

  @override
  String get pLiveBeingServed => 'Being served';

  @override
  String get pReviewsTitle => 'Reviews';

  @override
  String get pReviewsAverage => 'Average rating';

  @override
  String get pReviewsTotal => 'Total reviews';

  @override
  String get pReviewsNone => 'No reviews yet.';

  @override
  String get pReviewsNoneBody =>
      'Customers can review you after you complete their booking.';

  @override
  String get pReviewsNoReplies =>
      'Replying to reviews isn\'t available — the database has no field to store a response.';

  @override
  String get pReviewsFilterAll => 'All ratings';

  @override
  String get pAnalyticsTitle => 'Analytics';

  @override
  String get pAnalyticsRange7 => 'Last 7 days';

  @override
  String get pAnalyticsRange30 => 'Last 30 days';

  @override
  String get pAnalyticsRange90 => 'Last 90 days';

  @override
  String get pAnalyticsTotal => 'Bookings';

  @override
  String get pAnalyticsCompleted => 'Completed';

  @override
  String get pAnalyticsCancelled => 'Cancelled';

  @override
  String get pAnalyticsCancelRate => 'Cancellation rate';

  @override
  String get pAnalyticsAvgWait => 'Avg. wait';

  @override
  String get pAnalyticsAvgRating => 'Avg. rating';

  @override
  String get pAnalyticsQueueHandled => 'Queue entries';

  @override
  String get pAnalyticsPopular => 'Popular services';

  @override
  String get pAnalyticsBusy => 'Busy hours';

  @override
  String get pAnalyticsBreakdown => 'Booking status';

  @override
  String get pAnalyticsEmpty => 'No activity in this range.';

  @override
  String get pAnalyticsNoRevenue =>
      'Revenue isn\'t reported — nothing in the database tracks it.';

  @override
  String get pMoreTitle => 'More';

  @override
  String get pMoreBusinessProfile => 'Business profile';

  @override
  String get pMoreLiveStatus => 'Live status';

  @override
  String get pMoreReviews => 'Reviews';

  @override
  String get pMoreAnalytics => 'Analytics';

  @override
  String get pMoreAccount => 'Account';

  @override
  String get pMorePreferences => 'Preferences';

  @override
  String get pMoreUnsupported => 'Not available yet';

  @override
  String get pMoreNoPassword => 'There\'s no change-password endpoint yet.';

  @override
  String get pMoreNoNotifications => 'No notifications backend exists yet.';

  @override
  String get realtimeLive => 'Live';

  @override
  String get realtimeOffline => 'Offline';

  @override
  String get realtimeReconnecting => 'Reconnecting…';

  @override
  String get queueLiveUpdating => 'Updating automatically.';

  @override
  String get commonKm => 'km';

  @override
  String get commonRefresh => 'Refresh';

  @override
  String get commonClose => 'Close';

  @override
  String get commonBack => 'Back';

  @override
  String get aNavOverview => 'Overview';

  @override
  String get aNavProviders => 'Businesses';

  @override
  String get aNavBookings => 'Bookings';

  @override
  String get aNavComplaints => 'Complaints';

  @override
  String get aNavMore => 'More';

  @override
  String get aOverviewUsers => 'Users';

  @override
  String get aOverviewCustomers => 'Customers';

  @override
  String get aOverviewProviderAccounts => 'Provider accounts';

  @override
  String get aOverviewAdmins => 'Admins';

  @override
  String get aOverviewBusinesses => 'Businesses';

  @override
  String get aOverviewApproved => 'Approved';

  @override
  String get aOverviewPending => 'Pending';

  @override
  String get aOverviewOpenNow => 'Open now';

  @override
  String get aOverviewBookings => 'Bookings';

  @override
  String get aOverviewActive => 'Active';

  @override
  String get aOverviewCompleted => 'Completed';

  @override
  String get aOverviewCancelled => 'Cancelled';

  @override
  String get aOverviewRejected => 'Rejected';

  @override
  String get aOverviewQueueNow => 'In queue now';

  @override
  String get aOverviewReviews => 'Reviews';

  @override
  String get aOverviewAvgRating => 'Average rating';

  @override
  String get aOverviewCatalog => 'Catalog';

  @override
  String get aOverviewCategories => 'Categories';

  @override
  String get aOverviewServices => 'Services';

  @override
  String get aOverviewComplaintsOpen => 'Open complaints';

  @override
  String get aOverviewComplaintsTotal => 'Total complaints';

  @override
  String get aOverviewRecentRegistrations => 'Recent registrations';

  @override
  String get aOverviewPendingApprovals => 'Pending approvals';

  @override
  String get aOverviewRecentComplaints => 'Recent complaints';

  @override
  String get aOverviewNothingPending => 'Nothing is waiting for approval.';

  @override
  String get aOverviewNoComplaints => 'No complaints have been filed.';

  @override
  String get aOverviewNoRegistrations => 'No recent registrations.';

  @override
  String get aOverviewQuickActions => 'Quick actions';

  @override
  String get aOverviewViewAll => 'View all';

  @override
  String get aUsersTitle => 'Users';

  @override
  String get aUsersSearchHint => 'Search by name or email';

  @override
  String get aUsersAllRoles => 'All roles';

  @override
  String get aUsersNoResults => 'No users match this filter.';

  @override
  String get aUsersJoined => 'Joined';

  @override
  String get aUsersBookings => 'Bookings';

  @override
  String get aUsersReviews => 'Reviews';

  @override
  String get aUsersComplaints => 'Complaints';

  @override
  String get aUsersDetails => 'User details';

  @override
  String get aUsersRecentBookings => 'Recent bookings';

  @override
  String get aUsersRecentReviews => 'Recent reviews';

  @override
  String get aUsersBusiness => 'Linked business';

  @override
  String get aUsersNoBookings => 'No bookings yet.';

  @override
  String get aUsersNoReviews => 'No reviews yet.';

  @override
  String get aUsersReadOnly =>
      'User records are read-only. The schema has no account status field, and a provider account is tied to its business row — so deactivation and role changes have no endpoint to call.';

  @override
  String get aProvidersSearchHint => 'Search businesses';

  @override
  String get aProvidersAll => 'All';

  @override
  String get aProvidersApproved => 'Approved';

  @override
  String get aProvidersPending => 'Pending';

  @override
  String get aProvidersNoResults => 'No businesses match this filter.';

  @override
  String get aProvidersOwner => 'Owner';

  @override
  String get aProvidersServices => 'Services';

  @override
  String get aProvidersReviews => 'Reviews';

  @override
  String get aProvidersQueueEntries => 'Queue entries';

  @override
  String get aProvidersApprove => 'Approve';

  @override
  String get aProvidersRevoke => 'Revoke approval';

  @override
  String get aProvidersApproveTitle => 'Approve this business?';

  @override
  String get aProvidersApproveBody =>
      'It becomes visible to customers and can accept bookings.';

  @override
  String get aProvidersRevokeTitle => 'Revoke approval?';

  @override
  String get aProvidersRevokeBody =>
      'It disappears from customer discovery. Existing bookings are not cancelled.';

  @override
  String get aProvidersDetails => 'Business details';

  @override
  String get aCategoriesTitle => 'Categories';

  @override
  String get aCategoriesNew => 'New category';

  @override
  String get aCategoriesEdit => 'Edit category';

  @override
  String get aCategoriesActive => 'Active';

  @override
  String get aCategoriesInactive => 'Inactive';

  @override
  String get aCategoriesNone => 'No categories yet.';

  @override
  String get aCategoriesDeleteTitle => 'Delete this category?';

  @override
  String get aCategoriesDeleteBody =>
      'A category still used by services cannot be deleted — deactivate it instead.';

  @override
  String get aCategoriesNameRequired => 'A category needs a name.';

  @override
  String get aBookingsSearchHint => 'Search customer, business or service';

  @override
  String get aBookingsNoResults => 'No bookings match this filter.';

  @override
  String get aBookingsAll => 'All';

  @override
  String get aBookingsCustomer => 'Customer';

  @override
  String get aBookingsBusiness => 'Business';

  @override
  String get aBookingsReadOnly =>
      'Admins view bookings; the workflow belongs to the business that owns them.';

  @override
  String get aComplaintsNoResults => 'No complaints match this filter.';

  @override
  String get aComplaintsAllStatuses => 'All statuses';

  @override
  String get aComplaintsAllSeverities => 'All severities';

  @override
  String get aComplaintStatusOpen => 'Open';

  @override
  String get aComplaintStatusInReview => 'In review';

  @override
  String get aComplaintStatusResolved => 'Resolved';

  @override
  String get aComplaintStatusDismissed => 'Dismissed';

  @override
  String get aComplaintSeverityLow => 'Low';

  @override
  String get aComplaintSeverityMedium => 'Medium';

  @override
  String get aComplaintSeverityHigh => 'High';

  @override
  String get aComplaintDetails => 'Complaint';

  @override
  String get aComplaintAbout => 'About';

  @override
  String get aComplaintSubmittedBy => 'Submitted by';

  @override
  String get aComplaintFiled => 'Filed';

  @override
  String get aComplaintClosedAt => 'Closed';

  @override
  String get aComplaintUpdateStatus => 'Update status';

  @override
  String get aComplaintNoDetails => 'No further details were given.';

  @override
  String get aComplaintReopenNote =>
      'Reopening a closed complaint clears its closing date.';

  @override
  String get aReviewsTitle => 'Reviews';

  @override
  String get aReviewsNoResults => 'No reviews match this filter.';

  @override
  String get aReviewsAllProviders => 'All businesses';

  @override
  String get aReviewsDeleteTitle => 'Delete this review?';

  @override
  String get aReviewsDeleteBody =>
      'It is removed for everyone and the business\'s rating is recalculated. This cannot be undone.';

  @override
  String get aReviewsNoComment => 'No comment was left.';

  @override
  String get aReviewsDeleted => 'Review deleted';

  @override
  String get aReviewsBy => 'by';

  @override
  String get aAnalyticsTitle => 'Platform analytics';

  @override
  String get aAnalyticsBookings => 'Bookings';

  @override
  String get aAnalyticsCompleted => 'Completed';

  @override
  String get aAnalyticsCancelled => 'Cancelled';

  @override
  String get aAnalyticsCancelRate => 'Cancellation rate';

  @override
  String get aAnalyticsNewCustomers => 'New customers';

  @override
  String get aAnalyticsNewProviders => 'New businesses';

  @override
  String get aAnalyticsReviews => 'Reviews';

  @override
  String get aAnalyticsAvgRating => 'Average rating';

  @override
  String get aAnalyticsBookingTrend => 'Booking trend';

  @override
  String get aAnalyticsUserGrowth => 'User growth';

  @override
  String get aAnalyticsStatusBreakdown => 'Booking status breakdown';

  @override
  String get aAnalyticsPopularServices => 'Popular services';

  @override
  String get aAnalyticsTopProviders => 'Top businesses';

  @override
  String get aAnalyticsCategories => 'Businesses per category';

  @override
  String get aAnalyticsEmpty => 'Nothing was recorded in this range.';

  @override
  String get aAnalyticsSource =>
      'Every figure comes from /admin/analytics. Revenue, AI and system-health metrics are absent because the platform does not record them.';

  @override
  String get aAnalyticsCustomersLabel => 'Customers';

  @override
  String get aAnalyticsProvidersLabel => 'Businesses';

  @override
  String get aMoreManagement => 'Management';

  @override
  String get aMoreUsers => 'Users';

  @override
  String get aMoreCategories => 'Categories';

  @override
  String get aMoreReviews => 'Reviews';

  @override
  String get aMoreAnalytics => 'Analytics';

  @override
  String get aMoreAccount => 'Account';

  @override
  String get aMorePreferences => 'Preferences';

  @override
  String get aMoreUnsupported => 'Not available';

  @override
  String get aMoreNoPlatformSettings =>
      'No settings table exists, so booking windows, commission rates and similar values have nowhere to be stored.';

  @override
  String get aMoreNoNotifications => 'No notifications backend exists yet.';

  @override
  String get aMoreNoPassword => 'There is no change-password endpoint.';

  @override
  String get aMoreNoAudit =>
      'Nothing records administrative actions, so there is no audit log to show.';

  @override
  String get aMoreRealtimeNote =>
      'Admin lists refresh on demand: the only live event the backend sends an admin is a business opening or closing.';

  @override
  String get aBookingNotes => 'Notes';

  @override
  String get aCategoriesNoToggle =>
      'The categories endpoint accepts a name and description only. Active state is shown here but has no endpoint to change it — a category is deactivated in the database, not from this screen.';
}
