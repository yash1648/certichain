/**
 * CertiChain Holder Wallet API Service
 * Interacts with Spring Boot HolderController (/api/holder/**)
 */

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
    const response = await fetch(`${API_BASE}/wallet`, {
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
    const response = await fetch(`${API_BASE}/wallet/${credentialId}`, {
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
    const response = await fetch(`${API_BASE}/wallet/${credentialId}`, {
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
    const response = await fetch(`${API_BASE}/credentials/${credentialId}/download`, {
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
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
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
};
