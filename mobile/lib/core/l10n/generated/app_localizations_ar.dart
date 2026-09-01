// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'خدمة السيارات الذكية';

  @override
  String get actionLogin => 'تسجيل الدخول';

  @override
  String get actionRegister => 'إنشاء حساب';

  @override
  String get actionLogout => 'تسجيل الخروج';

  @override
  String get actionRetry => 'إعادة المحاولة';

  @override
  String get actionSave => 'حفظ';

  @override
  String get actionCancel => 'إلغاء';

  @override
  String get actionAdd => 'إضافة';

  @override
  String get actionEdit => 'تعديل';

  @override
  String get actionDelete => 'حذف';

  @override
  String get actionApprove => 'اعتماد';

  @override
  String get fieldEmail => 'البريد الإلكتروني';

  @override
  String get fieldPassword => 'كلمة المرور';

  @override
  String get fieldName => 'الاسم';

  @override
  String get fieldDescription => 'الوصف';

  @override
  String get fieldBusinessName => 'اسم النشاط التجاري';

  @override
  String get fieldAddress => 'العنوان';

  @override
  String get fieldAccountType => 'نوع الحساب';

  @override
  String get roleCustomer => 'عميل';

  @override
  String get roleProvider => 'مقدّم خدمة';

  @override
  String get roleAdmin => 'مشرف';

  @override
  String get dayMonday => 'الإثنين';

  @override
  String get dayTuesday => 'الثلاثاء';

  @override
  String get dayWednesday => 'الأربعاء';

  @override
  String get dayThursday => 'الخميس';

  @override
  String get dayFriday => 'الجمعة';

  @override
  String get daySaturday => 'السبت';

  @override
  String get daySunday => 'الأحد';

  @override
  String get loginSubmitting => 'جارٍ تسجيل الدخول…';

  @override
  String get loginNoAccount => 'ليس لديك حساب؟ أنشئ حسابًا';

  @override
  String get registerSubmitting => 'جارٍ إنشاء الحساب…';

  @override
  String get registerProviderNotice =>
      'يحتاج حساب مقدّم الخدمة إلى موافقة المشرف قبل تفعيله.';

  @override
  String get navDashboard => 'الرئيسية';

  @override
  String get navCategories => 'الفئات';

  @override
  String get navProviders => 'مقدّمو الخدمة';

  @override
  String dashboardWelcome(String name) {
    return 'مرحبًا، $name';
  }

  @override
  String dashboardRole(String role) {
    return 'الدور: $role';
  }

  @override
  String dashboardApprovalStatus(String status) {
    return 'حالة اعتماد النشاط: $status';
  }

  @override
  String get statusApproved => 'معتمد';

  @override
  String get statusPendingApproval => 'بانتظار الاعتماد';

  @override
  String get categoriesEmpty => 'لا توجد فئات بعد.';

  @override
  String get categoriesAdd => 'إضافة فئة';

  @override
  String get categoriesEdit => 'تعديل الفئة';

  @override
  String get providersEmpty => 'لا يوجد مقدّمو خدمة بعد.';

  @override
  String get stateLoading => 'جارٍ التحميل…';

  @override
  String get stateErrorTitle => 'حدث خطأ ما';

  @override
  String get stateEmptyTitle => 'لا يوجد شيء هنا بعد';

  @override
  String get settingsTheme => 'المظهر';

  @override
  String get settingsLanguage => 'اللغة';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get themeSystem => 'حسب النظام';

  @override
  String get unauthorizedTitle => 'غير متاح لحسابك';

  @override
  String unauthorizedBody(String role) {
    return 'أنت مسجّل الدخول كـ $role، وهذا الدور لا يملك صلاحية الوصول إلى هذه الصفحة.';
  }

  @override
  String get unauthorizedGoBack => 'العودة إلى الرئيسية';

  @override
  String get notFoundTitle => 'الصفحة غير موجودة';

  @override
  String get navHome => 'الرئيسية';

  @override
  String get navExplore => 'استكشاف';

  @override
  String get navBookings => 'الحجوزات';

  @override
  String get navQueue => 'الطابور';

  @override
  String get navProfile => 'حسابي';

  @override
  String homeGreeting(String name) {
    return 'مرحبًا، $name';
  }

  @override
  String get homeBrowseCategories => 'تصفّح حسب الفئة';

  @override
  String get homeOpenNow => 'مفتوح الآن';

  @override
  String get homeNoOpenProviders => 'لا توجد أنشطة مفتوحة حاليًا.';

  @override
  String get homeSeeAll => 'عرض الكل';

  @override
  String get homeActiveBooking => 'حجزك النشط';

  @override
  String get homeNoActivity => 'ليس لديك حجوزات نشطة.';

  @override
  String get homeFindService => 'ابحث عن خدمة';

  @override
  String get exploreTitle => 'استكشاف';

  @override
  String get exploreSearchHint => 'ابحث عن نشاط أو خدمة…';

  @override
  String get exploreNoResults => 'لا توجد نتائج مطابقة لبحثك.';

  @override
  String get exploreNoProviders => 'لا توجد أنشطة متاحة بعد.';

  @override
  String get exploreFilterAll => 'كل الفئات';

  @override
  String get exploreOpenOnly => 'المفتوحة فقط';

  @override
  String get exploreSortDistance => 'الأقرب أولًا';

  @override
  String get exploreSortPrice => 'الأقل سعرًا';

  @override
  String get exploreSortRating => 'الأعلى تقييمًا';

  @override
  String get exploreSortLabel => 'ترتيب';

  @override
  String get exploreUseLocation => 'تحديث موقعي';

  @override
  String get exploreLocationDenied =>
      'الموقع غير متاح، لذا الترتيب حسب المسافة معطّل.';

  @override
  String exploreResultCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count نشاطًا',
      few: '$count أنشطة',
      two: 'نشاطان',
      one: 'نشاط واحد',
      zero: 'لا توجد أنشطة',
    );
    return '$_temp0';
  }

  @override
  String get providerOpen => 'مفتوح';

  @override
  String get providerClosed => 'مغلق';

  @override
  String providerDistanceKm(String km) {
    return 'يبعد $km كم';
  }

  @override
  String providerWaitMinutes(int minutes) {
    return 'انتظار ~$minutes دقيقة';
  }

  @override
  String providerReviewCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تقييمًا',
      few: '$count تقييمات',
      two: 'تقييمان',
      one: 'تقييم واحد',
      zero: 'لا توجد تقييمات',
    );
    return '$_temp0';
  }

  @override
  String get providerNoRating => 'لم يُقيَّم بعد';

  @override
  String get providerServices => 'الخدمات';

  @override
  String get providerNoServices =>
      'لا توجد خدمات متاحة للحجز في هذا النشاط حاليًا.';

  @override
  String get providerReviews => 'التقييمات';

  @override
  String get providerNoReviews => 'لا توجد تقييمات بعد.';

  @override
  String get providerAbout => 'نبذة';

  @override
  String get providerQueueNow => 'الطابور الآن';

  @override
  String providerInLine(int count) {
    return '$count في الانتظار';
  }

  @override
  String get locationViewLocation => 'عرض الموقع';

  @override
  String get locationGetDirections => 'الاتجاهات';

  @override
  String get locationCouldNotOpenMaps => 'تعذّر فتح الخرائط.';

  @override
  String get providerFavorite => 'حفظ';

  @override
  String get providerUnfavorite => 'محفوظ';

  @override
  String get providerBookNow => 'احجز الآن';

  @override
  String get providerClosedCannotBook =>
      'هذا النشاط مغلق حاليًا، لكن يمكنك طلب حجز.';

  @override
  String get providerHoursTitle => 'ساعات العمل';

  @override
  String get providerHoursNotSet => 'لم تُحدَّد الساعات';

  @override
  String get providerHoursNone => 'لم يحدد هذا النشاط ساعات عمله بعد.';

  @override
  String get fuelGasoline95 => 'بنزين 95';

  @override
  String get fuelGasoline98 => 'بنزين 98';

  @override
  String get fuelDiesel => 'ديزل / مازوت';

  @override
  String get fuelRemainingLabel => 'المتبقي';

  @override
  String get fuelCapacityLabel => 'السعة';

  @override
  String get fuelLastUpdatedLabel => 'آخر تحديث';

  @override
  String get fuelAvailabilityTitle => 'توفر الوقود';

  @override
  String get fuelMyInventoryTitle => 'مخزون الوقود لدي';

  @override
  String get fuelManagedByAdminNote => 'يدير مسؤول المنصة مخزون الوقود.';

  @override
  String get fuelHistoryTitle => 'الوقود المتبقي عبر الزمن';

  @override
  String get fuelRange7d => 'آخر 7 أيام';

  @override
  String get fuelRange30d => 'آخر 30 يومًا';

  @override
  String get fuelHistoryEmpty => 'لا يوجد سجل وقود في هذه الفترة بعد.';

  @override
  String get fuelHistorySinglePoint =>
      'سيظهر المزيد من السجل مع تحديث مستويات الوقود.';

  @override
  String serviceDuration(int minutes) {
    return '$minutes دقيقة';
  }

  @override
  String get bookingCreateTitle => 'حجز خدمة';

  @override
  String get bookingSelectService => 'الخدمة';

  @override
  String get bookingSelectServiceHint => 'اختر خدمة…';

  @override
  String get bookingDateTime => 'التاريخ والوقت';

  @override
  String get bookingNotes => 'ملاحظات (اختياري)';

  @override
  String get bookingNotesHint => 'أي شيء يجب أن يعرفه النشاط…';

  @override
  String get bookingSubmit => 'إرسال الطلب';

  @override
  String get bookingCreated => 'تم إرسال طلب الحجز';

  @override
  String get bookingErrorSelectService => 'اختر خدمة';

  @override
  String get bookingSelectDate => 'التاريخ';

  @override
  String bookingOpenHours(String opening, String closing) {
    return 'مفتوح من $opening إلى $closing';
  }

  @override
  String get bookingClosedOnDate => 'هذا النشاط مغلق في التاريخ المحدد.';

  @override
  String get bookingHoursNotConfigured =>
      'لم يحدد هذا النشاط ساعات عمله بعد، لذا لا يمكن الحجز في هذا التاريخ.';

  @override
  String get bookingNoSlotsFit =>
      'لا توجد أوقات تتسع لهذه الخدمة قبل الإغلاق في هذا التاريخ.';

  @override
  String get bookingSlotBookedLabel => 'محجوز';

  @override
  String get bookingSlotPastLabel => 'فات وقته';

  @override
  String get bookingErrorSelectSlot => 'اختر وقتًا متاحًا';

  @override
  String get bookingConflictRetry =>
      'تم حجز هذا الوقت للتو من قِبل شخص آخر. اختر وقتًا آخر أدناه.';

  @override
  String get bookingsTitle => 'الحجوزات';

  @override
  String get bookingsActive => 'النشطة';

  @override
  String get bookingsHistory => 'السجل';

  @override
  String get bookingsNoneActive => 'ليس لديك حجوزات نشطة.';

  @override
  String get bookingsNoneHistory => 'لا توجد حجوزات سابقة بعد.';

  @override
  String get bookingsNone => 'لم تقم بأي حجز بعد.';

  @override
  String get bookingsFindProvider => 'ابحث عن نشاط';

  @override
  String get bookingDetailsTitle => 'تفاصيل الحجز';

  @override
  String get bookingStatusLabel => 'الحالة';

  @override
  String get bookingDetailsSection => 'التفاصيل';

  @override
  String get bookingService => 'الخدمة';

  @override
  String get bookingCategory => 'الفئة';

  @override
  String get bookingPrice => 'السعر';

  @override
  String get bookingWhen => 'الموعد';

  @override
  String get bookingBusiness => 'النشاط';

  @override
  String get bookingCancel => 'إلغاء الحجز';

  @override
  String get bookingCancelConfirmTitle => 'إلغاء هذا الحجز؟';

  @override
  String get bookingCancelConfirmBody =>
      'سيتم إشعار النشاط. لا يمكن التراجع عن هذا.';

  @override
  String get bookingCancelled => 'تم إلغاء الحجز';

  @override
  String get bookingNotFound => 'هذا الحجز لم يعد موجودًا.';

  @override
  String get statusPending => 'قيد الانتظار';

  @override
  String get statusConfirmed => 'مؤكَّد';

  @override
  String get statusArrived => 'وصل';

  @override
  String get statusInQueue => 'في الطابور';

  @override
  String get statusInService => 'قيد الخدمة';

  @override
  String get statusCompleted => 'مكتمل';

  @override
  String get statusCancelled => 'ملغى';

  @override
  String get statusRejected => 'مرفوض';

  @override
  String get queueTitle => 'الطابور';

  @override
  String get queueNotInLine => 'لست في طابور حاليًا.';

  @override
  String get queueNotInLineBody =>
      'عندما يضيفك النشاط إلى طابوره، سيظهر دورك هنا.';

  @override
  String queuePosition(int position) {
    return 'أنت رقم $position في الطابور';
  }

  @override
  String get queueYoureNext => 'أنت التالي';

  @override
  String queueAhead(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count عميلًا أمامك',
      few: '$count عملاء أمامك',
      two: 'عميلان أمامك',
      one: 'عميل واحد أمامك',
      zero: 'لا أحد أمامك',
    );
    return '$_temp0';
  }

  @override
  String queueEstimatedWait(int minutes) {
    return 'الانتظار المتوقع: $minutes دقيقة';
  }

  @override
  String get queueBeingServed => 'يتم خدمتك الآن';

  @override
  String get queueServedBody => 'نتمنى لك خدمة ممتعة.';

  @override
  String get queueDone => 'اكتملت الخدمة';

  @override
  String get queueRemoved => 'تمت إزالتك من الطابور';

  @override
  String get queueStayNearby => 'يرجى البقاء قريبًا — سيتم استدعاؤك عند دورك.';

  @override
  String get queueWaitingToJoin => 'بانتظار الإضافة إلى الطابور';

  @override
  String get queueWaitingToJoinBody => 'أخبر موظف الاستقبال بوصولك.';

  @override
  String get queueRefresh => 'تحديث';

  @override
  String get queueLiveNote => 'تتحدّث الأرقام عند التحديث.';

  @override
  String get reviewWriteTitle => 'كتابة تقييم';

  @override
  String get reviewYourRating => 'تقييمك';

  @override
  String get reviewComment => 'تعليق (اختياري)';

  @override
  String get reviewCommentHint => 'كيف كانت الخدمة؟';

  @override
  String get reviewSubmit => 'إرسال التقييم';

  @override
  String get reviewSubmitted => 'شكرًا على تقييمك';

  @override
  String get reviewErrorRating => 'اختر تقييمًا من 1 إلى 5';

  @override
  String get reviewLeaveOne => 'اترك تقييمًا';

  @override
  String get reviewYours => 'تقييمك';

  @override
  String get reviewDelete => 'حذف التقييم';

  @override
  String get reviewDeleteConfirmTitle => 'حذف تقييمك؟';

  @override
  String get reviewDeleteConfirmBody =>
      'سيؤدي هذا إلى إزالته من تقييم النشاط. لا يمكن التراجع.';

  @override
  String get reviewDeleted => 'تم حذف التقييم';

  @override
  String get reviewOnlyAfterCompleted => 'يمكنك تقييم النشاط بعد إتمام حجزك.';

  @override
  String get myReviewsTitle => 'مراجعاتي';

  @override
  String get myReviewsEmpty => 'لم تقيّم أي حجوزات بعد.';

  @override
  String get myComplaintsTitle => 'شكاواي';

  @override
  String get myComplaintsEmpty => 'لم تقدّم أي شكاوى بعد.';

  @override
  String get complaintFile => 'تقديم شكوى';

  @override
  String get complaintFileTitle => 'تقديم شكوى';

  @override
  String get complaintBusiness => 'النشاط التجاري';

  @override
  String get complaintSubject => 'الموضوع';

  @override
  String get complaintSeverity => 'الخطورة';

  @override
  String get complaintDetails => 'التفاصيل (اختياري)';

  @override
  String get complaintSubmit => 'إرسال الشكوى';

  @override
  String get complaintSubmitted => 'تم إرسال الشكوى';

  @override
  String get complaintErrorProvider => 'اختر نشاطًا تجاريًا';

  @override
  String get complaintErrorSubject => 'الموضوع مطلوب';

  @override
  String get favoritesTitle => 'المفضلة';

  @override
  String get favoritesEmpty => 'احفظ نشاطًا تجاريًا من صفحته لتجده هنا لاحقًا.';

  @override
  String get profileTitle => 'حسابي';

  @override
  String get profileAccount => 'الحساب';

  @override
  String get profilePreferences => 'التفضيلات';

  @override
  String get profileRole => 'الدور';

  @override
  String get profileNotSet => 'غير محدّد';

  @override
  String get profileUnsupportedTitle => 'غير متاح بعد';

  @override
  String get profileEditUnsupported =>
      'تعديل الملف الشخصي يحتاج إلى واجهة برمجية غير موجودة بعد.';

  @override
  String get profileUnavailable => 'غير متاح';

  @override
  String get profileChangePasswordTitle => 'تغيير كلمة المرور';

  @override
  String get fieldCurrentPassword => 'كلمة المرور الحالية';

  @override
  String get fieldNewPassword => 'كلمة المرور الجديدة';

  @override
  String get fieldConfirmPassword => 'تأكيد كلمة المرور الجديدة';

  @override
  String get changePasswordSubmit => 'تغيير كلمة المرور';

  @override
  String get changePasswordSuccess => 'تم تغيير كلمة المرور بنجاح';

  @override
  String get changePasswordMismatch => 'كلمتا المرور غير متطابقتين';

  @override
  String get changePasswordTooShort => 'يجب ألا تقل كلمة المرور عن 6 أحرف';

  @override
  String get pNavOverview => 'نظرة عامة';

  @override
  String get pNavBookings => 'الحجوزات';

  @override
  String get pNavQueue => 'الطابور';

  @override
  String get pNavServices => 'الخدمات';

  @override
  String get pNavMore => 'المزيد';

  @override
  String pOverviewWelcome(String name) {
    return 'مرحبًا بعودتك، $name';
  }

  @override
  String get pOverviewApproved => 'معتمد';

  @override
  String get pOverviewPending => 'بانتظار الاعتماد';

  @override
  String get pOverviewPendingBody =>
      'لن يتمكن العملاء من العثور على نشاطك حتى يعتمده المشرف.';

  @override
  String get pOverviewOpen => 'مفتوح';

  @override
  String get pOverviewClosed => 'مغلق';

  @override
  String get pOverviewQueueLength => 'في الطابور';

  @override
  String get pOverviewWait => 'الانتظار المتوقع';

  @override
  String get pOverviewToday => 'اليوم';

  @override
  String get pOverviewCompleted => 'مكتملة';

  @override
  String get pOverviewRating => 'التقييم';

  @override
  String get pOverviewReviews => 'التقييمات';

  @override
  String get pOverviewRecentReviews => 'أحدث التقييمات';

  @override
  String get pOverviewNoReviews => 'لا توجد تقييمات بعد.';

  @override
  String get pOverviewQuickActions => 'إجراءات سريعة';

  @override
  String get pOverviewNextCustomer => 'ابدأ مع العميل التالي';

  @override
  String get pOverviewAddWalkIn => 'إضافة عميل مباشر';

  @override
  String get pOverviewViewQueue => 'عرض الطابور';

  @override
  String pOverviewPendingBookings(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count حجزًا يحتاج إجراء',
      few: '$count حجوزات تحتاج إجراء',
      two: 'حجزان يحتاجان إجراء',
      one: 'حجز واحد يحتاج إجراء',
      zero: 'لا توجد حجوزات تحتاج إجراء',
    );
    return '$_temp0';
  }

  @override
  String get pBookingsAll => 'الكل';

  @override
  String get pBookingsNeedsAction => 'تحتاج إجراء';

  @override
  String get pBookingsToday => 'اليوم';

  @override
  String get pBookingsUpcoming => 'القادمة';

  @override
  String get pBookingsPast => 'السابقة';

  @override
  String get pBookingsNone => 'لا توجد حجوزات بعد.';

  @override
  String get pBookingsNoneMatch => 'لا توجد حجوزات مطابقة لهذه الفلاتر.';

  @override
  String get pBookingsSearchHint => 'ابحث باسم العميل أو الخدمة…';

  @override
  String get pBookingCustomer => 'العميل';

  @override
  String get pBookingContact => 'بيانات التواصل';

  @override
  String get pBookingConfirm => 'تأكيد الحجز';

  @override
  String get pBookingReject => 'رفض';

  @override
  String get pBookingMarkArrived => 'تسجيل الوصول';

  @override
  String get pBookingAddToQueue => 'إضافة إلى الطابور';

  @override
  String get pBookingStartService => 'بدء الخدمة';

  @override
  String get pBookingCompleteService => 'إنهاء الخدمة';

  @override
  String get pBookingRemoveFromQueue => 'إزالة من الطابور';

  @override
  String get pBookingCancelBooking => 'إلغاء الحجز';

  @override
  String get pBookingNextStep => 'الخطوة التالية';

  @override
  String get pBookingNoActions => 'لا يوجد إجراء متبقٍ لهذا الحجز.';

  @override
  String get pBookingQueueEntry => 'بطاقة الطابور';

  @override
  String get pBookingPositionInLine => 'الترتيب في الطابور';

  @override
  String get pConfirmRejectTitle => 'رفض هذا الحجز؟';

  @override
  String get pConfirmRejectBody =>
      'سيتم إبلاغ العميل برفض طلبه. لا يمكن التراجع.';

  @override
  String get pConfirmCancelTitle => 'إلغاء هذا الحجز؟';

  @override
  String get pConfirmCancelBody => 'سيتم إشعار العميل. لا يمكن التراجع.';

  @override
  String get pConfirmRemoveQueueTitle => 'إزالة من الطابور؟';

  @override
  String get pConfirmRemoveQueueBody => 'سيخرج العميل من الطابور وسيُلغى حجزه.';

  @override
  String get pConfirmCompleteTitle => 'إنهاء الخدمة؟';

  @override
  String get pConfirmCompleteBody => 'سيتم اعتبار الخدمة منتهية وإغلاق الحجز.';

  @override
  String get pActionDone => 'تم';

  @override
  String get pQueueWaiting => 'في الانتظار';

  @override
  String get pQueueInService => 'قيد الخدمة';

  @override
  String get pQueueEmpty => 'الطابور فارغ.';

  @override
  String get pQueueEmptyBody => 'أضف عميلًا مباشرًا أو سجّل وصول حجز.';

  @override
  String get pQueueNoneWaiting => 'لا أحد في الانتظار.';

  @override
  String get pQueueNoneInService => 'لا أحد قيد الخدمة.';

  @override
  String get pQueueCurrent => 'الخدمة الحالية';

  @override
  String get pQueueNext => 'التالي';

  @override
  String get pQueueMoveUp => 'تحريك لأعلى';

  @override
  String get pQueueMoveDown => 'تحريك لأسفل';

  @override
  String get pQueueReordered => 'تم حفظ ترتيب الطابور';

  @override
  String get pWalkInTitle => 'إضافة عميل مباشر';

  @override
  String get pWalkInName => 'اسم العميل';

  @override
  String get pWalkInService => 'الخدمة';

  @override
  String get pWalkInAdd => 'إضافة إلى الطابور';

  @override
  String get pWalkInNameRequired => 'أدخل اسم العميل';

  @override
  String get pWalkInServiceRequired => 'اختر خدمة';

  @override
  String get pWalkInAdded => 'تمت الإضافة إلى الطابور';

  @override
  String get pServicesNone => 'لا توجد خدمات بعد.';

  @override
  String get pServicesNoneBody =>
      'أضف الخدمات التي يقدمها نشاطك ليتمكن العملاء من حجزها.';

  @override
  String get pServicesAdd => 'إضافة خدمة';

  @override
  String get pServicesEdit => 'تعديل الخدمة';

  @override
  String get pServiceName => 'اسم الخدمة';

  @override
  String get pServiceCategory => 'الفئة';

  @override
  String get pServicePrice => 'السعر';

  @override
  String get pServiceDuration => 'المدة (بالدقائق)';

  @override
  String get pServiceAvailable => 'متاحة للحجز';

  @override
  String get pServiceSaved => 'تم حفظ الخدمة';

  @override
  String get pServiceDeleted => 'تم حذف الخدمة';

  @override
  String get pServiceDeleteTitle => 'حذف هذه الخدمة؟';

  @override
  String get pServiceDeleteBody =>
      'لا يمكن حذف الخدمات التي لديها حجوزات أو سجل طابور — اجعلها غير متاحة بدلًا من ذلك.';

  @override
  String get pServiceNameRequired => 'أدخل اسم الخدمة';

  @override
  String get pServicePriceInvalid => 'أدخل سعرًا أكبر من 0';

  @override
  String get pServiceDurationInvalid => 'أدخل مدة أكبر من 0';

  @override
  String get pServiceNoCategories => 'يجب أن ينشئ المشرف فئة خدمات أولًا.';

  @override
  String get pProfileTitle => 'ملف النشاط';

  @override
  String get pProfileBusinessDetails => 'بيانات النشاط';

  @override
  String get pProfileBusinessName => 'اسم النشاط';

  @override
  String get pProfileDescription => 'الوصف';

  @override
  String get pProfileDescriptionHint => 'عرّف العملاء بما يقدمه نشاطك…';

  @override
  String get pProfileAddress => 'العنوان';

  @override
  String get pProfileContact => 'بيانات التواصل';

  @override
  String get pProfilePhone => 'الهاتف';

  @override
  String get pProfileContactName => 'اسم جهة الاتصال';

  @override
  String get pProfileEmailReadOnly =>
      'البريد الإلكتروني هو هوية تسجيل الدخول ولا يمكن تغييره هنا.';

  @override
  String get pProfileLocation => 'الموقع';

  @override
  String get pProfileLatitude => 'خط العرض';

  @override
  String get pProfileLongitude => 'خط الطول';

  @override
  String get pProfileLocationHint =>
      'يُستخدم لترتيب نشاطك حسب المسافة في بحث العملاء.';

  @override
  String get pProfileUseCurrentLocation => 'استخدم موقعي الحالي';

  @override
  String get pProfilePreviewOnMap => 'معاينة على الخريطة';

  @override
  String get pProfileLocationDenied =>
      'تعذّر تحديد موقعك الحالي. تحقق من الأذونات وحاول مرة أخرى.';

  @override
  String get pProfileSave => 'حفظ التغييرات';

  @override
  String get pProfileSaved => 'تم تحديث الملف';

  @override
  String get pHoursTitle => 'ساعات العمل';

  @override
  String get pHoursSubtitle =>
      'تُعرض للعملاء، وتُستخدم لتحديد الأوقات التي يمكنهم الحجز فيها.';

  @override
  String get pHoursClosed => 'مغلق';

  @override
  String get pHoursOpensLabel => 'يفتح';

  @override
  String get pHoursClosesLabel => 'يغلق';

  @override
  String get pHoursSave => 'حفظ التغييرات';

  @override
  String get pHoursDiscard => 'تجاهل التغييرات';

  @override
  String get pHoursSaved => 'تم حفظ ساعات العمل';

  @override
  String get pHoursErrorCloseBeforeOpen =>
      'يجب أن يكون وقت الإغلاق بعد وقت الفتح';

  @override
  String get pProfileNameRequired => 'اسم النشاط مطلوب';

  @override
  String get pProfileAddressRequired => 'العنوان مطلوب';

  @override
  String get pProfileCoordinateInvalid => 'أدخل إحداثية صحيحة';

  @override
  String get pLiveTitle => 'الحالة المباشرة';

  @override
  String get pLiveOpenForBusiness => 'مفتوح للعمل';

  @override
  String get pLiveOpenBody => 'يمكن للعملاء العثور عليك وحجز خدماتك المتاحة.';

  @override
  String get pLiveClosedBody => 'تظهر كمغلق. الحجوزات الحالية غير متأثرة.';

  @override
  String get pLiveNotApproved =>
      'نشاطك بانتظار الاعتماد، لذا لن يظهر في بحث العملاء بعد.';

  @override
  String get pLiveAdvertisedWait => 'وقت الانتظار المعلن';

  @override
  String get pLiveAdvertisedWaitBody =>
      'يظهر في ملفك العام. المتوسط المباشر محسوب من طابورك الفعلي.';

  @override
  String get pLiveMinutes => 'دقائق';

  @override
  String get pLiveSaved => 'تم تحديث الحالة';

  @override
  String get pLiveNowOpen => 'أنت الآن مفتوح';

  @override
  String get pLiveNowClosed => 'أنت الآن مغلق';

  @override
  String get pLiveLiveAverage => 'المتوسط المباشر';

  @override
  String get pLiveBeingServed => 'قيد الخدمة';

  @override
  String get pReviewsTitle => 'التقييمات';

  @override
  String get pReviewsAverage => 'متوسط التقييم';

  @override
  String get pReviewsTotal => 'إجمالي التقييمات';

  @override
  String get pReviewsNone => 'لا توجد تقييمات بعد.';

  @override
  String get pReviewsNoneBody => 'يمكن للعملاء تقييمك بعد إتمام حجوزاتهم.';

  @override
  String get pReviewsNoReplies =>
      'الرد على التقييمات غير متاح — لا يوجد حقل في قاعدة البيانات لتخزين الرد.';

  @override
  String get pReviewsFilterAll => 'كل التقييمات';

  @override
  String get pAnalyticsTitle => 'التحليلات';

  @override
  String get pAnalyticsRange7 => 'آخر 7 أيام';

  @override
  String get pAnalyticsRange30 => 'آخر 30 يومًا';

  @override
  String get pAnalyticsRange90 => 'آخر 90 يومًا';

  @override
  String get pAnalyticsTotal => 'الحجوزات';

  @override
  String get pAnalyticsCompleted => 'المكتملة';

  @override
  String get pAnalyticsCancelled => 'الملغاة';

  @override
  String get pAnalyticsCancelRate => 'نسبة الإلغاء';

  @override
  String get pAnalyticsAvgWait => 'متوسط الانتظار';

  @override
  String get pAnalyticsAvgRating => 'متوسط التقييم';

  @override
  String get pAnalyticsQueueHandled => 'بطاقات الطابور';

  @override
  String get pAnalyticsPopular => 'الخدمات الأكثر طلبًا';

  @override
  String get pAnalyticsBusy => 'ساعات الذروة';

  @override
  String get pAnalyticsBreakdown => 'حالات الحجوزات';

  @override
  String get pAnalyticsEmpty => 'لا يوجد نشاط في هذه الفترة.';

  @override
  String get pAnalyticsNoRevenue =>
      'تُعرض الإيرادات بشكل منفصل — راجع صفحة المالية لأرقام العمولة والأرباح الفعلية.';

  @override
  String get pFinanceTitle => 'أرباحي';

  @override
  String get pFinanceCommissionLabel => 'عمولة المنصة';

  @override
  String get pFinanceCommissionPaid => 'رسوم المنصة';

  @override
  String get pFinanceNetEarnings => 'صافي الأرباح';

  @override
  String get pFinancePending => 'قيد التسوية';

  @override
  String get pFinanceSettled => 'مُسوّى';

  @override
  String get pFinanceTrend => 'صافي الأرباح عبر الزمن';

  @override
  String get pFinanceTransactions => 'سجل المعاملات';

  @override
  String get pFinanceNoTransactions => 'لا توجد أرباح بعد';

  @override
  String get pFinanceReadOnlyNote =>
      'تُحدَّد من قِبل مشرف المنصة. لا يمكنك تعديل هذه النسبة — أي تغيير ينطبق فقط على الحجوزات المكتملة مستقبلًا.';

  @override
  String get pMoreTitle => 'المزيد';

  @override
  String get pMoreBusinessProfile => 'ملف النشاط';

  @override
  String get pMoreLiveStatus => 'الحالة المباشرة';

  @override
  String get pMoreReviews => 'التقييمات';

  @override
  String get pMoreAnalytics => 'التحليلات';

  @override
  String get pMoreFinance => 'المالية';

  @override
  String get pMoreAccount => 'الحساب';

  @override
  String get pMorePreferences => 'التفضيلات';

  @override
  String get pMoreUnsupported => 'غير متاح بعد';

  @override
  String get pMoreNoPassword => 'لا توجد واجهة لتغيير كلمة المرور بعد.';

  @override
  String get realtimeLive => 'مباشر';

  @override
  String get realtimeOffline => 'غير متصل';

  @override
  String get realtimeReconnecting => 'جارٍ إعادة الاتصال…';

  @override
  String get queueLiveUpdating => 'يتم التحديث تلقائيًا.';

  @override
  String get commonKm => 'كم';

  @override
  String get commonRefresh => 'تحديث';

  @override
  String get commonClose => 'إغلاق';

  @override
  String get commonBack => 'رجوع';

  @override
  String get aNavOverview => 'نظرة عامة';

  @override
  String get aNavProviders => 'الأنشطة';

  @override
  String get aNavBookings => 'الحجوزات';

  @override
  String get aNavComplaints => 'الشكاوى';

  @override
  String get aNavMore => 'المزيد';

  @override
  String get aOverviewUsers => 'المستخدمون';

  @override
  String get aOverviewCustomers => 'العملاء';

  @override
  String get aOverviewProviderAccounts => 'حسابات مقدمي الخدمة';

  @override
  String get aOverviewAdmins => 'المشرفون';

  @override
  String get aOverviewBusinesses => 'الأنشطة';

  @override
  String get aOverviewApproved => 'معتمد';

  @override
  String get aOverviewPending => 'قيد الاعتماد';

  @override
  String get aOverviewOpenNow => 'مفتوح الآن';

  @override
  String get aOverviewBookings => 'الحجوزات';

  @override
  String get aOverviewActive => 'نشط';

  @override
  String get aOverviewCompleted => 'مكتمل';

  @override
  String get aOverviewCancelled => 'ملغى';

  @override
  String get aOverviewRejected => 'مرفوض';

  @override
  String get aOverviewQueueNow => 'في الطابور الآن';

  @override
  String get aOverviewReviews => 'التقييمات';

  @override
  String get aOverviewAvgRating => 'متوسط التقييم';

  @override
  String get aOverviewCatalog => 'الكتالوج';

  @override
  String get aOverviewCategories => 'الفئات';

  @override
  String get aOverviewServices => 'الخدمات';

  @override
  String get aOverviewComplaintsOpen => 'شكاوى مفتوحة';

  @override
  String get aOverviewComplaintsTotal => 'إجمالي الشكاوى';

  @override
  String get aOverviewRecentRegistrations => 'التسجيلات الأخيرة';

  @override
  String get aOverviewPendingApprovals => 'بانتظار الاعتماد';

  @override
  String get aOverviewRecentComplaints => 'الشكاوى الأخيرة';

  @override
  String get aOverviewNothingPending => 'لا يوجد ما ينتظر الاعتماد.';

  @override
  String get aOverviewNoComplaints => 'لم تُقدَّم أي شكاوى.';

  @override
  String get aOverviewNoRegistrations => 'لا توجد تسجيلات حديثة.';

  @override
  String get aOverviewQuickActions => 'إجراءات سريعة';

  @override
  String get aOverviewViewAll => 'عرض الكل';

  @override
  String get aUsersTitle => 'المستخدمون';

  @override
  String get aUsersSearchHint => 'ابحث بالاسم أو البريد الإلكتروني';

  @override
  String get aUsersAllRoles => 'كل الأدوار';

  @override
  String get aUsersNoResults => 'لا يوجد مستخدمون مطابقون لهذه التصفية.';

  @override
  String get aUsersJoined => 'تاريخ الانضمام';

  @override
  String get aUsersBookings => 'الحجوزات';

  @override
  String get aUsersReviews => 'التقييمات';

  @override
  String get aUsersComplaints => 'الشكاوى';

  @override
  String get aUsersDetails => 'تفاصيل المستخدم';

  @override
  String get aUsersRecentBookings => 'أحدث الحجوزات';

  @override
  String get aUsersRecentReviews => 'أحدث التقييمات';

  @override
  String get aUsersBusiness => 'النشاط المرتبط';

  @override
  String get aUsersNoBookings => 'لا توجد حجوزات بعد.';

  @override
  String get aUsersNoReviews => 'لا توجد تقييمات بعد.';

  @override
  String get aUsersReadOnly =>
      'سجلات المستخدمين للقراءة فقط. لا يحتوي المخطط على حقل لحالة الحساب، وحساب مقدم الخدمة مرتبط بسجل نشاطه — لذلك لا يوجد إجراء للتعطيل أو تغيير الدور.';

  @override
  String get aProvidersSearchHint => 'ابحث في الأنشطة';

  @override
  String get aProvidersAll => 'الكل';

  @override
  String get aProvidersApproved => 'معتمد';

  @override
  String get aProvidersPending => 'قيد الاعتماد';

  @override
  String get aProvidersNoResults => 'لا توجد أنشطة مطابقة لهذه التصفية.';

  @override
  String get aProvidersOwner => 'المالك';

  @override
  String get aProvidersServices => 'الخدمات';

  @override
  String get aProvidersReviews => 'التقييمات';

  @override
  String get aProvidersQueueEntries => 'إدخالات الطابور';

  @override
  String get aProvidersApprove => 'اعتماد';

  @override
  String get aProvidersRevoke => 'سحب الاعتماد';

  @override
  String get aFuelManageButton => 'إدارة الوقود';

  @override
  String get aFuelTitle => 'إدارة الوقود';

  @override
  String get aFuelNotConfigured => 'لم يُضبط بعد.';

  @override
  String get aFuelSetUp => 'إعداد';

  @override
  String get aFuelUpdate => 'تحديث';

  @override
  String get aFuelCapacityField => 'السعة';

  @override
  String get aFuelRemainingField => 'المتبقي';

  @override
  String get aFuelPriceField => 'السعر لكل لتر';

  @override
  String get aFuelSaved => 'تم تحديث مخزون الوقود';

  @override
  String get aFuelCapacityInvalid => 'يجب أن تكون السعة أكبر من 0';

  @override
  String get aFuelRemainingInvalid => 'يجب ألا يكون المتبقي بالسالب';

  @override
  String get aFuelRemainingExceedsCapacity => 'لا يمكن أن يتجاوز المتبقي السعة';

  @override
  String get aFuelPriceInvalid => 'يجب ألا يكون السعر بالسالب';

  @override
  String get financeGross => 'الإجمالي';

  @override
  String get financeCommission => 'العمولة';

  @override
  String get financeNet => 'الصافي';

  @override
  String get financeCommissionRateField => 'نسبة العمولة';

  @override
  String get financeStatusAll => 'كل الحالات';

  @override
  String get financeStatusPending => 'قيد التسوية';

  @override
  String get financeStatusSettled => 'مُسوّى';

  @override
  String get financeTrendEmpty =>
      'لا توجد حجوزات مكتملة مسجَّلة في هذه الفترة بعد.';

  @override
  String get financeTrendSinglePoint =>
      'سيظهر المزيد من السجل مع اكتمال الحجوزات.';

  @override
  String get financeUnknownService => 'حجز';

  @override
  String get commonCreated => 'تاريخ الإنشاء';

  @override
  String get aFinanceTitle => 'المالية';

  @override
  String get aFinanceCommissionRevenue => 'إيرادات المنصة';

  @override
  String get aFinanceProviderNet => 'صافي مستحقات المزوّد';

  @override
  String get aFinancePending => 'التسويات المعلّقة';

  @override
  String get aFinanceSettled => 'المُسوّى';

  @override
  String get aFinanceTransactionCount => 'عدد المعاملات';

  @override
  String get aFinanceTrend => 'الإيرادات عبر الزمن';

  @override
  String get aFinanceTransactions => 'المعاملات';

  @override
  String get aFinanceProviderFilter => 'المزوّد';

  @override
  String get aFinanceAllProviders => 'كل المزوّدين';

  @override
  String get aFinanceNoTransactions =>
      'لا توجد معاملات مطابقة لهذا الفلتر بعد.';

  @override
  String get aFinanceMarkSettled => 'تحديد كمُسوّى';

  @override
  String get aFinanceSettleSuccess => 'تم تحديد المعاملة كمُسوّاة';

  @override
  String get aFinanceSettledAt => 'تمت التسوية';

  @override
  String get aFinanceCommissionEdit => 'إدارة العمولة';

  @override
  String get aFinanceCommissionTitle => 'عمولة المنصة';

  @override
  String get aFinanceCommissionInvalid => 'يجب أن تكون نسبة العمولة بين 0 و100';

  @override
  String get aFinanceCommissionSaved => 'تم تحديث نسبة العمولة';

  @override
  String get aProvidersApproveTitle => 'اعتماد هذا النشاط؟';

  @override
  String get aProvidersApproveBody =>
      'سيصبح مرئيًا للعملاء وقادرًا على قبول الحجوزات.';

  @override
  String get aProvidersRevokeTitle => 'سحب الاعتماد؟';

  @override
  String get aProvidersRevokeBody =>
      'سيختفي من نتائج بحث العملاء. لن تُلغى الحجوزات الحالية.';

  @override
  String get aProvidersDetails => 'تفاصيل النشاط';

  @override
  String get aCategoriesTitle => 'الفئات';

  @override
  String get aCategoriesNew => 'فئة جديدة';

  @override
  String get aCategoriesEdit => 'تعديل الفئة';

  @override
  String get aCategoriesActive => 'مفعّلة';

  @override
  String get aCategoriesInactive => 'غير مفعّلة';

  @override
  String get aCategoriesNone => 'لا توجد فئات بعد.';

  @override
  String get aCategoriesDeleteTitle => 'حذف هذه الفئة؟';

  @override
  String get aCategoriesDeleteBody =>
      'لا يمكن حذف فئة ما زالت مستخدمة في خدمات — عطّلها بدلًا من ذلك.';

  @override
  String get aCategoriesNameRequired => 'الفئة تحتاج إلى اسم.';

  @override
  String get aBookingsSearchHint => 'ابحث بالعميل أو النشاط أو الخدمة';

  @override
  String get aBookingsNoResults => 'لا توجد حجوزات مطابقة لهذه التصفية.';

  @override
  String get aBookingsAll => 'الكل';

  @override
  String get aBookingsCustomer => 'العميل';

  @override
  String get aBookingsBusiness => 'النشاط';

  @override
  String get aBookingsReadOnly =>
      'يطّلع المشرف على الحجوزات؛ أما سير العمل فيخص النشاط المالك لها.';

  @override
  String get aComplaintsNoResults => 'لا توجد شكاوى مطابقة لهذه التصفية.';

  @override
  String get aComplaintsAllStatuses => 'كل الحالات';

  @override
  String get aComplaintsAllSeverities => 'كل المستويات';

  @override
  String get aComplaintStatusOpen => 'مفتوحة';

  @override
  String get aComplaintStatusInReview => 'قيد المراجعة';

  @override
  String get aComplaintStatusResolved => 'محلولة';

  @override
  String get aComplaintStatusDismissed => 'مرفوضة';

  @override
  String get aComplaintSeverityLow => 'منخفضة';

  @override
  String get aComplaintSeverityMedium => 'متوسطة';

  @override
  String get aComplaintSeverityHigh => 'عالية';

  @override
  String get aComplaintDetails => 'الشكوى';

  @override
  String get aComplaintAbout => 'بخصوص';

  @override
  String get aComplaintSubmittedBy => 'مقدَّمة من';

  @override
  String get aComplaintFiled => 'تاريخ التقديم';

  @override
  String get aComplaintClosedAt => 'تاريخ الإغلاق';

  @override
  String get aComplaintUpdateStatus => 'تحديث الحالة';

  @override
  String get aComplaintNoDetails => 'لم تُقدَّم تفاصيل إضافية.';

  @override
  String get aComplaintReopenNote => 'إعادة فتح شكوى مغلقة تمسح تاريخ إغلاقها.';

  @override
  String get aReviewsTitle => 'التقييمات';

  @override
  String get aReviewsNoResults => 'لا توجد تقييمات مطابقة لهذه التصفية.';

  @override
  String get aReviewsAllProviders => 'كل الأنشطة';

  @override
  String get aReviewsDeleteTitle => 'حذف هذا التقييم؟';

  @override
  String get aReviewsDeleteBody =>
      'سيُحذف للجميع وسيُعاد حساب تقييم النشاط. لا يمكن التراجع عن ذلك.';

  @override
  String get aReviewsNoComment => 'لم يُترك تعليق.';

  @override
  String get aReviewsDeleted => 'تم حذف التقييم';

  @override
  String get aReviewsBy => 'بواسطة';

  @override
  String get aAnalyticsTitle => 'تحليلات المنصة';

  @override
  String get aAnalyticsBookings => 'الحجوزات';

  @override
  String get aAnalyticsCompleted => 'مكتملة';

  @override
  String get aAnalyticsCancelled => 'ملغاة';

  @override
  String get aAnalyticsCancelRate => 'نسبة الإلغاء';

  @override
  String get aAnalyticsNewCustomers => 'عملاء جدد';

  @override
  String get aAnalyticsNewProviders => 'أنشطة جديدة';

  @override
  String get aAnalyticsReviews => 'التقييمات';

  @override
  String get aAnalyticsAvgRating => 'متوسط التقييم';

  @override
  String get aAnalyticsBookingTrend => 'اتجاه الحجوزات';

  @override
  String get aAnalyticsUserGrowth => 'نمو المستخدمين';

  @override
  String get aAnalyticsStatusBreakdown => 'توزيع حالات الحجز';

  @override
  String get aAnalyticsPopularServices => 'الخدمات الأكثر طلبًا';

  @override
  String get aAnalyticsTopProviders => 'أبرز الأنشطة';

  @override
  String get aAnalyticsCategories => 'الأنشطة حسب الفئة';

  @override
  String get aAnalyticsEmpty => 'لا توجد بيانات مسجّلة في هذه الفترة.';

  @override
  String get aAnalyticsSource =>
      'كل رقم مصدره /admin/analytics. مؤشرات الإيرادات والذكاء الاصطناعي وصحة النظام غير موجودة لأن المنصة لا تسجّلها.';

  @override
  String get aAnalyticsCustomersLabel => 'العملاء';

  @override
  String get aAnalyticsProvidersLabel => 'الأنشطة';

  @override
  String get aMoreManagement => 'الإدارة';

  @override
  String get aMoreUsers => 'المستخدمون';

  @override
  String get aMoreCategories => 'الفئات';

  @override
  String get aMoreReviews => 'التقييمات';

  @override
  String get aMoreAnalytics => 'التحليلات';

  @override
  String get aMoreFinance => 'المالية';

  @override
  String get aMoreAccount => 'الحساب';

  @override
  String get aMorePreferences => 'التفضيلات';

  @override
  String get aMoreUnsupported => 'غير متاح';

  @override
  String get aMoreNoPlatformSettings =>
      'لا يوجد جدول لإعدادات نوافذ الحجز أو ما شابهها من قيم الجدولة — أما نسب العمولة فهي مخزَّنة وقابلة للتعديل من صفحة المالية.';

  @override
  String get aMoreNoPassword => 'لا يوجد إجراء لتغيير كلمة المرور.';

  @override
  String get aMoreNoAudit =>
      'لا يُسجَّل أي إجراء إداري، لذلك لا يوجد سجل تدقيق لعرضه.';

  @override
  String get aMoreRealtimeNote =>
      'تُحدَّث قوائم المشرف عند الطلب: الحدث المباشر الوحيد الذي يرسله الخادم للمشرف هو فتح نشاط أو إغلاقه.';

  @override
  String get aBookingNotes => 'ملاحظات';

  @override
  String get aCategoriesNoToggle =>
      'يقبل إجراء الفئات الاسم والوصف فقط. تُعرض حالة التفعيل هنا لكن لا يوجد إجراء لتغييرها — تُعطَّل الفئة في قاعدة البيانات وليس من هذه الشاشة.';

  @override
  String get notifTitle => 'الإشعارات';

  @override
  String get notifMarkAllRead => 'تحديد الكل كمقروء';

  @override
  String get notifEmpty => 'لا توجد إشعارات بعد.';

  @override
  String notifUnreadSummary(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count إشعارات غير مقروءة',
      one: 'إشعار واحد غير مقروء',
      zero: 'لا توجد إشعارات غير مقروءة',
    );
    return '$_temp0';
  }

  @override
  String get homeLiveStationSection => 'المحطة المباشرة';

  @override
  String get homeLiveStationBody =>
      'اطّلع على وضع المحطة الحالي قبل التوجه إليها.';

  @override
  String get homeWatchLive => 'مشاهدة البث المباشر';

  @override
  String get liveCameraLive => 'مباشر';

  @override
  String get liveCameraOffline => 'الكاميرا غير متصلة';

  @override
  String get liveCameraUnavailableMessage => 'البث المباشر غير متاح حاليًا';

  @override
  String get liveCameraPrivacyNote =>
      'البث المباشر مقدَّم من المحطة لعرض الوضع الحالي فقط.';

  @override
  String get liveStationAppBarTitle => 'المحطة المباشرة';

  @override
  String get liveStationNotAvailable => 'البث المباشر غير متاح لهذا النشاط.';

  @override
  String get aiAssistantTitle => 'المساعد الذكي';

  @override
  String get aiAssistantDescription =>
      'اسأل عن كيفية عمل المنصة، أو صف مشكلة في سيارتك للحصول على تشخيص أولي.';

  @override
  String get aiAssistantWelcome =>
      'مرحبًا! أنا مساعد المنصة. اسألني عن كيفية عمل أي شيء، أو صف مشكلة في سيارتك وسأساعدك في تحديد السبب المحتمل.';

  @override
  String get aiAssistantInputHint => 'اكتب رسالتك…';

  @override
  String get aiAssistantClear => 'مسح المحادثة';

  @override
  String get aiAssistantUnavailable =>
      'مساعد الذكاء الاصطناعي غير متاح مؤقتًا. حاول مرة أخرى.';

  @override
  String get aiSend => 'إرسال';

  @override
  String get aiThinking => 'جارٍ التفكير…';

  @override
  String get aiModeAuto => 'تلقائي';

  @override
  String get aiModeSupport => 'دعم المنصة';

  @override
  String get aiModeDiagnosis => 'تشخيص المركبة';

  @override
  String get aiDiagnosisTitle => 'تشخيص أولي';

  @override
  String get aiPossibleCauses => 'الأسباب المحتملة';

  @override
  String get aiLikelihood => 'الاحتمالية';

  @override
  String get aiLikelihoodLikely => 'مرجّح';

  @override
  String get aiLikelihoodPossible => 'محتمل';

  @override
  String get aiLikelihoodLessLikely => 'أقل احتمالاً';

  @override
  String get aiLikelihoodUnknown => 'غير محدد';

  @override
  String get aiUrgencyLow => 'منخفضة';

  @override
  String get aiUrgencyMedium => 'متوسطة';

  @override
  String get aiUrgencyHigh => 'عالية';

  @override
  String get aiUrgencyEmergency => 'طارئة';

  @override
  String get aiUrgencyUnknown => 'غير محدد';

  @override
  String get aiSafetyAdvice => 'نصيحة السلامة';

  @override
  String get aiNeedMoreInfo => 'أحتاج إلى القليل من المعلومات الإضافية.';

  @override
  String get aiRecommendedService => 'الخدمة الموصى بها';

  @override
  String get aiFindProviders => 'ابحث عن مزوّدي خدمة مناسبين';

  @override
  String get aiFindNearbySecondary => 'ابحث عن مزوّدي خدمة قريبين';

  @override
  String get aiSeekImmediateHelp => 'اطلب المساعدة فورًا';

  @override
  String get aiSeekImmediateHelpBody =>
      'توقف عن القيادة بمجرد أن يكون ذلك آمنًا، واطلب المساعدة على الطريق أو المساعدة الطارئة الآن — هذا ليس أمرًا ينتظر حجز موعد.';
}
