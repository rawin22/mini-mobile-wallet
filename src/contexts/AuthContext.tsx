import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { AuthContextType, UserSettings, TokenData } from '../types/auth.types';
import { authService } from '../api/auth.service';
import { API_CONFIG } from '../api/config';
import { storage } from '../utils/storage';
import { setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './authContextValue';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Use a ref so logout() never changes reference when router updates,
  // which would otherwise re-trigger the init useEffect and cause a loop.
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const logout = useCallback((): void => {
    console.log('[AUTH] logout');
    storage.clearAuth();
    storage.clearSavedCredentials();
    setUser(null);
    setTokens(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routerRef.current.replace('/(auth)/login' as any);
  }, []); // stable — no deps, uses ref internally

  // Register logout as the 401 handler for the API client
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const accessToken = storage.getAccessToken();
      const refreshTokenValue = storage.getRefreshToken();
      if (!accessToken || !refreshTokenValue) {
        return false;
      }
      const response = await authService.refreshToken(accessToken, refreshTokenValue);
      if (response.tokens) {
        const tokenData: TokenData = {
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          expiresAt: new Date(
            Date.now() + response.tokens.accessTokenExpiresInMinutes * 60 * 1000,
          ).toISOString(),
        };
        await storage.setTokens(tokenData);
        setTokens(tokenData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AUTH] Token refresh error:', error);
      return false;
    }
  }, []);

  /** Attempt silent re-login using saved credentials. */
  const silentLogin = useCallback(async (): Promise<boolean> => {
    try {
      const creds = await storage.getSavedCredentials();
      if (!creds) return false;
      console.log('[AUTH] Attempting silent re-login for:', creds.username);
      const response = await authService.login(creds.username, creds.password);
      if (!response.tokens || !response.userSettings) return false;
      const tokenData: TokenData = {
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        expiresAt: new Date(
          Date.now() + response.tokens.accessTokenExpiresInMinutes * 60 * 1000,
        ).toISOString(),
      };
      await storage.setTokens(tokenData);
      await storage.setUserData(response.userSettings);
      setTokens(tokenData);
      setUser(response.userSettings);
      console.log('[AUTH] Silent re-login success:', response.userSettings.userName);
      return true;
    } catch (error) {
      console.error('[AUTH] Silent re-login failed:', error);
      return false;
    }
  }, []);

  // Initialize from SecureStore / AsyncStorage on mount
  useEffect(() => {
    const init = async () => {
      const storedUser = await storage.getUserData();
      const storedToken = storage.getAccessToken();
      const storedRefresh = storage.getRefreshToken();
      const storedExpires = storage.getExpiresAt();

      if (storedUser && storedToken && storedRefresh && storedExpires) {
        setUser(storedUser);
        setTokens({ accessToken: storedToken, refreshToken: storedRefresh, expiresAt: storedExpires });

        if (storage.isTokenExpired()) {
          // Try token refresh first; if that fails, try saved credentials
          const refreshed = await refreshToken();
          if (!refreshed) {
            const relogged = await silentLogin();
            if (!relogged) {
              // Both failed — clear state so AuthGate redirects to login
              setUser(null);
              setTokens(null);
            }
          }
        }
      } else {
        // No stored session — try silent login with saved credentials
        await silentLogin();
      }
      setIsLoading(false);
    };
    init();
  }, [refreshToken, silentLogin]);

  // Periodic token refresh check every 30s
  useEffect(() => {
    if (!user || !tokens) return;
    const id = setInterval(async () => {
      if (storage.isTokenExpired()) {
        const refreshed = await refreshToken();
        if (!refreshed) await silentLogin();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [user, tokens, refreshToken, silentLogin]);

  const login = useCallback(async (username: string, password: string, rememberMe = false): Promise<void> => {
    console.log('[AUTH] login:', username);
    const response = await authService.login(username, password);
    if (!response.tokens || !response.userSettings) {
      throw new Error('Invalid response from server');
    }
    const tokenData: TokenData = {
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      expiresAt: new Date(
        Date.now() + response.tokens.accessTokenExpiresInMinutes * 60 * 1000,
      ).toISOString(),
    };
    await storage.setTokens(tokenData);
    await storage.setUserData(response.userSettings);

    // Persist credentials when Remember Me is on
    if (rememberMe) {
      await storage.saveCredentials(username, password);
      await storage.setRememberMe(true);
    } else {
      await storage.clearSavedCredentials();
      await storage.setRememberMe(false);
    }

    setTokens(tokenData);
    setUser(response.userSettings);
    console.log('[AUTH] login success:', response.userSettings.userName);
  }, []);

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
