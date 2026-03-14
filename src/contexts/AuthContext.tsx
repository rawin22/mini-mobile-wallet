import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
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

  const logout = useCallback((): void => {
    storage.clearAuth();
    setUser(null);
    setTokens(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace('/(auth)/login' as any);
  }, [router]);

  // Register logout as the 401 handler for the API client
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const accessToken = storage.getAccessToken();
      const refreshTokenValue = storage.getRefreshToken();
      if (!accessToken || !refreshTokenValue) {
        logout();
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
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  }, [logout]);

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
          await refreshToken();
        }
      }
      setIsLoading(false);
    };
    init();
  }, [refreshToken]);

  // Periodic token refresh check every 30s
  useEffect(() => {
    if (!user || !tokens) return;
    const id = setInterval(() => {
      if (storage.isTokenExpired()) refreshToken();
    }, 30000);
    return () => clearInterval(id);
  }, [user, tokens, refreshToken]);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
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
    setTokens(tokenData);
    setUser(response.userSettings);
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
