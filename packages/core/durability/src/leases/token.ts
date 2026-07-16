import type { LeaseToken } from "./types";

export function createLeaseToken(): LeaseToken {
  return crypto.randomUUID() as LeaseToken;
}
