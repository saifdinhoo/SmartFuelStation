import { useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { translateToArabic } from '@/services/translateApi';

interface TranslateButtonProps {
  text: string;
}

// Drop this next to any piece of English user content (a review, a
// complaint, a provider description) to translate it to Arabic on click.
export function TranslateButton({ text }: TranslateButtonProps) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (translated) {
      setTranslated(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await translateToArabic(text);
      setTranslated(result);
    } catch {
      setError('Translation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        isLoading={isLoading}
        onClick={handleClick}
        className="h-7 self-start px-2 text-xs"
      >
        {!isLoading && <Languages className="h-3.5 w-3.5" />}
        {translated ? 'Show original' : 'Translate to Arabic'}
      </Button>
      {translated && (
        <p dir="rtl" lang="ar" className="text-body-sm text-foreground">
          {translated}
        </p>
      )}
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}
