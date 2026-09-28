/**
 * CertiChain Issuer API Service
 * Interacts with Spring Boot IssuerController (/api/issuer/**)
 */

import { fetchWithTimeout } from './fetchUtils.js';

const API_BASE = '/api/issuer';

async function handleIssuerResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'Request failed';
    if (response.status === 429) {
      errorMessage = 'Too many attempts, please try again in a few minutes.';
    } else if (typeof data === 'object' && data !== null) {
      errorMessage = data.message || data.error || (data.errors ? Object.values(data.errors).join(', ') : 'Issuer request failed');
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

export const issuerService = {
  /**
   * Get the authenticated user's issuer profile (404 if not registered)
   * @param {string} token Bearer JWT
   */
  async getIssuerProfile(token) {
    const response = await fetchWithTimeout(`${API_BASE}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleIssuerResponse(response);
  },

  /**
   * Register as an issuer
   * @param {Object} payload { name, domain }
   * @param {string} token Bearer JWT
   */
  async registerIssuer({ name, domain }, token) {
    const response = await fetchWithTimeout(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
      }),
    });
    return handleIssuerResponse(response);
  },

  /**
   * Generate an Ed25519 signing key (requires verified issuer)
   * @param {string} token Bearer JWT
   */
  async createSigningKey(token) {
    const response = await fetchWithTimeout(`${API_BASE}/keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleIssuerResponse(response);
  },

  /**
   * Resolve a recipient by email, so issuance targets a person instead
   * of a pasted account id. 404 when no holder has that email.
   * @param {string} email
   * @param {string} token Bearer JWT
   */
  async findHolderByEmail(email, token) {
    const response = await fetchWithTimeout(
      `${API_BASE}/holders?email=${encodeURIComponent(email.trim())}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return handleIssuerResponse(response);
  },

  /**
   * Issue a verifiable credential
   * @param {Object} payload { subjectId, type, title, claims }
   * @param {string} token Bearer JWT
   */
  async issueCredential({ subjectId, type, title, claims }, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        subjectId,
        type: type.trim(),
        title: title.trim(),
        claims: typeof claims === 'object' ? claims : {},
      }),
    });
    return handleIssuerResponse(response);
  },

  /**
   * List all credentials issued by the authenticated issuer
   * @param {string} token Bearer JWT
   */
  async listCredentials(token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleIssuerResponse(response);
  },

  /**
   * Get detail for a specific credential
   * @param {string} id Credential UUID
   * @param {string} token Bearer JWT
   */
  async getCredential(id, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleIssuerResponse(response);
  },

  /**
   * Revoke an issued credential
   * @param {string} id Credential UUID
   * @param {string} reason Revocation reason
   * @param {string} token Bearer JWT
   */
  async revokeCredential(id, reason, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${id}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: reason ? reason.trim() : null,
      }),
    });
    return handleIssuerResponse(response);
  },

  /**
   * List verification and status records
   * @param {string} token Bearer JWT
   */
  async listVerifications(token) {
    const response = await fetchWithTimeout(`${API_BASE}/verifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleIssuerResponse(response);
  },
};