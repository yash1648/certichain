import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService, AuthApiError } from '../services/authService';

const AuthContext = createContext(null);

const STORAGE_KEY = 'certichain_auth';

function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT payload', e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(null);
  const [lastActionStatus, setLastActionStatus] = useState(null);

  const refreshTimeoutRef = useRef(null);

  // Ping backend status
  const checkBackendStatus = useCallback(async () => {
    const isOnline = await authService.checkBackendHealth();
    setBackendOnline(isOnline);
    return isOnline;
  }, []);

  // Save auth state helper
  const handleAuthSuccess = useCallback((authData) => {
    const { accessToken, expiresInSeconds, userId, email, fullName, role } = authData;
    const now = Date.now();
    const expiryTimestamp = now + expiresInSeconds * 1000;

    const userData = {
      id: userId,
      email,
      fullName,
      role,
    };

    setUser(userData);
    setAccessToken(accessToken);
    setExpiresAt(expiryTimestamp);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: userData,
          accessToken,
          expiresAt: expiryTimestamp,
        })
      );
    } catch (e) {
      console.warn('Could not cache auth to localStorage', e);
    }

    // Schedule auto refresh ~1 minute before expiration
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    const timeUntilRefresh = Math.max(10000, (expiresInSeconds - 60) * 1000);
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('CertiChain: Triggering automatic silent refresh rotation...');
      refreshSession(true);
    }, timeUntilRefresh);
  }, []);

  // Clear auth state
  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setExpiresAt(null);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }, []);

  // Refresh current session via refresh_token cookie
  const refreshSession = useCallback(async (silent = false) => {
    try {
      const data = await authService.refresh();
      handleAuthSuccess(data);
      if (!silent) {
        setLastActionStatus({
          type: 'success',
          message: 'Session refreshed successfully! Refresh token rotated in database.',
        });
      }
      return data;
    } catch (err) {
      if (!silent) {
        setLastActionStatus({
          type: 'error',
          message: err.message || 'Token refresh failed. Refresh token may be expired or revoked.',
        });
      }
      // If refresh fails due to revocation/expiry, clear local state
      if (err.status === 401 || err.status === 400 || err.status === 403) {
        clearAuthState();
      }
      throw err;
    }
  }, [handleAuthSuccess, clearAuthState]);

  // Login handler
  const login = async ({ email, password }) => {
    try {
      const data = await authService.login({ email, password });
      handleAuthSuccess(data);
      setLastActionStatus({
        type: 'success',
        message: `Welcome back, ${data.fullName}! Authenticated as ${data.role}.`,
      });
      return data;
    } catch (err) {
      setLastActionStatus({
        type: 'error',
        message: err.message || 'Login failed. Please verify credentials.',
      });
      throw err;
    }
  };

  // Register handler
  const register = async ({ email, password, fullName }) => {
    try {
      const user = await authService.register({ email, password, fullName });
      setLastActionStatus({
        type: 'success',
        message: `Account created for ${user.fullName}! You can now sign in.`,
      });
      return user;
    } catch (err) {
      setLastActionStatus({
        type: 'error',
        message: err.message || 'Registration failed.',
      });
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuthState();
      setLastActionStatus({
        type: 'info',
        message: 'Successfully signed out and revoked refresh token.',
      });
    }
  };

  // Clear toast alert
  const clearStatus = () => setLastActionStatus(null);

  // Initialize on mount: check backend and try hydrating session or refreshing
  useEffect(() => {
    let mounted = true;

    async function init() {
      await checkBackendStatus();

      // Check if we have cached session
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
            if (mounted) {
              setUser(parsed.user);
              setAccessToken(parsed.accessToken);
              setExpiresAt(parsed.expiresAt);
            }
          } else {
            // Attempt to restore session via refresh cookie
            try {
              await refreshSession(true);
            } catch {
              clearAuthState();
            }
          }
        } else {
          // Attempt silent refresh in case httpOnly cookie is present
          try {
            await refreshSession(true);
          } catch {
            // No valid active cookie, perfectly normal for guest
          }
        }
      } catch (e) {
        console.warn('Session hydration error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const interval = setInterval(checkBackendStatus, 10000); // Check backend every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [checkBackendStatus, refreshSession, clearAuthState]);

  const decodedToken = accessToken ? parseJwt(accessToken) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        decodedToken,
        expiresAt,
        loading,
        backendOnline,
        lastActionStatus,
        login,
        register,
        refreshSession,
        logout,
        checkBackendStatus,
        clearStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
