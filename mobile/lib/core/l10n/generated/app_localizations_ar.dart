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
}
