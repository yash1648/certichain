/**
 * CertiChain Authentication & Session Service
 * Direct integration with Spring Boot AuthController endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - POST /api/auth/logout
 * - GET /v3/api-docs (health check)
 */

const API_BASE = '/api/auth';

/**
 * Custom error class capturing backend HTTP status and error messages
 */
export class AuthApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper to process JSON response or throw structured AuthApiError
 */
async function handleResponse(response) {
  if (response.status === 204) {
    return null; // No content (e.g. logout)
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    if (response.status === 429) {
      errorMessage = 'Too many attempts, please try again in a few minutes.';
    } else if (typeof data === 'object' && data !== null) {
      errorMessage = data.message || data.error || (data.errors ? Object.values(data.errors).join(', ') : 'Request failed');
    } else if (typeof data === 'string' && data.length > 0) {
      errorMessage = data;
    }
    throw new AuthApiError(errorMessage, response.status, data);
  }

  return data;
}

export const authService = {
  /**
   * Register a new user
   * @param {Object} payload { email, password, fullName, role }
   */
  async register({ email, password, fullName, role = 'HOLDER' }) {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role: role.toUpperCase(),
      }),
    });
    return handleResponse(response);
  },

  /**
   * Login user with credentials
   * @param {Object} payload { email, password }
   */
  async login({ email, password }) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Includes httpOnly refresh_token cookie
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Rotate refresh token and obtain a fresh access token
   */
  async refresh() {
    const response = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Sends current refresh_token cookie
    });
    return handleResponse(response);
  },

  /**
   * Invalidate refresh token and clear cookie
   */
  async logout() {
    try {
      const response = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return handleResponse(response);
    } catch (err) {
      // Even if server call fails, we still allow client logout
      console.warn('Backend logout encountered error:', err);
      return null;
    }
  },

  /**
   * Check connection to Spring Boot backend via OpenAPI endpoint
   * GET /v3/api-docs
   */
  async checkBackendHealth() {
    try {
      const res = await fetch('/v3/api-docs', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache',
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
