/**
 * Retry utility for flaky mobile connections.
 * On mobile, the first request sometimes fails (slow network, cold start).
 * Retrying after a short delay often succeeds.
 *
 * @param {() => Promise<T>} fn - Function that returns a promise
 * @param {number} maxAttempts - Max attempts (default 3)
 * @param {number} delayMs - Delay between retries in ms (default 2000)
 * @returns {Promise<T>}
 */
export async function withRetry(fn, maxAttempts = 3, delayMs = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
