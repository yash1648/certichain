/**
 * CertiChain Holder Wallet API Service
 * Interacts with Spring Boot HolderController (/api/holder/**)
 */

import { fetchWithTimeout } from './fetchUtils.js';

const API_BASE = '/api/holder';

async function handleResponse(response) {
  if (response.status === 204) {
    return null; // No content (e.g. removeFromWallet)
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'Holder request failed';
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

export const holderService = {
  /**
   * List all credentials in the user's wallet
   * GET /api/holder/wallet
   * @param {string} token Bearer JWT
   */
  async listWallet(token) {
    const response = await fetchWithTimeout(`${API_BASE}/wallet`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Add / claim an issued credential by UUID into wallet (Idempotent)
   * POST /api/holder/wallet/{credentialId}
   * @param {string} credentialId UUID
   * @param {string} token Bearer JWT
   */
  async addToWallet(credentialId, token) {
    const response = await fetchWithTimeout(`${API_BASE}/wallet/${credentialId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Remove a credential from the wallet
   * DELETE /api/holder/wallet/{credentialId}
   * @param {string} credentialId UUID
   * @param {string} token Bearer JWT
   */
  async removeFromWallet(credentialId, token) {
    const response = await fetchWithTimeout(`${API_BASE}/wallet/${credentialId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Download the exact raw signed JSON credential envelope
   * GET /api/holder/credentials/{id}/download
   * @param {string} credentialId UUID
   * @param {string} token Bearer JWT
   * @param {string} suggestedFilename fallback filename
   */
  async downloadCredential(credentialId, token, suggestedFilename = 'credential.json') {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${credentialId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await handleResponse(response); // Throws structured error
    }

    let filename = suggestedFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      // Try RFC 5987 encoded filename first (filename*=utf-8''...)
      const rfc5987Match = disposition.match(/filename\*=([^']*)'([^']*)'(.+)/);
      if (rfc5987Match) {
        try {
          filename = decodeURIComponent(rfc5987Match[3]);
        } catch {
          // Fall through to standard filename
        }
      }
      // Fallback to standard filename
      if (filename === suggestedFilename) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return filename;
  },

  /**
   * The holder's own record of a credential: every claim, plus which of
   * them are withheld from verifiers. The full claim map is returned
   * because the holder cannot choose what to hide without seeing it.
   * GET /api/holder/credentials/{id}/disclosure
   * @param {string} credentialId UUID
   * @param {string} token Bearer JWT
   * @returns {Promise<{claims: Object, hiddenClaims: string[]}>}
   */
  async getDisclosure(credentialId, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${credentialId}/disclosure`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Store which claims are withheld from verifiers.
   * PUT /api/holder/credentials/{id}/disclosure
   * @param {string} credentialId UUID
   * @param {string[]} hiddenClaims claim keys to withhold from verifiers
   * @param {string} token Bearer JWT
   * @returns {Promise<{claims: Object, hiddenClaims: string[]}>} the stored set
   */
  async setDisclosure(credentialId, hiddenClaims, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${credentialId}/disclosure`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hiddenClaims }),
    });
    return handleResponse(response);
  },
};