import { storage } from '../utils/storage';
import { STORAGE_KEYS } from './storageKeys';

interface NotaryNodeConfig {
  branchId: string;
  name: string;
  countryCode: string;
  isDefault: boolean;
}

interface SignupConfig {
  BANK_USERNAME: string;
  BANK_PASSWORD: string;
  ACCOUNT_REPRESENTATIVE_ID: string;
  CUSTOMER_TEMPLATE_ID: string;
  ACCESS_RIGHT_TEMPLATE_ID: string;
  DEFAULT_COUNTRY_CODE: string;
  DEFAULT_REGISTERING_EMAIL: string;
  REFERRED_BY_PLATFORM: string;
  IS_REFERRED_BY_REQUIRED: boolean;
  AFTER_SIGNUP_URL: string;
  NOTARY_NODES: NotaryNodeConfig[];
}

export type AppEnvironmentId = 'WKYC_BETA' | 'GPWEB_BETA' | 'GPWEB';

interface EnvironmentConfig {
  id: AppEnvironmentId;
  label: string;
  baseUrl: string;
  callerId: string;
  signup: SignupConfig;
}

const DEFAULT_ENVIRONMENT_ID: AppEnvironmentId = 'WKYC_BETA';

// Replace import.meta.env with process.env (Expo uses EXPO_PUBLIC_ prefix)
const env = (key: string, fallback = ''): string =>
  (process.env[`EXPO_PUBLIC_${key}`] as string | undefined) ?? fallback;

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() === 'true';
};

const normalizeNotaryNodes = (
  nodes: NotaryNodeConfig[],
  fallbackCountryCode: string,
): NotaryNodeConfig[] => {
  const filtered = nodes.filter((n) => !!n.branchId && !!n.name && !!n.countryCode);
  if (filtered.length === 0) {
    return [{ branchId: '', name: 'Default Notary Node', countryCode: fallbackCountryCode, isDefault: true }];
  }
  if (!filtered.some((n) => n.isDefault)) {
    return [{ ...filtered[0], isDefault: true }, ...filtered.slice(1)];
  }
  return filtered;
};

const parseWkycNotaryNodes = (): NotaryNodeConfig[] => {
  const defaultNodes: NotaryNodeConfig[] = [
    { branchId: '82b42669-ac24-e911-9109-3ee1a118192f', name: 'World KYC HK - Hong Kong', countryCode: 'HK', isDefault: true },
    { branchId: 'adbc61a1-648e-e811-bca9-002590067f61', name: 'TradeEnabler TH - Thailand', countryCode: 'TH', isDefault: false },
  ];
  const rawNodes = env('SIGNUP_NOTARY_NODES');
  if (!rawNodes) return normalizeNotaryNodes(defaultNodes, 'HK');
  try {
    const parsed = JSON.parse(rawNodes) as NotaryNodeConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return normalizeNotaryNodes(defaultNodes, 'HK');
    return normalizeNotaryNodes(parsed, 'HK');
  } catch {
    return normalizeNotaryNodes(defaultNodes, 'HK');
  }
};

const APP_ENVIRONMENT_CONFIGS: Record<AppEnvironmentId, EnvironmentConfig> = {
  WKYC_BETA: {
    id: 'WKYC_BETA',
    label: 'WKYC-BETA',
    baseUrl: env('API_URL', 'https://www.bizcurrency.com:20500'),
    callerId: env('API_CALLER_ID', '12FDEC27-6E1F-4EC5-BF15-1C7E75A99117'),
    signup: {
      BANK_USERNAME: env('BANK_USERNAME'),
      BANK_PASSWORD: env('BANK_PASSWORD'),
      ACCOUNT_REPRESENTATIVE_ID: env('ACCOUNT_REPRESENTATIVE_ID', '9469c6b2-ebed-ec11-915b-3ee1a118192f'),
      CUSTOMER_TEMPLATE_ID: env('CUSTOMER_TEMPLATE_ID', 'b3cccc87-4317-ef11-8541-002248afce03'),
      ACCESS_RIGHT_TEMPLATE_ID: env('ACCESS_RIGHT_TEMPLATE_ID', 'dba74278-a2e8-4503-b59c-8ab8cd458841'),
      DEFAULT_COUNTRY_CODE: env('DEFAULT_COUNTRY_CODE', 'HK'),
      DEFAULT_REGISTERING_EMAIL: env('DEFAULT_REGISTERING_EMAIL', 'register@worldkyc.com'),
      REFERRED_BY_PLATFORM: env('REFERRED_BY_PLATFORM', 'WorldKYC Signup'),
      IS_REFERRED_BY_REQUIRED: parseBoolean(env('IS_REFERRED_BY_REQUIRED'), false),
      AFTER_SIGNUP_URL: env('AFTER_SIGNUP_URL'),
      NOTARY_NODES: parseWkycNotaryNodes(),
    },
  },
  GPWEB_BETA: {
    id: 'GPWEB_BETA',
    label: 'GPWEB-BETA',
    baseUrl: env('GPWEB_BETA_URL', 'https://www.bizcurrency.com:20200'),
    callerId: env('GPWEB_BETA_CALLER_ID', '819640E9-8DF1-4DB9-B13B-E9DCDDEEBA58'),
    signup: {
      BANK_USERNAME: env('GPWEB_BETA_BANK_USERNAME', 'demoview'),
      BANK_PASSWORD: env('GPWEB_BETA_BANK_PASSWORD', 'password'),
      ACCOUNT_REPRESENTATIVE_ID: env('GPWEB_BETA_ACCOUNT_REPRESENTATIVE_ID', '93b92051-5061-eb11-913d-3ee1a118192f'),
      CUSTOMER_TEMPLATE_ID: env('GPWEB_BETA_CUSTOMER_TEMPLATE_ID', 'd7bccd8b-5261-eb11-913d-3ee1a118192f'),
      ACCESS_RIGHT_TEMPLATE_ID: env('GPWEB_BETA_ACCESS_RIGHT_TEMPLATE_ID', 'e12b3d13-d213-4cad-bbbc-f3a8ca65e533'),
      DEFAULT_COUNTRY_CODE: 'HK',
      DEFAULT_REGISTERING_EMAIL: 'register@worldkyc.com',
      REFERRED_BY_PLATFORM: 'WorldKYC Signup',
      IS_REFERRED_BY_REQUIRED: false,
      AFTER_SIGNUP_URL: '',
      NOTARY_NODES: normalizeNotaryNodes([
        { branchId: '790553ea-6b85-f011-8556-002248afce03', name: 'World KYC HK - DEMO - Hong Kong', countryCode: 'HK', isDefault: false },
        { branchId: 'cb981909-6c85-f011-8556-002248afce03', name: 'TradeEnabler TH - DEMO - Thailand', countryCode: 'TH', isDefault: false },
        { branchId: '87b00e64-d28e-f011-8556-002248afce03', name: 'WinstantGold SX - DEMO - Sint Maarten', countryCode: 'SX', isDefault: true },
      ], 'HK'),
    },
  },
  GPWEB: {
    id: 'GPWEB',
    label: 'GPWEB',
    baseUrl: env('GPWEB_URL', 'https://www.bizcurrency.com:20300'),
    callerId: env('GPWEB_CALLER_ID', '819640E9-8DF1-4DB9-B13B-E9DCDDEEBA58'),
    signup: {
      BANK_USERNAME: env('GPWEB_BANK_USERNAME', 'demoview'),
      BANK_PASSWORD: env('GPWEB_BANK_PASSWORD', 'password'),
      ACCOUNT_REPRESENTATIVE_ID: env('GPWEB_ACCOUNT_REPRESENTATIVE_ID', '93b92051-5061-eb11-913d-3ee1a118192f'),
      CUSTOMER_TEMPLATE_ID: env('GPWEB_CUSTOMER_TEMPLATE_ID', 'd7bccd8b-5261-eb11-913d-3ee1a118192f'),
      ACCESS_RIGHT_TEMPLATE_ID: env('GPWEB_ACCESS_RIGHT_TEMPLATE_ID', 'e12b3d13-d213-4cad-bbbc-f3a8ca65e533'),
      DEFAULT_COUNTRY_CODE: 'HK',
      DEFAULT_REGISTERING_EMAIL: 'register@worldkyc.com',
      REFERRED_BY_PLATFORM: 'WorldKYC Signup',
      IS_REFERRED_BY_REQUIRED: false,
      AFTER_SIGNUP_URL: '',
      NOTARY_NODES: normalizeNotaryNodes([
        { branchId: '82b42669-ac24-e911-9109-3ee1a118192f', name: 'World KYC HK - Hong Kong', countryCode: 'HK', isDefault: false },
        { branchId: 'adbc61a1-648e-e811-bca9-002590067f61', name: 'TradeEnabler TH - Thailand', countryCode: 'TH', isDefault: false },
      ], 'HK'),
    },
  },
};

const isAppEnvironmentId = (value: string | null): value is AppEnvironmentId =>
  value !== null && value in APP_ENVIRONMENT_CONFIGS;

export const API_CONFIG = {
  ENDPOINTS: {
    AUTH: { LOGIN: '/api/v1/Authenticate', REFRESH: '/api/v1/Authenticate/Refresh' },
    USER: {
      DOES_USERNAME_EXIST: '/api/v1/User/DoesUsernameExist',
      LINK_ACCESS_RIGHT_TEMPLATE: '/api/v1/User/LinkAccessRightTemplate',
      PASSWORD_CHANGE: '/api/v1/User/PasswordChange',
    },
    CUSTOMER: {
      GET: '/api/v1/Customer',
      UPDATE: '/api/v1/Customer',
      BALANCES: '/api/v1/CustomerAccountBalance',
      STATEMENT: '/api/v1/CustomerAccountStatement',
      FROM_TEMPLATE: '/api/v1/Customer/FromTemplate',
      USER: '/api/v1/CustomerUser',
      ALIAS_LIST: '/api/v1/CustomerAccountAliasList',
    },
    COUNTRY: { LIST: '/api/v1/CountryList', ID_TYPES: '/api/v1/CountryIdentificationTypeList' },
    FILE_ATTACHMENT: { BASE: '/api/v1/FileAttachment', INFO_LIST: '/api/v1/FileAttachmentInfoList' },
    VERIFIED_LINK: { BASE: '/api/v1/VerifiedLink', SEARCH: '/api/v1/VerifiedLink/Search' },
    INSTANT_PAYMENT: {
      CREATE: '/api/v1/InstantPayment',
      POST: '/api/v1/InstantPayment/Post',
      SEARCH: '/api/v1/InstantPayment/Search',
    },
    FX: {
      QUOTE: '/api/v1/FXDealQuote',
      CURRENCY_LIST_BUY: '/api/v1/FXCurrencyList/Buy',
      CURRENCY_LIST_SELL: '/api/v1/FXCurrencyList/Sell',
      DEAL_SEARCH: '/api/v1/FXDeal/Search',
    },
    CURRENCY: { PAYMENT_LIST: '/api/v1/PaymentCurrencyList' },
  },
  TIMEOUT: 30000,
  STORAGE_KEYS,
} as const;

export const getEnvironmentOptions = (): Array<{ id: AppEnvironmentId; label: string }> =>
  (Object.keys(APP_ENVIRONMENT_CONFIGS) as AppEnvironmentId[]).map((id) => ({
    id,
    label: APP_ENVIRONMENT_CONFIGS[id].label,
  }));

export const getSelectedEnvironment = (): AppEnvironmentId => DEFAULT_ENVIRONMENT_ID;

export const getSelectedEnvironmentAsync = async (): Promise<AppEnvironmentId> => {
  const value = await storage.getItem(API_CONFIG.STORAGE_KEYS.SELECTED_ENVIRONMENT);
  return isAppEnvironmentId(value) ? value : DEFAULT_ENVIRONMENT_ID;
};

export const setSelectedEnvironment = async (environmentId: AppEnvironmentId): Promise<void> => {
  await storage.setItem(API_CONFIG.STORAGE_KEYS.SELECTED_ENVIRONMENT, environmentId);
};

export const getActiveEnvironmentConfig = (): EnvironmentConfig =>
  APP_ENVIRONMENT_CONFIGS[DEFAULT_ENVIRONMENT_ID];

// Runtime-mutable active environment (set at app startup from AsyncStorage)
let _activeEnvironmentId: AppEnvironmentId = DEFAULT_ENVIRONMENT_ID;

export const loadSavedEnvironment = async (): Promise<void> => {
  const value = await storage.getItem(STORAGE_KEYS.SELECTED_ENVIRONMENT);
  if (isAppEnvironmentId(value)) _activeEnvironmentId = value;
};

export const setActiveEnvironment = async (id: AppEnvironmentId): Promise<void> => {
  _activeEnvironmentId = id;
  await storage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, id);
};

export const getActiveEnvironmentId = (): AppEnvironmentId => _activeEnvironmentId;

export const getActiveBaseUrl = (): string => APP_ENVIRONMENT_CONFIGS[_activeEnvironmentId].baseUrl;
export const getActiveCallerId = (): string => APP_ENVIRONMENT_CONFIGS[_activeEnvironmentId].callerId;
export const getActiveSignupConfig = (): SignupConfig => APP_ENVIRONMENT_CONFIGS[_activeEnvironmentId].signup;
