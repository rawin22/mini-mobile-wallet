// ─── Currency & Token Icon Registry ──────────────────────────────────────────
// Hardcoded mapping of currency/token codes to their icon representation.
// To add a new currency or token, just add a line to ICON_REGISTRY.

export type IconType = 'flag' | 'ionicon' | 'custom';

export interface IconEntry {
  type: IconType;
  /** For 'flag': ISO 3166-1 alpha-2 country code. For 'ionicon': icon name. For 'custom': display text. */
  value: string;
  /** Optional brand color (used for ionicon tint and custom circle background). */
  color?: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const ICON_REGISTRY: Record<string, IconEntry> = {
  // Fiat — flag emoji derived from country code
  USD: { type: 'flag', value: 'US' },
  EUR: { type: 'flag', value: 'EU' },
  GBP: { type: 'flag', value: 'GB' },
  JPY: { type: 'flag', value: 'JP' },
  CHF: { type: 'flag', value: 'CH' },
  CAD: { type: 'flag', value: 'CA' },
  AUD: { type: 'flag', value: 'AU' },
  NZD: { type: 'flag', value: 'NZ' },
  ZAR: { type: 'flag', value: 'ZA' },
  NGN: { type: 'flag', value: 'NG' },
  KES: { type: 'flag', value: 'KE' },
  GHS: { type: 'flag', value: 'GH' },
  INR: { type: 'flag', value: 'IN' },
  CNY: { type: 'flag', value: 'CN' },
  SGD: { type: 'flag', value: 'SG' },
  HKD: { type: 'flag', value: 'HK' },
  AED: { type: 'flag', value: 'AE' },
  BRL: { type: 'flag', value: 'BR' },
  MXN: { type: 'flag', value: 'MX' },
  XOF: { type: 'flag', value: 'SN' },
  XAF: { type: 'flag', value: 'CM' },
  THB: { type: 'flag', value: 'TH' },
  KRW: { type: 'flag', value: 'KR' },
  SEK: { type: 'flag', value: 'SE' },
  NOK: { type: 'flag', value: 'NO' },
  DKK: { type: 'flag', value: 'DK' },
  PLN: { type: 'flag', value: 'PL' },
  TRY: { type: 'flag', value: 'TR' },
  RUB: { type: 'flag', value: 'RU' },
  ILS: { type: 'flag', value: 'IL' },
  PHP: { type: 'flag', value: 'PH' },
  IDR: { type: 'flag', value: 'ID' },
  MYR: { type: 'flag', value: 'MY' },
  CZK: { type: 'flag', value: 'CZ' },
  HUF: { type: 'flag', value: 'HU' },
  CLP: { type: 'flag', value: 'CL' },
  COP: { type: 'flag', value: 'CO' },
  PEN: { type: 'flag', value: 'PE' },
  ARS: { type: 'flag', value: 'AR' },
  EGP: { type: 'flag', value: 'EG' },
  MAD: { type: 'flag', value: 'MA' },
  TZS: { type: 'flag', value: 'TZ' },
  UGX: { type: 'flag', value: 'UG' },
  BWP: { type: 'flag', value: 'BW' },
  MUR: { type: 'flag', value: 'MU' },
  ANG: { type: 'flag', value: 'SX' },

  // Crypto — Ionicons
  BTC: { type: 'ionicon', value: 'logo-bitcoin', color: '#F7931A' },
  ETH: { type: 'ionicon', value: 'logo-ethereum', color: '#627EEA' },

  // Tokens & stablecoins — custom colored circle
  USDT: { type: 'custom', value: '₮', color: '#26A17B' },
  USDC: { type: 'custom', value: 'UC', color: '#2775CA' },
  DAI:  { type: 'custom', value: 'D', color: '#F5AC37' },
  BUSD: { type: 'custom', value: 'B', color: '#F0B90B' },
  WBTC: { type: 'custom', value: 'W', color: '#F7931A' },
  SOL:  { type: 'custom', value: 'S', color: '#9945FF' },
  MATIC:{ type: 'custom', value: 'M', color: '#8247E5' },
  DOT:  { type: 'custom', value: 'D', color: '#E6007A' },
  AVAX: { type: 'custom', value: 'A', color: '#E84142' },
  XRP:  { type: 'custom', value: 'X', color: '#23292F' },
  ADA:  { type: 'custom', value: 'A', color: '#0033AD' },
  LINK: { type: 'custom', value: 'L', color: '#2A5ADA' },
  UNI:  { type: 'custom', value: 'U', color: '#FF007A' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert an ISO 3166-1 alpha-2 country code to a flag emoji. */
export const countryCodeToFlag = (code: string): string => {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return upper;
  const offset = 0x1F1E6 - 65; // 'A' is 65
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
};

/** Look up the icon entry for a currency code. Returns undefined for unknown codes. */
export const getIconEntry = (currencyCode: string): IconEntry | undefined =>
  ICON_REGISTRY[currencyCode.toUpperCase()];

/** Get a display-ready flag emoji for a currency code (fiat only). */
export const getCurrencyFlag = (currencyCode: string): string => {
  const entry = ICON_REGISTRY[currencyCode.toUpperCase()];
  if (entry?.type === 'flag') return countryCodeToFlag(entry.value);
  return currencyCode.slice(0, 2).toUpperCase();
};

/** Deterministic color for unknown currency codes (used as fallback). */
export const hashColor = (code: string): string => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
};
