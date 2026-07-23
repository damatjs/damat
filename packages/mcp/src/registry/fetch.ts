const FETCH_TIMEOUT_MS = 10_000;

export async function fetchRegistryJson(location: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(location, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    if (cause.name === "TimeoutError" || cause.name === "AbortError") {
      throw new Error(
        `Registry fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${location}`,
      );
    }
    throw new Error(
      `Could not reach registry at ${location}: ${cause.message}`,
    );
  }
  if (response.status === 404) {
    throw new Error(
      `Registry not found (404) at ${location} — check DAMAT_MODULE_REGISTRY`,
    );
  }
  if (response.status >= 500) {
    throw new Error(`Registry server error (${response.status}): ${location}`);
  }
  if (!response.ok) {
    throw new Error(`Registry fetch failed (${response.status}): ${location}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`Registry at ${location} did not return valid JSON`);
  }
}

export const REGISTRY_FETCH_TIMEOUT_MS = FETCH_TIMEOUT_MS;
