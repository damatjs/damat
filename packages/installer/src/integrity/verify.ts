export function verifyIntegrity(expected: string, actual: string): void {
  if (expected !== actual)
    throw new Error(
      `integrity mismatch: expected ${expected}, received ${actual}`,
    );
}
