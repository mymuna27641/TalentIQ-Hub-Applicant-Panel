/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/auth';
import { tokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" when we actually have a token to validate on boot.
  const [loading, setLoading] = useState(() => Boolean(tokens.access));

  const loadMe = useCallback(async () => {
    if (!tokens.access) return;
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      // Invalid / expired session — clear it.
      authApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Validate an existing session on boot. loadMe only updates state after an
    // awaited fetch, so this is a safe async bootstrap (not a synchronous set).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokens.access) loadMe();
  }, [loadMe]);

  const login = useCallback(async (credentials) => {
    await authApi.login(credentials);
    await loadMe();
  }, [loadMe]);

  const register = useCallback(async (payload) => {
    await authApi.register(payload);
    // Auto-login after a successful registration.
    await authApi.login({ email: payload.email, password: payload.password });
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refresh: loadMe,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
