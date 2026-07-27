import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Language = 'en' | 'ar';

interface DirectionContextValue {
  language: Language;
  dir: 'ltr' | 'rtl';
  toggleLanguage: () => void;
}

const DirectionContext = createContext<DirectionContextValue | null>(null);

const STORAGE_KEY = 'language';

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' ? 'ar' : 'en';
}

export function DirectionProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language, dir]);

  function toggleLanguage() {
    setLanguage((current) => (current === 'ar' ? 'en' : 'ar'));
  }

  return (
    <DirectionContext.Provider value={{ language, dir, toggleLanguage }}>
      {children}
    </DirectionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair, intentional
export function useDirection() {
  const context = useContext(DirectionContext);
  if (!context) throw new Error('useDirection must be used within a DirectionProvider');
  return context;
}
