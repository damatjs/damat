export function validateNonBlank(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${label} must not be blank`);
  }
}
