/**
 * CertiChain Verifier API Service
 * Interacts with Spring Boot VerifierController (/api/verifier/**)
 */

const API_BASE = '/api/verifier';

async function handleResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'Verification request failed';
    if (typeof data === 'object' && data !== null) {
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

export const verifierService = {
  /**
   * Verify a credential JSON file
   * Public endpoint (optional Bearer token to associate with verifier history)
   * @param {File|Blob} file The .json credential envelope file
   * @param {string|null} token Optional Bearer JWT
   */
  async verifyCredentialFile(file, token = null) {
    const formData = new FormData();
    formData.append('credentialFile', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse(response);
  },

  /**
   * List historical verification checks performed by the current user
   * Requires authentication
   * @param {string} token Bearer JWT
   */
  async listVerificationHistory(token) {
    const response = await fetch(`${API_BASE}/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },
};
