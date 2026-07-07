/**
 * fetch with a hard timeout so loading UI can't spin forever when a request
 * hangs. Throws on timeout (AbortError) like any network failure — callers
 * treat both the same and offer a retry.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
