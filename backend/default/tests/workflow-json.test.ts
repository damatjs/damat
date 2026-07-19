import { expect, test } from "bun:test";
import { serializeVerification } from "@/workflows/user/workflows/serialize";

test("workflow verification output is safe for durable JSON storage", () => {
  const created = new Date("2026-07-19T10:00:00.000Z");
  const updated = new Date("2026-07-19T11:00:00.000Z");
  const result = serializeVerification({
    id: "verification-1",
    identifier: "audit@example.com",
    value: "",
    created_at: created,
    updated_at: updated,
    deleted_at: null,
    expiresAt: created,
  });

  expect(result.created_at).toBe(created.toISOString());
  expect(result.updated_at).toBe(updated.toISOString());
  expect(result.deleted_at).toBeNull();
  expect(result.expiresAt).toBe(created.toISOString());
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
});
