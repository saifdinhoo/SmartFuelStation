import { apiClient } from './apiClient';

interface TranslateResponse {
  success: boolean;
  data: {
    original: string;
    translated: string;
    targetLanguage: 'ar';
  };
}

export async function translateToArabic(text: string): Promise<string> {
  const response = await apiClient.post<TranslateResponse>('/translate', { text });
  return response.data.data.translated;
}
