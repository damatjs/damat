const immutable = /(?:@|^)sha256:[a-f0-9]{64}$/;

export function rollbackImageAllowed(
  image: string,
  allowMutable = false,
): boolean {
  return immutable.test(image) || allowMutable;
}
