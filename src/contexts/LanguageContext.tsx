import React, { useCallback, useEffect, useMemo, useState } from 'react';
import english from '../lang/english.json';
import french from '../lang/french.json';
import portuguese from '../lang/portuguese.json';
import languageList from '../lang/languages.json';
import { LanguageContext } from './languageContextValue';
import { storage } from '../utils/storage';
import { setFormatterLocale } from '../utils/formatters';
import type {
  LanguageOption,
  LanguageContextType,
  TranslationMap,
  TranslationValue,
  TranslateParams,
} from '../types/language.types';

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'en';

const dictionaries: Record<string, TranslationMap> = {
  en: english as TranslationMap,
  fr: french as TranslationMap,
  pt: portuguese as TranslationMap,
};

const getNestedValue = (
  source: TranslationMap | undefined,
  key: string,
): TranslationValue | undefined => {
  if (!source) return undefined;
  return key.split('.').reduce<TranslationValue | undefined>((current, segment) => {
    if (current === null || current === undefined || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    return (current as TranslationMap)[segment];
  }, source);
};

const interpolate = (template: string, params?: TranslateParams): string => {
  if (!params) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token: string) => {
    const value = params[token];
    return value === undefined ? '' : String(value);
  });
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Load persisted language from AsyncStorage on mount
  useEffect(() => {
    storage.getItem(LANGUAGE_KEY).then((stored) => {
      const lang = stored && dictionaries[stored] ? stored : DEFAULT_LANGUAGE;
      setLanguageState(lang);
      setFormatterLocale(lang);
    });
  }, []);

  const updateLanguage = useCallback((code: string) => {
    const lang = dictionaries[code] ? code : DEFAULT_LANGUAGE;
    setLanguageState(lang);
    setFormatterLocale(lang);
    storage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const contextValue = useMemo<LanguageContextType>(() => {
    const get = <T = TranslationValue,>(key: string): T | undefined => {
      const selected = getNestedValue(dictionaries[language], key);
      if (selected !== undefined) return selected as T;
      return getNestedValue(dictionaries[DEFAULT_LANGUAGE], key) as T | undefined;
    };

    const t = (key: string, params?: TranslateParams): string => {
      const value = get<string | TranslationValue>(key);
      if (typeof value === 'string') return interpolate(value, params);
      return key;
    };

    return {
      language,
      languages: languageList as LanguageOption[],
      setLanguage: updateLanguage,
      t,
      get,
    };
  }, [language, updateLanguage]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};
