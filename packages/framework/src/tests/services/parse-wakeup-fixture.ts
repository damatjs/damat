export function parseWakeup(message: string): unknown {
  try {
    return JSON.parse(message);
  } catch {
    return undefined;
  }
}
