/**
 * Verification Model
 *
 * Email verification tokens (Better Auth compatible)
 */

import { model, columns } from "@damatjs/orm-model";

export const Verification = model("verifications", {
  id: columns.id({ prefix: "ver" }).primaryKey(),

  identifier: columns.text(), // email or phone
  value: columns.text(), // token or code

  expiresAt: columns.timestamp({ withTimezone: true }),

  createdAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
  updatedAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
}).indexes([
  columns.indexes("idx_verifications_identifier").columns(["identifier"]),
]);
