export function validateEventWorkerGrace(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 2_147_483_647) {
    throw new Error("graceMs must be between 0 and 2147483647");
  }
}
