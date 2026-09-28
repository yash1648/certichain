import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const STORAGE_KEY = 'certichain_auth';

function decodeJwtPayload(token) {
  // Decodes JWT payload WITHOUT signature verification.
  // Use only for UI display (role, exp, etc.). Never for auth decisions.
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
  const [lastActionStatus, setLastActionStatus] = useState(null);

  const refreshTimeoutRef = useRef(null);
  const refreshSessionRef = useRef(null);

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
      refreshSessionRef.current?.(true);
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
    } catch {
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

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

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

  // Register handler. Public registration is holder-only: the role is not
  // selectable and is not sent. ISSUER accounts are approved by an admin.
  const register = async ({ email, password, fullName }) => {
    try {
      const user = await authService.register({ email, password, fullName });
      setLastActionStatus({
        type: 'success',
        message: `Account created for ${user.fullName} (${user.role})! You can now sign in.`,
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

  // Instant Demo Authentication for Admin, Institution & Holder
  // Real authentication with the seeded demo accounts.
  const loginDemoUser = async ({ role = 'HOLDER', email, fullName }) => {
    const normalizedRole = String(role || 'HOLDER').toUpperCase();
    const defaultData = {
      ADMIN: {
        email: email || 'admin@certichain.org',
        password: 'DemoAdmin123!',
        fullName: fullName || 'System Administrator',
        role: 'ADMIN',
      },
      ISSUER: {
        email: email || 'registrar@mit.edu',
        password: 'DemoIssuer123!',
        fullName: fullName || 'Massachusetts Institute of Technology',
        role: 'ISSUER',
      },
      HOLDER: {
        email: email || 'alex.mercer@alumni.org',
        password: 'DemoHolder123!',
        fullName: fullName || 'Alex Mercer',
        role: 'HOLDER',
      }
    };

    const target = defaultData[normalizedRole] || defaultData.HOLDER;

    const data = await authService.login({
      email: target.email,
      password: target.password,
    });
    handleAuthSuccess(data);
    setLastActionStatus({
      type: 'success',
      message: `Signed in as Demo ${target.role} (${target.fullName})!`,
    });
    return data;
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

  // Initialize on mount: hydrate from cache, or rotate a session whose cached
  // access token has expired. A visitor with no cache has no refresh cookie to
  // rotate -- attempting it just adds a failed round trip, and a console error,
  // to every anonymous first paint.
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (!cached) return;

        const parsed = JSON.parse(cached);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          if (mounted) {
            setUser(parsed.user);
            setAccessToken(parsed.accessToken);
            setExpiresAt(parsed.expiresAt);
          }
          return;
        }

        // Access token expired but a session may still be alive: rotate it.
        try {
          await refreshSession(true);
        } catch (err) {
          // Only drop local state on an auth failure, not a network blip.
          if (err.status === 401 || err.status === 403) clearAuthState();
        }
      } catch (e) {
        console.warn('Session hydration error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [refreshSession, clearAuthState]);

  const decodedToken = accessToken ? decodeJwtPayload(accessToken) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        decodedToken,
        expiresAt,
        loading,
        lastActionStatus,
        login,
        register,
        loginDemoUser,
        refreshSession,
        logout,
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
