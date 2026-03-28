import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../api/storageKeys';
import type { TokenData, UserSettings } from '../types/auth.types';

interface SavedCredentials {
  username: string;
  password: string;
}

const CREDENTIALS_CIPHER_KEY = process.env.EXPO_PUBLIC_LOCAL_CREDENTIALS_SECRET ?? 'mini-wallet-local-key';

// ─── Base64 helpers (RN-compatible, no btoa/atob) ────────────────────────────

const toBase64 = (value: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  while (i < value.length) {
    const a = value.charCodeAt(i++);
    const b = i < value.length ? value.charCodeAt(i++) : 0;
    const c = i < value.length ? value.charCodeAt(i++) : 0;
    result +=
      chars[a >> 2] +
      chars[((a & 3) << 4) | (b >> 4)] +
      chars[((b & 15) << 2) | (c >> 6)] +
      chars[c & 63];
  }
  const padding = value.length % 3;
  return padding ? result.slice(0, padding - 3) + '==='.slice(0, 3 - padding) : result;
};

const fromBase64 = (base64: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  while (i < str.length) {
    const a = chars.indexOf(str[i++]);
    const b = chars.indexOf(str[i++]);
    const c = chars.indexOf(str[i++]);
    const d = chars.indexOf(str[i++]);
    result +=
      String.fromCharCode((a << 2) | (b >> 4)) +
      (c !== 64 ? String.fromCharCode(((b & 15) << 4) | (c >> 2)) : '') +
      (d !== 64 ? String.fromCharCode(((c & 3) << 6) | d) : '');
  }
  return result;
};

const transformWithKey = (value: string, direction: 'encrypt' | 'decrypt'): string => {
  if (!value) return '';
  const input = direction === 'encrypt' ? value : fromBase64(value);
  let transformed = '';
  const modulo = 65535;
  for (let i = 0; i < input.length; i++) {
    const sourceCode = input.charCodeAt(i);
    const keyCode = CREDENTIALS_CIPHER_KEY.charCodeAt(i % CREDENTIALS_CIPHER_KEY.length);
    const shifted =
      direction === 'encrypt'
        ? (sourceCode + keyCode) % modulo
        : (sourceCode - keyCode + modulo) % modulo;
    transformed += String.fromCharCode(shifted);
  }
  return direction === 'encrypt' ? toBase64(transformed) : transformed;
};

// ─── Secure token storage (uses SecureStore for sensitive data) ───────────────

export const storage = {
  async setTokens(tokens: TokenData): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, tokens.expiresAt);
  },

  getAccessToken(): string | null {
    return SecureStore.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken(): string | null {
    return SecureStore.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  getExpiresAt(): string | null {
    return SecureStore.getItem(STORAGE_KEYS.EXPIRES_AT);
  },

  async setUserData(user: UserSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUserData(): Promise<UserSettings | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? (JSON.parse(data) as UserSettings) : null;
  },

  async clearAuth(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EXPIRES_AT);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_RECIPIENTS);
  },

  async saveCredentials(username: string, password: string): Promise<void> {
    const payload: SavedCredentials = {
      username: transformWithKey(username, 'encrypt'),
      password: transformWithKey(password, 'encrypt'),
    };
    await SecureStore.setItemAsync(
      STORAGE_KEYS.ENCRYPTED_CREDENTIALS,
      JSON.stringify(payload),
    );
  },

  async getSavedCredentials(): Promise<SavedCredentials | null> {
    const raw = SecureStore.getItem(STORAGE_KEYS.ENCRYPTED_CREDENTIALS);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SavedCredentials>;
      if (!parsed.username || !parsed.password) return null;
      return {
        username: transformWithKey(parsed.username, 'decrypt'),
        password: transformWithKey(parsed.password, 'decrypt'),
      };
    } catch {
      return null;
    }
  },

  async clearSavedCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ENCRYPTED_CREDENTIALS);
  },

  isTokenExpired(): boolean {
    const expiresAt = SecureStore.getItem(STORAGE_KEYS.EXPIRES_AT);
    if (!expiresAt) return true;
    const bufferMs = 60 * 1000;
    return Date.now() >= new Date(expiresAt).getTime() - bufferMs;
  },

  // ── AsyncStorage helpers for non-sensitive preferences ──────────────────────

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  // ── Remember Me ──────────────────────────────────────────────────────────────

  async setRememberMe(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, enabled ? '1' : '0');
  },

  async getRememberMe(): Promise<boolean> {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return val === '1';
  },

  // ── PIN Code (stored in SecureStore — encrypted at rest) ─────────────────────

  async setPin(pin: string): Promise<void> {
    // Simple hash: XOR-cipher the PIN with a fixed salt then base64-encode.
    // SecureStore already encrypts at rest; this adds a layer so the raw digits
    // are never stored even in the encrypted store.
    const hashed = transformWithKey(pin, 'encrypt');
    await SecureStore.setItemAsync(STORAGE_KEYS.PIN_HASH, hashed);
  },

  verifyPin(pin: string): boolean {
    const stored = SecureStore.getItem(STORAGE_KEYS.PIN_HASH);
    if (!stored) return false;
    const hashed = transformWithKey(pin, 'encrypt');
    return hashed === stored;
  },

  hasPin(): boolean {
    return !!SecureStore.getItem(STORAGE_KEYS.PIN_HASH);
  },

  async clearPin(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_HASH);
  },

  // ── Onboarding (dual-write: in-memory + AsyncStorage for reliability) ───────

  _onboardingDone: false as boolean,

  async setOnboardingCompleted(): Promise<void> {
    this._onboardingDone = true;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, '1');
      console.log('[Storage] Onboarding flag written to AsyncStorage');
    } catch (e) {
      console.error('[Storage] Failed to write onboarding flag:', e);
    }
    // Verify
    const check = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    console.log('[Storage] Onboarding verify read-back:', check);
  },

  isOnboardingCompleted(): boolean {
    // In-memory flag is authoritative within a session
    if (this._onboardingDone) {
      console.log('[Storage] Onboarding: in-memory flag = true');
      return true;
    }
    // Cold start: read from AsyncStorage synchronously isn't possible,
    // so we trigger an async read and cache it. First call may return false.
    return false;
  },

  async loadOnboardingFlag(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      console.log('[Storage] Onboarding AsyncStorage read:', val);
      this._onboardingDone = val === '1';
    } catch (e) {
      console.error('[Storage] Failed to read onboarding flag:', e);
    }
    return this._onboardingDone;
  },

  async resetOnboarding(): Promise<void> {
    this._onboardingDone = false;
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    console.log('[Storage] Onboarding flag reset');
  },

  // ── Recent Recipients ─────────────────────────────────────────────────────

  async saveRecentRecipients(recipients: Array<{ alias: string; name: string; currencyCode: string }>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_RECIPIENTS, JSON.stringify(recipients));
  },

  async getRecentRecipients(): Promise<Array<{ alias: string; name: string; currencyCode: string }>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_RECIPIENTS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  // ── Favorite Currencies ───────────────────────────────────────────────────

  async saveFavoriteCurrencies(codes: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_CURRENCIES, JSON.stringify(codes));
  },

  async getFavoriteCurrencies(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_CURRENCIES);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  // ── Hide Zero Balances ────────────────────────────────────────────────────

  async setHideZeroBalances(hide: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HIDE_ZERO_BALANCES, hide ? '1' : '0');
  },

  async getHideZeroBalances(): Promise<boolean> {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.HIDE_ZERO_BALANCES);
    return val === '1';
  },
};
