import { useContext } from 'react';
import { AuthContext } from '../contexts/authContextValue';
import type { AuthContextType } from '../types/auth.types.ts';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
