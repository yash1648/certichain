/**
 * CertiChain Admin API Service
 * Interacts with Spring Boot AdminController (/api/admin/**)
 */

const API_BASE = '/api/admin';

async function handleResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'Admin request failed';
    if (response.status === 429) {
      errorMessage = 'Too many attempts, please try again in a few minutes.';
    } else if (typeof data === 'object' && data !== null) {
      errorMessage = data.message || data.error || (data.errors ? Object.values(data.errors).join(', ') : 'Request failed');
    } else if (typeof data === 'string' && data.length > 0) {
      errorMessage = data;
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminService = {
  /**
   * List all registered issuers
   * GET /api/admin/issuers
   * @param {string} token Bearer JWT
   */
  async listIssuers(token) {
    const response = await fetch(`${API_BASE}/issuers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Verify and approve an issuer (verified = true)
   * POST /api/admin/issuers/{id}/verify
   * @param {string} issuerId UUID
   * @param {string} token Bearer JWT
   */
  async verifyIssuer(issuerId, token) {
    const response = await fetch(`${API_BASE}/issuers/${issuerId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * List all users on the platform
   * GET /api/admin/users
   * @param {string} token Bearer JWT
   */
  async listUsers(token) {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * List platform-wide global verification audits
   * GET /api/admin/verifications
   * @param {string} token Bearer JWT
   */
  async listGlobalVerifications(token) {
    const response = await fetch(`${API_BASE}/verifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
};
