/**
 * CertiChain Verifier API Service
 * Public & authenticated endpoints for Spring Boot VerifierController (/api/verifier/**)
 */

import { fetchWithTimeout } from './fetchUtils.js';

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
    if (response.status === 429) {
      errorMessage = 'Too many attempts, please try again in a few minutes.';
    } else if (response.status === 413) {
      errorMessage = 'Upload exceeds the 2MB limit';
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

export const verifierService = {
  /**
   * Verify a credential JSON file
   * Public endpoint (optional Bearer token to record verification to user history)
   * @param {File|Blob} file The .json credential envelope file
   * @param {string|null} token Optional Bearer JWT
   * @returns {Promise<Object>} VerificationResult
   */
  async verifyCredentialFile(file, token = null) {
    const formData = new FormData();
    formData.append('credentialFile', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse(response);
  },

  /**
   * Verify multiple credential JSON files or a ZIP archive in batch
   * Public endpoint (optional Bearer token to record verification to user history)
   * @param {File[]|FileList|File} files An array/FileList of .json files or a single .zip file
   * @param {string|null} token Optional Bearer JWT
   * @returns {Promise<Object>} BatchVerificationResponse
   */
  async verifyBatch(files, token = null) {
    const formData = new FormData();
    if (Array.isArray(files) || files instanceof FileList) {
      for (const file of files) {
        formData.append('files', file);
      }
    } else if (files instanceof File || files instanceof Blob) {
      formData.append('file', files);
    }

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${API_BASE}/verify/batch`, {
      method: 'POST',
      headers,
      body: formData,
      timeoutMs: 60000,
    });

    return handleResponse(response);
  },

  /**
   * Export batch verification results as CSV
   * @param {Object} batchResponse
   * @returns {Promise<Blob>}
   */
  async exportBatchCsv(batchResponse) {
    const response = await fetchWithTimeout(`${API_BASE}/verify/batch/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchResponse),
      timeoutMs: 30000,
    });

    if (!response.ok) {
      throw new Error('Failed to generate CSV export');
    }

    return response.blob();
  },

  /**
   * Look up on-chain anchor details for a credential number
   * Public endpoint
   * GET /api/verifier/anchor/{credentialNumber}
   * @param {string} credentialNumber e.g. "SSD-CVE-2026-FB6370"
   * @returns {Promise<Object>} AnchorLookupResponse
   */
  async lookupAnchor(credentialNumber) {
    const cleanNumber = encodeURIComponent(credentialNumber.trim());
    const response = await fetchWithTimeout(`${API_BASE}/anchor/${cleanNumber}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return handleResponse(response);
  },

  /**
   * List historical verification checks performed by the current user
   * Requires authentication
   * GET /api/verifier/history
   * @param {string} token Bearer JWT
   * @returns {Promise<Array>} Array of VerificationHistoryResponse
   */
  async listVerificationHistory(token) {
    const response = await fetchWithTimeout(`${API_BASE}/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },
};