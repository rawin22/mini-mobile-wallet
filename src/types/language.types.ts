export interface LanguageOption {
    code: string;
    label: string;
    nativeLabel: string;
    flag: string;
}

export type TranslateParams = Record<string, string | number>;

export type TranslationValue = string | number | boolean | null | TranslationMap | TranslationValue[];

export interface TranslationMap {
    [key: string]: TranslationValue;
}

export interface LanguageContextType {
    language: string;
    languages: LanguageOption[];
    setLanguage: (code: string) => void;
    t: (key: string, params?: TranslateParams) => string;
    get: <T = TranslationValue>(key: string) => T | undefined;
}
