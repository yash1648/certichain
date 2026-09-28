/**
 * Shared fetch utility with timeout and AbortController support
 */

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Creates a fetch promise with timeout and abort support
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} options.timeoutMs - Timeout in milliseconds (default: 30000)
 * @param {AbortSignal} options.signal - External abort signal
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If external signal is provided, listen for its abort
  let externalAbortHandler;
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      signal.addEventListener('abort', externalAbortHandler);
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timeout after ${timeoutMs}ms`);
      timeoutErr.status = 408;
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (externalAbortHandler && signal) {
      signal.removeEventListener('abort', externalAbortHandler);
    }
  }
}

/**
 * Creates an AbortController linked to an external signal (if provided)
 * @param {AbortSignal} [externalSignal] - Optional external abort signal
 * @returns {AbortController}
 */
export function createLinkedAbortController(externalSignal) {
  const controller = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  return controller;
}

export { DEFAULT_TIMEOUT_MS };
