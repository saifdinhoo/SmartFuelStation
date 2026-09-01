// Mirrors the real backend contract exactly (see
// backend/src/services/ai.service.js and diagnosisSchema.js) — no invented
// fields, no client-only guessing at shape.

export type AiMode = 'AUTO' | 'SUPPORT' | 'DIAGNOSIS';
export type AiLocale = 'en' | 'ar';
export type AiConversationRole = 'user' | 'assistant';

export interface AiConversationMessage {
  role: AiConversationRole;
  content: string;
}

export interface AiChatRequest {
  message: string;
  mode?: AiMode;
  conversation?: AiConversationMessage[];
  locale?: AiLocale;
}

export type DiagnosisUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
export type DiagnosisLikelihood = 'LIKELY' | 'POSSIBLE' | 'LESS_LIKELY';
export type SuggestedAction = 'FIND_PROVIDER' | 'SEEK_IMMEDIATE_HELP' | 'NONE';

export interface DiagnosisCause {
  name: string;
  likelihood: DiagnosisLikelihood;
  explanation: string;
}

export interface Diagnosis {
  urgency: DiagnosisUrgency;
  possibleCauses: DiagnosisCause[];
  recommendedServiceCategory: string | null;
  safetyAdvice: string | null;
  followUpQuestion: string | null;
}

// The backend always resolves AUTO to a concrete mode before responding —
// a response is never itself tagged 'AUTO'.
export interface AiChatResponse {
  reply: string;
  mode: 'SUPPORT' | 'DIAGNOSIS';
  suggestedAction: SuggestedAction | null;
  suggestedCategoryId: number | null;
  diagnosis: Diagnosis | null;
}

// Client-side chat state — one entry per rendered bubble. Only `role` and
// `content` ever cross back into a future request's `conversation` array;
// everything else here is local presentation state.
export interface ChatMessage {
  id: string;
  role: AiConversationRole;
  content: string;
  mode?: AiChatResponse['mode'];
  diagnosis?: Diagnosis | null;
  suggestedAction?: SuggestedAction | null;
  suggestedCategoryId?: number | null;
}
