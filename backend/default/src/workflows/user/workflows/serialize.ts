import type { Verifications } from "@/modules/user/types";

export type SerializedVerification = Omit<
  Verifications,
  "created_at" | "updated_at" | "deleted_at" | "expiresAt"
> & {
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  expiresAt: string;
};

export function serializeVerification(
  value: Verifications,
): SerializedVerification {
  return {
    ...value,
    created_at: value.created_at.toISOString(),
    updated_at: value.updated_at?.toISOString() ?? null,
    deleted_at: value.deleted_at?.toISOString() ?? null,
    expiresAt: value.expiresAt.toISOString(),
  };
}
