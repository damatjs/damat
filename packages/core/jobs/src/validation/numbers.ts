export function validateSafeInteger(
  value: number,
  label: string,
  minimum?: number,
): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a finite safe integer`);
  }
  if (minimum !== undefined && value < minimum) {
    throw new RangeError(`${label} must be at least ${minimum}`);
  }
}

export function validateInt32(
  value: number,
  label: string,
  minimum: number = -2_147_483_648,
): void {
  validateSafeInteger(value, label, minimum);
  if (value > 2_147_483_647) {
    throw new RangeError(`${label} must fit a PostgreSQL INTEGER`);
  }
}

export function validateMultiplier(value: number): void {
  if (!Number.isFinite(value) || value < 1) {
    throw new RangeError(
      "backoffMultiplier must be finite and greater than or equal to 1",
    );
  }
}

export function validateDelay(value: number): void {
  validateSafeInteger(value, "delayMs", 0);
  if (!Number.isFinite(new Date(Date.now() + value).getTime())) {
    throw new RangeError("delayMs exceeds the supported timestamp range");
  }
}
