
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, TranslationKeys } from './translations';

export type Language = 'en' | 'zh';

// Type for the t function
type TFunction = (key: TranslationKeys, ...args: any[]) => string;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// --- For non-React modules like geminiService.ts ---
let globalLanguage: Language = 'zh';

const getInitialLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en'; // Default for server-side
    const savedLang = localStorage.getItem('app_language') as Language;
    const browserLang = navigator.language.split(/[-_]/)[0];
    return savedLang || (browserLang === 'zh' ? 'zh' : 'en');
};

globalLanguage = getInitialLanguage();

const setGlobalLanguage = (lang: Language) => {
    globalLanguage = lang;
};

// Simple interpolation helper
const interpolate = (text: string, ...args: any[]): string => {
    if (args.length === 0) {
        return text;
    }
    // Handle named arguments if the first arg is a plain object
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
        const replacements = args[0];
        return text.replace(/\{(\w+)\}/g, (placeholder, key) => {
            return replacements.hasOwnProperty(key) ? String(replacements[key]) : placeholder;
        });
    }
    
    // Handle positional arguments
    let result = text;
    args.forEach((arg, index) => {
        result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
    });
    return result;
};


// FIX: Updated to handle nested keys.
const getTranslation = (lang: Language, key: string): string | undefined => {
    const keys = key.split('.');
    const result = keys.reduce((obj: any, k: string) => (obj || {})[k], translations[lang]);
    return typeof result === 'string' ? result : undefined;
};

export const translateServiceError: TFunction = (key, ...args) => {
    const text = getTranslation(globalLanguage, key) || getTranslation('en', key) || String(key);
    return interpolate(text, ...args);
};
// --- End non-React section ---


export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage());

  useEffect(() => {
    setGlobalLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app_language', lang);
    setLanguageState(lang);
  };

  const t: TFunction = (key, ...args) => {
    const text = getTranslation(language, key) || getTranslation('en', key) || String(key);
    return interpolate(text, ...args);
  };

  // FIX: Replaced JSX with React.createElement to be compatible with a .ts file extension
  // and resolve the reported parsing errors.
  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
