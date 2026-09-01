import type { AiLocale, DiagnosisLikelihood, DiagnosisUrgency } from './types';

// Small local string table for this one feature's static UI labels — not a
// project-wide i18n system (the web app doesn't have one yet). Gemini's own
// reply text already follows `locale` server-side; this only covers the
// chrome around it (buttons, headings, field labels).
export interface AiLabels {
  title: string;
  description: string;
  modeAuto: string;
  modeSupport: string;
  modeDiagnosis: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  clear: string;
  welcome: string;
  thinking: string;
  retry: string;
  genericError: string;
  diagnosisTitle: string;
  possibleCauses: string;
  urgencyLabels: Record<DiagnosisUrgency, string>;
  likelihoodLabels: Record<DiagnosisLikelihood, string>;
  safetyAdvice: string;
  needMoreInfo: string;
  recommendedCategory: string;
  findProviders: string;
  seekHelpTitle: string;
  seekHelpBody: string;
  findNearbySecondary: string;
}

export const AI_LABELS: Record<AiLocale, AiLabels> = {
  en: {
    title: 'AI Assistant',
    description:
      'Ask how the platform works, or describe a vehicle problem for a preliminary diagnosis.',
    modeAuto: 'Auto',
    modeSupport: 'Platform Support',
    modeDiagnosis: 'Vehicle Diagnosis',
    inputLabel: 'Message',
    placeholder: 'Type your message…',
    send: 'Send',
    clear: 'Clear conversation',
    welcome:
      "Hi! I'm your platform assistant. Ask me how something works, or describe a vehicle problem and I'll help narrow down what might be going on.",
    thinking: 'Thinking…',
    retry: 'Retry',
    genericError: 'AI Assistant is temporarily unavailable. Please try again.',
    diagnosisTitle: 'Preliminary Diagnosis',
    possibleCauses: 'Possible causes',
    urgencyLabels: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', EMERGENCY: 'Emergency' },
    likelihoodLabels: { LIKELY: 'Likely', POSSIBLE: 'Possible', LESS_LIKELY: 'Less likely' },
    safetyAdvice: 'Safety advice',
    needMoreInfo: 'I need a little more information.',
    recommendedCategory: 'Recommended service',
    findProviders: 'Find Suitable Providers',
    seekHelpTitle: 'Seek immediate help',
    seekHelpBody:
      'Stop driving as soon as it is safe to do so, and seek roadside or emergency assistance now — this is not something to wait on a booking for.',
    findNearbySecondary: 'Find nearby service providers',
  },
  ar: {
    title: 'المساعد الذكي',
    description: 'اسأل عن كيفية عمل المنصة، أو صف مشكلة في سيارتك للحصول على تشخيص أولي.',
    modeAuto: 'تلقائي',
    modeSupport: 'دعم المنصة',
    modeDiagnosis: 'تشخيص السيارة',
    inputLabel: 'الرسالة',
    placeholder: 'اكتب رسالتك…',
    send: 'إرسال',
    clear: 'مسح المحادثة',
    welcome:
      'مرحبًا! أنا مساعد المنصة. اسألني عن كيفية عمل أي شيء، أو صف مشكلة في سيارتك وسأساعدك في تحديد السبب المحتمل.',
    thinking: 'جارٍ التفكير…',
    retry: 'إعادة المحاولة',
    genericError: 'المساعد الذكي غير متاح مؤقتًا. يرجى المحاولة مرة أخرى.',
    diagnosisTitle: 'تشخيص أولي',
    possibleCauses: 'الأسباب المحتملة',
    urgencyLabels: { LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية', EMERGENCY: 'طارئة' },
    likelihoodLabels: { LIKELY: 'مرجّح', POSSIBLE: 'محتمل', LESS_LIKELY: 'أقل احتمالاً' },
    safetyAdvice: 'نصيحة السلامة',
    needMoreInfo: 'أحتاج إلى القليل من المعلومات الإضافية.',
    recommendedCategory: 'الخدمة الموصى بها',
    findProviders: 'ابحث عن مزوّدي خدمة مناسبين',
    seekHelpTitle: 'اطلب المساعدة فورًا',
    seekHelpBody:
      'توقف عن القيادة بمجرد أن يكون ذلك آمنًا، واطلب المساعدة على الطريق أو المساعدة الطارئة الآن — هذا ليس أمرًا ينتظر حجز موعد.',
    findNearbySecondary: 'ابحث عن مزوّدي خدمة قريبين',
  },
};
