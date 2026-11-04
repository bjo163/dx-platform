export const NETWORK_TIMEOUT_MS = 2_000;

export async function fetchJson(url: string, {
  timeoutMs = NETWORK_TIMEOUT_MS,
  fetchImpl = fetch,
  headers = { "User-Agent": "neuralforge", Accept: "application/json" },
} = {}): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}