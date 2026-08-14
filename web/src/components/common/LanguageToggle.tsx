import { Languages } from 'lucide-react';
import { useDirection } from '@/app/providers/DirectionProvider';

export function LanguageToggle() {
  const { language, toggleLanguage } = useDirection();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language and text direction"
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Languages className="h-4 w-4" />
      {language === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
