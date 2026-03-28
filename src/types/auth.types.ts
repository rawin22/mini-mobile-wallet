export interface LoginRequest {
  loginId: string;
  password: string;
  callerId: string;
  includeUserSettingsInResponse: boolean;
  includeAccessRightsWithUserSettings: boolean;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface UserSettings {
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  branchName: string;
  baseCurrencyCode: string;
  preferredLanguage: string;
  cultureCode: string;
  isEnabled: boolean;
  isLockedOut: boolean;
  passwordRegEx?: string;
  passwordRegExMessage?: string;
  customerId?: string; // not returned by API — use organizationId instead
  customerWKYCLevel?: number;
  customerTrustScore?: number;
  phone?: string;
  lastLoginTime?: string;
  lastPasswordChangedTime?: string;
  wkycId?: string;
  preferredAlias?: string;          // e.g. "RALF" — used as fallback PayID before VerifiedLink exists
  defaultStealthId?: string;        // UUID returned by API
  isCurrencyCalculatorEnabled?: boolean;
  isBankInstantPaymentFeatureEnabled?: boolean;
  bankHomePageMessage?: string;
  baseCountryCode?: string;
}

export interface AuthResponse {
  tokens: {
    accessToken: string;
    accessTokenExpiresInMinutes: number;
    refreshToken: string;
    refreshTokenExpiresInHours: number;
  };
  userSettings: UserSettings;
  problems: null;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextType {
  user: UserSettings | null;
  tokens: TokenData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  /** Re-authenticates with stored credentials and refreshes user state. Returns true on success. */
  refreshUser: () => Promise<boolean>;
}
