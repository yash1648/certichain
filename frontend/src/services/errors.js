/**
 * Unified error classes for all API services
 */

export class ApiError extends Error {
  constructor(message, status, details = null, isTimeout = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isTimeout = isTimeout;
  }

  static fromResponse(response, data, defaultMessage = 'Request failed') {
    let message = defaultMessage;
    if (typeof data === 'object' && data !== null) {
      message = data.message || data.error || (data.errors ? Object.values(data.errors).join(', ') : 'Request failed');
    } else if (typeof data === 'string' && data.length > 0) {
      message = data;
    }
    return new ApiError(message, response.status, data);
  }

  static timeout(timeoutMs) {
    const err = new Error(`Request timeout after ${timeoutMs}ms`);
    err.status = 408;
    err.isTimeout = true;
    return err;
  }
}

export class AuthApiError extends ApiError {
  constructor(message, status, details = null) {
    super(message, status, details);
    this.name = 'AuthApiError';
  }
}