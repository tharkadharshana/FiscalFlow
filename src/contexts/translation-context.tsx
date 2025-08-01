'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAppContext } from './app-context';
import { logger } from '@/lib/logger';

// --- Types ---
type Locale = 'en' | 'si' | 'ta';
type Translations = Record<string, any>;

interface TranslationContextType {
  locale: Locale;
  translations: Translations;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

// --- Context ---
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// --- Provider ---
export function TranslationProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAppContext();
  const [locale, setLocale] = useState<Locale>('en');
  const [translations, setTranslations] = useState<Translations>({});

  // Load translations from JSON file
  const loadTranslations = useCallback(async (currentLocale: Locale) => {
    try {
      const translationModule = await import(`@/locales/${currentLocale}.json`);
      setTranslations(translationModule.default);
    } catch (error) {
      logger.error('Failed to load translations', error as Error, { locale: currentLocale });
      // Fallback to English if the desired locale fails
      if (currentLocale !== 'en') {
        const fallbackModule = await import(`@/locales/en.json`);
        setTranslations(fallbackModule.default);
      }
    }
  }, []);

  // Effect to update locale based on user profile
  useEffect(() => {
    const newLocale = userProfile?.languagePreference || 'en';
    if (newLocale !== locale) {
      setLocale(newLocale as Locale);
    }
  }, [userProfile, locale]);

  // Effect to load new translations when locale changes
  useEffect(() => {
    loadTranslations(locale);
  }, [locale, loadTranslations]);

  // The translation function `t`
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = keys.reduce((acc, currentKey) => {
      if (acc && typeof acc === 'object' && currentKey in acc) {
        return acc[currentKey];
      }
      return undefined;
    }, translations as any);

    if (typeof result !== 'string') {
      // Key not found, return the key itself as a fallback
      return key;
    }

    // Replace placeholders like {{param}}
    if (params) {
      result = Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(`{{${paramKey}}}`, String(paramValue));
      }, result);
    }

    return result;
  };

  const value = {
    locale,
    translations,
    t,
    setLocale,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// --- Hook ---
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
