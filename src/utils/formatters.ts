const localeByLanguage: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
};

// Allow locale to be injected from LanguageContext for formatting
let _activeLocale = 'en-US';

export const setFormatterLocale = (languageCode: string): void => {
  _activeLocale = localeByLanguage[languageCode] ?? 'en-US';
};

export const formatCurrency = (amount: number, decimals = 2): string => {
  return (amount ?? 0).toLocaleString(_activeLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString(_activeLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString(_activeLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const todayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};
